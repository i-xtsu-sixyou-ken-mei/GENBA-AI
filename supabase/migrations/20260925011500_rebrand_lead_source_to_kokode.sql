-- KOKODE branding migration for the kokode_ai schema.
-- Idempotent and applied through the Management API, never migration history.

alter table if exists kokode_ai.leads
  alter column source set default 'kokode-website';
