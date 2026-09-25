-- Expose legacy schema `genba_ai` to PostgREST so KOKODE's `genba-lead` Edge Function can insert
-- via the Data API. Idempotent; apply with:
--   npm run ops -- sql supabase/migrations/20260923021804_expose_genba_ai_schema.sql
-- (Management API -- never `supabase db push`: the shared project's
-- migration history belongs to zapEngine.)
--
-- The shared project pins `pgrst.db_schemas` on the `authenticator` role,
-- which overrides Dashboard > Data API > Exposed schemas. zapEngine relies
-- on that list (PGRST106 if its schemas disappear), so APPEND only, never
-- overwrite. Same DO block as zapEngine
-- apps/podcast-pipeline/supabase/migrations/006_harden_mobile_anon_access.sql.
--
-- Rollback: rerun this block with the split list filtered to drop
-- `genba_ai` instead of appending it.

begin;

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
      current_schemas || ',genba_ai',
      ','
    ) with ordinality as listed(schema_name, ordinal_position)
    where btrim(schema_name) <> ''
    group by btrim(schema_name)
  ) schemas;

  execute format('alter role authenticator set pgrst.db_schemas = %L', next_schemas);
end $$;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';

commit;
