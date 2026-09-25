-- KOKODE lead capture: isolated namespace sharing the Zap Pilot project.
--
-- Idempotent; apply with:
--   npm run ops -- sql supabase/migrations/20260922000000_create_kokode_ai_leads.sql
-- (Management API -- never `supabase db push`: the shared project's
-- migration history belongs to zapEngine.) PostgREST exposure is a separate
-- step: *_expose_kokode_ai_schema.sql.
--
-- Grants below give access to `service_role` only -- never grant
-- `anon` / `authenticated`, so browsers cannot read/write leads directly.

create schema if not exists kokode_ai;

create table if not exists kokode_ai.leads (
  id uuid primary key default gen_random_uuid(),

  email text not null,
  name text,
  organization text,
  interest text not null,

  source text not null default 'kokode-website',

  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,

  referrer text,
  landing_url text,

  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  notes text,

  created_at timestamptz not null default now(),

  check (char_length(email) > 3 and char_length(email) <= 254),
  check (char_length(interest) > 0 and char_length(interest) <= 120)
);

-- Helpful ordering/filtering for using this table as a lightweight CRM.
create index if not exists leads_created_at_idx on kokode_ai.leads (created_at desc);
create index if not exists leads_status_idx on kokode_ai.leads (status);

-- Defense in depth: RLS on with no policies denies anon/authenticated
-- even if the schema is ever exposed; service_role bypasses RLS.
alter table kokode_ai.leads enable row level security;

-- Backend-only access. Do NOT grant anon / authenticated.
grant usage on schema kokode_ai to service_role;

grant all
on all tables in schema kokode_ai
to service_role;

grant all
on all sequences in schema kokode_ai
to service_role;

alter default privileges in schema kokode_ai
grant all on tables to service_role;

alter default privileges in schema kokode_ai
grant all on sequences to service_role;
