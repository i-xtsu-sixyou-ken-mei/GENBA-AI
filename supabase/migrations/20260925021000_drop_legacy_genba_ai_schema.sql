-- Remove the legacy GENBA namespace after KOKODE has provisioned its replacement.
-- Destructive by design: existing genba_ai data is not migrated.
-- Idempotent and applied through the Management API, never migration history.

begin;

drop schema if exists genba_ai cascade;

do $$
declare
  current_schemas text;
  next_schemas text;
begin
  select regexp_replace(setting, '^pgrst\.db_schemas=', '')
    into current_schemas
  from pg_db_role_setting settings
  join pg_roles roles on roles.oid = settings.setrole
  cross join lateral unnest(settings.setconfig) setting
  where roles.rolname = 'authenticator'
    and setting like 'pgrst.db_schemas=%'
  limit 1;

  if current_schemas is null or btrim(current_schemas) = '' then
    current_schemas := 'public,graphql_public';
  end if;

  select string_agg(schema_name, ',' order by first_seen)
    into next_schemas
  from (
    select btrim(schema_name) as schema_name, min(ordinal_position) as first_seen
    from regexp_split_to_table(
      current_schemas || ',kokode_ai',
      ','
    ) with ordinality as listed(schema_name, ordinal_position)
    where btrim(schema_name) <> ''
      and btrim(schema_name) <> 'genba_ai'
    group by btrim(schema_name)
  ) schemas;

  execute format('alter role authenticator set pgrst.db_schemas = %L', next_schemas);
end $$;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

commit;
