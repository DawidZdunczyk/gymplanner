-- psql variables: trainer_id, trainee_id, trainer_name, trainee_name,
-- trainer_label, trainee_label. Both Auth accounts must already exist.
-- Local operator connection only; this file is not a migration.
\set ON_ERROR_STOP on
begin;
insert into public.profiles (id, role, display_name, identification_label) values
  (:'trainer_id'::uuid, 'trainer', :'trainer_name', :'trainer_label'),
  (:'trainee_id'::uuid, 'trainee', :'trainee_name', :'trainee_label');
insert into public.trainer_assignments (trainer_id, trainee_id)
values (:'trainer_id'::uuid, :'trainee_id'::uuid);
commit;
