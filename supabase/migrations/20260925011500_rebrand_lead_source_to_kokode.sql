-- KOKODE branding migration for the existing legacy genba_ai schema.
-- The schema name is intentionally retained as a production identifier.
-- Idempotent and applied through the Management API, never migration history.

alter table if exists genba_ai.leads
  alter column source set default 'kokode-website';
