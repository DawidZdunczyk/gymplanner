begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('trainer', 'trainee')),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  identification_label text not null check (char_length(btrim(identification_label)) between 1 and 120),
  unique (id, role)
);
create unique index profiles_identification_label_key on public.profiles (lower(btrim(identification_label)));

create table public.trainer_assignments (
  trainee_id uuid primary key,
  trainer_id uuid not null,
  trainer_role text not null default 'trainer' check (trainer_role = 'trainer'),
  trainee_role text not null default 'trainee' check (trainee_role = 'trainee'),
  foreign key (trainer_id, trainer_role) references public.profiles(id, role) on delete cascade,
  foreign key (trainee_id, trainee_role) references public.profiles(id, role) on delete cascade,
  check (trainer_id <> trainee_id)
);
create index trainer_assignments_trainer_id_idx on public.trainer_assignments(trainer_id);

alter table public.profiles enable row level security;
alter table public.trainer_assignments enable row level security;
revoke all on public.profiles, public.trainer_assignments from public, anon, authenticated;
grant select on public.profiles, public.trainer_assignments to authenticated;
grant all on public.profiles, public.trainer_assignments to service_role;

create policy assignment_participants on public.trainer_assignments for select to authenticated
using (trainer_id = (select auth.uid()) or trainee_id = (select auth.uid()));

create policy own_or_assigned_profile on public.profiles for select to authenticated
using (
  id = (select auth.uid()) or exists (
    select 1 from public.trainer_assignments a
    where (a.trainer_id = (select auth.uid()) and a.trainee_id = profiles.id)
       or (a.trainee_id = (select auth.uid()) and a.trainer_id = profiles.id)
  )
);

commit;
