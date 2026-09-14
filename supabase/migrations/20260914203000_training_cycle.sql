begin;

-- All writes enter one transaction through training_mutate. The private helpers
-- are deliberately outside PostgREST's exposed schema and cannot be called by users.
create schema if not exists training_private;
revoke all on schema training_private from public, anon, authenticated;

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  trainee_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  valid_from date not null,
  valid_until date not null check (valid_until >= valid_from),
  created_at timestamptz not null default now(),
  unique(id, trainer_id, trainee_id)
);

create table public.training_workouts (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  trainer_id uuid not null,
  trainee_id uuid not null,
  week_start date not null check (extract(isodow from week_start) = 1),
  scheduled_for date not null check (scheduled_for >= week_start and scheduled_for < week_start + 7),
  unit_label text not null check (char_length(btrim(unit_label)) between 1 and 160),
  prescription jsonb not null check (jsonb_typeof(prescription) = 'object'),
  snapshot jsonb,
  results jsonb,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed')),
  version integer not null default 1 check (version > 0),
  started_at timestamptz,
  completed_at timestamptz,
  corrected_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(plan_id, trainer_id, trainee_id) references public.training_plans(id, trainer_id, trainee_id) on delete cascade,
  check ((status = 'planned' and snapshot is null and started_at is null and results is null and completed_at is null and corrected_at is null)
    or (status = 'in_progress' and snapshot is not null and started_at is not null and completed_at is null and corrected_at is null)
    or (status = 'completed' and snapshot is not null and results is not null and started_at is not null and completed_at is not null))
);
create index training_plans_trainee_idx on public.training_plans(trainee_id, valid_from);
create index training_workouts_plan_week_idx on public.training_workouts(plan_id, week_start, scheduled_for);
create index training_workouts_trainee_idx on public.training_workouts(trainee_id, scheduled_for);

create table public.training_comments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.training_workouts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 5000),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  updated_at timestamptz not null default now(),
  unique(workout_id, author_id)
);

alter table public.training_plans enable row level security;
alter table public.training_workouts enable row level security;
alter table public.training_comments enable row level security;
revoke all on public.training_plans, public.training_workouts, public.training_comments from public, anon, authenticated;
grant select on public.training_plans, public.training_workouts, public.training_comments to authenticated;
grant all on public.training_plans, public.training_workouts, public.training_comments to service_role;

create policy training_plan_participants on public.training_plans for select to authenticated using (
  exists (select 1 from public.trainer_assignments a
    where a.trainee_id = training_plans.trainee_id and a.trainer_id = training_plans.trainer_id
      and (a.trainer_id = (select auth.uid()) or a.trainee_id = (select auth.uid())))
);
create policy training_workout_participants on public.training_workouts for select to authenticated using (
  exists (select 1 from public.trainer_assignments a
    where a.trainee_id = training_workouts.trainee_id and a.trainer_id = training_workouts.trainer_id
      and (a.trainer_id = (select auth.uid()) or a.trainee_id = (select auth.uid())))
);
create policy training_comment_visibility on public.training_comments for select to authenticated using (
  (author_id = (select auth.uid()) or visibility = 'public')
  and exists (select 1 from public.training_workouts w where w.id = workout_id)
);

create function training_private.require_valid(ok boolean, message text)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if ok is distinct from true then raise exception using errcode = 'PT400', message = message; end if;
end;
$$;

create function training_private.shape(value jsonb, keys text[])
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(value) = 'object' and value ?& keys
    and not exists (select 1 from jsonb_object_keys(case when jsonb_typeof(value) = 'object' then value else '{}'::jsonb end) k where not (k = any(keys)));
$$;

create function training_private.number_valid(value jsonb, low numeric, high numeric, whole boolean, nullable boolean default false)
returns boolean language plpgsql immutable set search_path = '' as $$
declare n numeric;
begin
  if value = 'null'::jsonb then return nullable; end if;
  if jsonb_typeof(value) is distinct from 'number' then return false; end if;
  n := value::text::numeric;
  return n between low and high and (not whole or n = trunc(n));
end;
$$;

create function training_private.text_valid(value jsonb, low integer, high integer)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(value) = 'string' and char_length(btrim(value #>> '{}')) between low and high;
$$;

create function training_private.target_valid(value jsonb, maximum integer, nullable boolean)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if value = 'null'::jsonb then return nullable; end if;
  if training_private.shape(value, array['kind', 'min', 'max']) is distinct from true then return false; end if;
  if value->>'kind' = 'unlimited' then return value->'min' = 'null'::jsonb and value->'max' = 'null'::jsonb; end if;
  if (value->>'kind' in ('fixed', 'range')) is distinct from true then return false; end if;
  if training_private.number_valid(value->'min', 1, maximum, true) is distinct from true
    or training_private.number_valid(value->'max', 1, maximum, true) is distinct from true then return false; end if;
  return (value->>'min')::integer <= (value->>'max')::integer
    and (value->>'kind' = 'range' or value->'min' = value->'max');
end;
$$;

create function training_private.exercise_valid(e jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select training_private.shape(e, array['id','name','sets','reps','weight_kg','duration_seconds','rir','rpe','notes','group_id'])
    and training_private.text_valid(e->'id', 1, 80)
    and training_private.text_valid(e->'name', 1, 160)
    and training_private.target_valid(e->'sets', 100, true)
    and training_private.target_valid(e->'reps', 10000, true)
    and (e->'reps' <> 'null'::jsonb or e->'duration_seconds' <> 'null'::jsonb)
    and training_private.number_valid(e->'weight_kg', 0, 2000, false, true)
    and training_private.number_valid(e->'duration_seconds', 1, 86400, true, true)
    and training_private.number_valid(e->'rir', 0, 10, false, true)
    and training_private.number_valid(e->'rpe', 1, 10, false, true)
    and training_private.text_valid(e->'notes', 0, 2000)
    and (e->'group_id' = 'null'::jsonb or training_private.text_valid(e->'group_id', 1, 80));
$$;

create function training_private.validate_prescription(p jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare e jsonb; g jsonb; ids text[] := '{}'; groups text[] := '{}';
begin
  perform training_private.require_valid(training_private.shape(p, array['warmup','exercises','supersets']), 'Nieprawidłowa rozpiska treningu.');
  perform training_private.require_valid(training_private.text_valid(p->'warmup', 0, 5000), 'Rozgrzewka może mieć do 5000 znaków.');
  perform training_private.require_valid(jsonb_typeof(p->'exercises') = 'array' and jsonb_typeof(p->'supersets') = 'array', 'Ćwiczenia i superserie muszą być listą.');
  perform training_private.require_valid(jsonb_array_length(p->'exercises') between 1 and 100 and jsonb_array_length(p->'supersets') <= 40, 'Wymagane jest 1–100 ćwiczeń i maksymalnie 40 superserii.');
  for g in select value from jsonb_array_elements(p->'supersets') loop
    perform training_private.require_valid(training_private.shape(g, array['id','name','rounds','rest_between_exercises','rest_between_rounds'])
      and training_private.text_valid(g->'id', 1, 80) and training_private.text_valid(g->'name', 1, 160)
      and training_private.number_valid(g->'rounds', 1, 100, true)
      and training_private.text_valid(g->'rest_between_exercises', 0, 1000)
      and training_private.text_valid(g->'rest_between_rounds', 0, 1000)
      and not (g->>'id' = any(groups)), 'Nieprawidłowe parametry superserii.');
    groups := array_append(groups, g->>'id');
  end loop;
  for e in select value from jsonb_array_elements(p->'exercises') loop
    perform training_private.require_valid(training_private.exercise_valid(e) and not (e->>'id' = any(ids))
      and (e->'group_id' = 'null'::jsonb or e->>'group_id' = any(groups)), 'Nieprawidłowe parametry ćwiczenia. Uzupełnij powtórzenia lub czas i sprawdź zakresy.');
    ids := array_append(ids, e->>'id');
  end loop;
  for g in select value from jsonb_array_elements(p->'supersets') loop
    perform training_private.require_valid((select count(*) >= 2 from jsonb_array_elements(p->'exercises') item where item->>'group_id' = g->>'id'), 'Superseria wymaga co najmniej dwóch ćwiczeń.');
  end loop;
end;
$$;

create function training_private.validate_results(p jsonb, r jsonb, complete boolean, correction boolean)
returns void language plpgsql immutable set search_path = '' as $$
declare e jsonb; original jsonb; effective jsonb; s jsonb; ids text[] := '{}'; performed integer;
begin
  perform training_private.require_valid(training_private.shape(r, array['warmup_status','exercises','rating']), 'Nieprawidłowy zapis wyników.');
  perform training_private.require_valid((r->'warmup_status' = 'null'::jsonb or r->>'warmup_status' in ('done','skipped'))
    and training_private.number_valid(r->'rating', 1, 10, true, not complete), 'Podaj ocenę treningu 1–10.');
  perform training_private.require_valid(jsonb_typeof(r->'exercises') = 'array', 'Wyniki ćwiczeń muszą być listą.');
  perform training_private.require_valid(jsonb_array_length(r->'exercises') <= 100, 'Zbyt wiele wyników ćwiczeń.');
  if complete then
    perform training_private.require_valid(r->>'warmup_status' in ('done','skipped'), 'Oznacz rozgrzewkę jako wykonaną lub pominiętą.');
    perform training_private.require_valid(jsonb_array_length(r->'exercises') = jsonb_array_length(p->'exercises'), 'Rozlicz wszystkie ćwiczenia.');
  end if;
  for e in select value from jsonb_array_elements(r->'exercises') loop
    perform training_private.require_valid(training_private.shape(e, array['exercise_id','skipped','rating','sets','replacement'])
      and training_private.text_valid(e->'exercise_id', 1, 80) and jsonb_typeof(e->'skipped') = 'boolean'
      and not (e->>'exercise_id' = any(ids)), 'Nieprawidłowy wynik ćwiczenia.');
    ids := array_append(ids, e->>'exercise_id');
    select value into original from jsonb_array_elements(p->'exercises') where value->>'id' = e->>'exercise_id';
    perform training_private.require_valid(original is not null, 'Ćwiczenie nie należy do tego treningu.');
    effective := original;
    if e->'replacement' <> 'null'::jsonb then
      perform training_private.require_valid(correction and training_private.exercise_valid(e->'replacement'), 'Zamiennik jest dostępny w korekcie zakończonego treningu.');
      effective := e->'replacement';
      perform training_private.require_valid(effective->'sets' <> 'null'::jsonb and effective->'reps' <> 'null'::jsonb
        and (effective->'rir' <> 'null'::jsonb or effective->'rpe' <> 'null'::jsonb)
        and effective->'group_id' = 'null'::jsonb and e->'skipped' = 'false'::jsonb, 'Zamiennik wymaga serii, powtórzeń, oceny i RIR lub RPE.');
    end if;
    perform training_private.require_valid(training_private.number_valid(e->'rating', 1, 10, true, not complete or (e->>'skipped')::boolean), 'Oceń trudność każdego wykonanego ćwiczenia w skali 1–10.');
    perform training_private.require_valid(jsonb_typeof(e->'sets') = 'array', 'Serie muszą być listą.');
    perform training_private.require_valid(jsonb_array_length(e->'sets') <= 100, 'Maksymalna liczba zapisanych serii to 100.');
    performed := 0;
    for s in select value from jsonb_array_elements(e->'sets') loop
      perform training_private.require_valid(training_private.shape(s, array['reps','weight_kg','duration_seconds','skipped'])
        and jsonb_typeof(s->'skipped') = 'boolean'
        and training_private.number_valid(s->'reps', 0, 10000, true, true)
        and training_private.number_valid(s->'weight_kg', 0, 2000, false, true)
        and training_private.number_valid(s->'duration_seconds', 0, 86400, true, true), 'Nieprawidłowy wynik serii.');
      if e->'skipped' = 'false'::jsonb and s->'skipped' = 'false'::jsonb then
        performed := performed + 1;
        if complete then
          perform training_private.require_valid(
            (effective->'duration_seconds' = 'null'::jsonb or s->'duration_seconds' <> 'null'::jsonb)
            and (effective->'reps' = 'null'::jsonb or s->'reps' <> 'null'::jsonb)
            and (effective->'weight_kg' = 'null'::jsonb or s->'weight_kg' <> 'null'::jsonb), 'Uzupełnij wyniki każdej wykonanej serii zgodnie z rozpiską.');
        end if;
      end if;
    end loop;
    if complete and e->'skipped' = 'false'::jsonb then
      perform training_private.require_valid(performed > 0, 'Zapisz co najmniej jedną wykonaną serię lub pomiń całe ćwiczenie.');
    end if;
  end loop;
end;
$$;

create function public.training_mutate(p_action text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  p public.training_plans;
  w public.training_workouts;
  c public.training_comments;
  target_id uuid;
  trainee uuid;
  start_date date;
  end_date date;
  scheduled date;
  week date;
  expected_version integer;
  today date := (now() at time zone 'Europe/Warsaw')::date;
begin
  if actor is null then raise exception using errcode = 'PT401', message = 'Zaloguj się ponownie.'; end if;
  perform training_private.require_valid(p_action in ('create_plan','create_workout','update_workout','delete_workout','start_workout','save_results','complete_workout','correct_workout','save_comment'), 'Nieznana operacja.');
  perform training_private.require_valid(jsonb_typeof(p_payload) = 'object' and octet_length(p_payload::text) <= 262144, 'Nieprawidłowe lub zbyt duże żądanie.');

  if p_action = 'create_plan' then
    perform training_private.require_valid(training_private.shape(p_payload, array['trainee_id','title','valid_from','valid_until'])
      and training_private.text_valid(p_payload->'title', 1, 160), 'Podaj nazwę planu i okres ważności.');
    trainee := (p_payload->>'trainee_id')::uuid;
    -- Hold assignment against revocation for the duration of each write.
    perform 1 from public.trainer_assignments where trainee_id = trainee and trainer_id = actor for share;
    if not found then raise exception using errcode = 'PT404', message = 'Nie znaleziono podopiecznego.'; end if;
    perform training_private.require_valid(p_payload->>'valid_from' ~ '^\d{4}-\d{2}-\d{2}$' and p_payload->>'valid_until' ~ '^\d{4}-\d{2}-\d{2}$', 'Podaj prawidłowe daty.');
    start_date := (p_payload->>'valid_from')::date;
    end_date := (p_payload->>'valid_until')::date;
    perform training_private.require_valid(end_date >= start_date and end_date - start_date <= 3660, 'Koniec ważności musi przypadać po początku (maksymalnie 10 lat).');
    insert into public.training_plans(trainer_id,trainee_id,title,valid_from,valid_until)
      values(actor,trainee,btrim(p_payload->>'title'),start_date,end_date) returning * into p;
    return to_jsonb(p);
  end if;

  if p_action = 'create_workout' then
    perform training_private.require_valid(training_private.shape(p_payload, array['plan_id','week_start','scheduled_for','unit_label','prescription']), 'Nieprawidłowe dane treningu.');
    target_id := (p_payload->>'plan_id')::uuid;
    select * into p from public.training_plans where id = target_id and trainer_id = actor;
    if not found then raise exception using errcode = 'PT404', message = 'Nie znaleziono planu.'; end if;
    perform 1 from public.trainer_assignments where trainee_id = p.trainee_id and trainer_id = actor for share;
    if not found then raise exception using errcode = 'PT404', message = 'Nie znaleziono planu.'; end if;
    perform training_private.require_valid(p_payload->>'week_start' ~ '^\d{4}-\d{2}-\d{2}$', 'Podaj prawidłowy tydzień.');
    week := (p_payload->>'week_start')::date;
  else
    target_id := (p_payload->>'workout_id')::uuid;
    select * into w from public.training_workouts where id = target_id and actor in (trainer_id,trainee_id) for update;
    if not found then raise exception using errcode = 'PT404', message = 'Nie znaleziono treningu.'; end if;
    perform 1 from public.trainer_assignments where trainee_id = w.trainee_id and trainer_id = w.trainer_id for share;
    if not found then raise exception using errcode = 'PT404', message = 'Nie znaleziono treningu.'; end if;
    if (p_action in ('update_workout','delete_workout') and actor <> w.trainer_id)
      or (p_action not in ('update_workout','delete_workout') and actor <> w.trainee_id) then
      raise exception using errcode = 'PT404', message = 'Nie znaleziono treningu.';
    end if;
    if p_action = 'save_comment' then
      perform training_private.require_valid(training_private.shape(p_payload, array['workout_id','body','visibility'])
        and training_private.text_valid(p_payload->'body', 0, 5000) and char_length(p_payload->>'body') <= 5000
        and p_payload->>'visibility' in ('public','private'), 'Komentarz może mieć do 5000 znaków i widoczność publiczną lub prywatną.');
      insert into public.training_comments(workout_id,author_id,body,visibility)
        values(w.id,actor,p_payload->>'body',p_payload->>'visibility')
        on conflict(workout_id,author_id) do update set body = excluded.body, visibility = excluded.visibility, updated_at = now()
        returning * into c;
      return to_jsonb(c);
    end if;
    perform training_private.require_valid(training_private.number_valid(p_payload->'version', 1, 2147483646, true), 'Brak prawidłowej wersji treningu.');
    expected_version := (p_payload->>'version')::integer;
    if w.version <> expected_version then raise exception using errcode = 'PT409', message = 'Trening został zmieniony w innym oknie. Odśwież stronę przed zapisem.'; end if;
    select * into p from public.training_plans where id = w.plan_id;
    week := w.week_start;
  end if;

  if p_action in ('create_workout','update_workout') then
    if p_action = 'update_workout' then
      perform training_private.require_valid(training_private.shape(p_payload, array['workout_id','version','scheduled_for','unit_label','prescription']), 'Nieprawidłowe dane treningu.');
      if w.status <> 'planned' then raise exception using errcode = 'PT409', message = 'Możesz edytować tylko nierozpoczęty trening.'; end if;
    end if;
    perform training_private.require_valid(training_private.text_valid(p_payload->'unit_label', 1, 160)
      and p_payload->>'scheduled_for' ~ '^\d{4}-\d{2}-\d{2}$', 'Podaj nazwę jednostki i prawidłową datę.');
    scheduled := (p_payload->>'scheduled_for')::date;
    perform training_private.require_valid(extract(isodow from week) = 1 and scheduled >= week and scheduled < week + 7
      and scheduled between p.valid_from and p.valid_until, 'Data musi należeć do wybranego tygodnia (od poniedziałku) i okresu ważności planu.');
    perform training_private.validate_prescription(p_payload->'prescription');
    if p_action = 'create_workout' then
      insert into public.training_workouts(plan_id,trainer_id,trainee_id,week_start,scheduled_for,unit_label,prescription)
        values(p.id,p.trainer_id,p.trainee_id,week,scheduled,btrim(p_payload->>'unit_label'),p_payload->'prescription') returning * into w;
    else
      update public.training_workouts set scheduled_for = scheduled, unit_label = btrim(p_payload->>'unit_label'), prescription = p_payload->'prescription', version = version + 1
        where id = w.id returning * into w;
    end if;
  elsif p_action = 'delete_workout' then
    perform training_private.require_valid(training_private.shape(p_payload, array['workout_id','version']), 'Nieprawidłowe dane treningu.');
    if w.status <> 'planned' then raise exception using errcode = 'PT409', message = 'Możesz usunąć tylko nierozpoczęty trening.'; end if;
    delete from public.training_workouts where id = w.id;
    return jsonb_build_object('id',w.id);
  elsif p_action = 'start_workout' then
    perform training_private.require_valid(training_private.shape(p_payload, array['workout_id','version']), 'Nieprawidłowe dane treningu.');
    if w.status <> 'planned' then raise exception using errcode = 'PT409', message = 'Ten trening został już rozpoczęty.'; end if;
    if today < p.valid_from or today > p.valid_until then raise exception using errcode = 'PT409', message = 'Plan nie jest teraz ważny. Nie można rozpocząć nowego treningu.'; end if;
    update public.training_workouts set snapshot = prescription, status = 'in_progress', started_at = now(), version = version + 1 where id = w.id returning * into w;
  else
    perform training_private.require_valid(training_private.shape(p_payload, array['workout_id','version','results']), 'Nieprawidłowe dane wyników.');
    if (p_action = 'correct_workout' and w.status <> 'completed')
      or (p_action <> 'correct_workout' and w.status <> 'in_progress') then
      raise exception using errcode = 'PT409', message = 'Status treningu nie pozwala na ten zapis. Odśwież stronę.';
    end if;
    perform training_private.validate_results(w.snapshot,p_payload->'results',p_action <> 'save_results',p_action = 'correct_workout');
    update public.training_workouts set results = p_payload->'results', version = version + 1,
      status = case when p_action = 'complete_workout' then 'completed' else status end,
      completed_at = case when p_action = 'complete_workout' then now() else completed_at end,
      corrected_at = case when p_action = 'correct_workout' then now() else corrected_at end
      where id = w.id returning * into w;
  end if;
  return to_jsonb(w);
exception when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
  raise exception using errcode = 'PT400', message = 'Nieprawidłowy identyfikator, data lub wartość liczbowa.';
end;
$$;

revoke all on all functions in schema training_private from public, anon, authenticated;
revoke all on function public.training_mutate(text,jsonb) from public, anon, authenticated;
grant execute on function public.training_mutate(text,jsonb) to authenticated;

commit;
