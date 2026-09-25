# KOKODE

Landing page for **KOKODE**, built with Vite and Vanilla TypeScript.

## Local development

```bash
pnpm install
pnpm dev        # leads queue locally (no endpoint configured)
pnpm dev:live   # posts to the live genba-lead function (see below)
pnpm test           # vitest: form/queue logic + Edge Function handler
```

Open `http://localhost:5173/` in a browser.

## Production build

```bash
pnpm build
```

The production output is written to `dist/`.

## GitHub Pages

The repository uses a GitHub Actions Pages workflow at:

`.github/workflows/pages.yml`

Pull requests run the Vite build as a validation check. Pushes to `main` run the full production pipeline: tests/build → KOKODE
Supabase reconciliation → production E2E → GitHub Pages deploy. The frontend
is not published if the backend rollout or E2E fails.

Current Pages base path:

`/` (custom domain `www.kokode.xyz`)

Expected URL:

`https://www.kokode.xyz/`

## Brand assets

- `public/favicon.svg` — compact KOKODE mark

## Privacy

The site includes `privacy.html` and links to it from the lead form and footer.

## Waitlist form

`src/waitlist.ts` posts leads as JSON to the Supabase Edge Function
`genba-lead` (`src/config.ts`, derived from `VITE_SUPABASE_URL`). The
function is public and takes **no key**: the bundle embeds only the project
URL, never a Supabase key. The function inserts into `genba_ai.leads` with
the server-side secret key -- the browser never touches the database.

Reliability: submissions that fail are queued in local storage
(`genba-ai-lead-queue-v2`) and re-sent on page load, on the browser `online`
event and after the next successful submit (one flush at a time). A lead
leaves the queue only when the function stored it (2xx) or rejected it as
invalid (`400 invalid_email` / `400 invalid_interest`). Every other failure
-- 401/403/404/405/429/5xx, unknown codes, non-JSON bodies, network errors
-- keeps it queued, so a misconfigured deploy never loses leads.
UTM params + first-touch referrer/landing URL are captured per session
(`src/analytics.ts`) and sent with each lead. Collected fields are listed
in `privacy.html` §1.

Production needs the public Repository Variable:

- `VITE_SUPABASE_URL` -- the shared project URL (public by design)

Optional frontend variables are `VITE_SALES_EMAIL`, `VITE_SUPPORT_EMAIL`
and `VITE_ANALYTICS_ENDPOINT`.

The backend deploy job also needs a credential. Prefer the same Infisical
machine-identity pattern used by zapEngine:

- `INFISICAL_UNIVERSAL_AUTH_CLIENT_ID` (GitHub Secret)
- `INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET` (GitHub Secret)

That identity must be able to read `SUPABASE_ACCESS_TOKEN` from KOKODE's
Infisical project. As a simpler fallback, GitHub Secret
`SUPABASE_ACCESS_TOKEN` is supported directly.

Without `VITE_SUPABASE_URL` the live site keeps leads in each visitor's
browser queue; they are sent automatically once a configured build ships.

## Supabase backend (shared project, isolated namespace)

KOKODE shares the Zap Pilot Supabase project (owned by zapEngine) but lives
in its own `genba_ai` schema, which KOKODE manages itself -- outside
zapEngine's migration pipeline.

- `supabase/migrations/20260922000000_create_genba_ai_leads.sql` -- schema +
  table + RLS + service_role-only grants
- `supabase/migrations/*_expose_genba_ai_schema.sql` -- appends `genba_ai`
  to PostgREST's exposed schemas
- `supabase/functions/genba-lead/handler.ts` -- pure request handler
  (CORS/origin allowlist, validation, honeypot), unit-tested on Node
- `supabase/functions/genba-lead/index.ts` -- Deno entry point
  (`verify_jwt = false`, `createAdminClient()` from `@supabase/server`)

### Infisical projects

| Purpose | Project | Keys KOKODE reads |
|---|---|---|
| KOKODE's own credentials (repo default, `.infisical.json`) | genba-ai | `SUPABASE_ACCESS_TOKEN` (personal access token) |
| Shared Supabase coordinates -- **read only** | Zap Pilot | `SUPABASE_URL` |

`scripts/infisical.sh <genba|zap> -- <cmd>` switches between them
(`INFISICAL_ENV` overrides `prod`). Never write to the Zap Pilot project:
zapEngine's env loader fails on keys it does not declare.

### Operations: `pnpm ops <task>`

`scripts/supabase-ops.sh` is the only way KOKODE touches the shared project.
Secrets are never printed or passed through argv.

| Task | What it does |
|---|---|
| `sql <file>` | Run one idempotent SQL file via the Management API (no migration history) |
| `apply` | Run every `supabase/migrations/*.sql` file in order |
| `check [--strict]` | Read-only report; `--strict` also fails unless the complete KOKODE backend is ready |
| `secrets` | Set `GENBA_LEAD_ALLOWED_ORIGINS` (Pages origin + `localhost:5173`) |
| `deploy` | Deploy **only** `genba-lead` (`--no-verify-jwt --use-api`, no Docker) |
| `dev` | Vite dev server against the live function (= `pnpm dev:live`); submitted leads go to the **production** table |
| `e2e` | API-level E2E: preflight, keyless POST, invalid email, foreign origin, DB row count |
| `e2e-cleanup [--yes]` | List, then delete, `e2e+%@example.com` rows |
| `gh-vars` | Set the `VITE_SUPABASE_URL` Actions variable (value not echoed) |

### Rules for the shared project

- **Never** `supabase db push`, `db reset`, `migration repair` or
  `config push` against it. zapEngine's CI `db push`es its own history from
  `supabase_migrations.schema_migrations`; a KOKODE version there breaks its
  deploys. KOKODE SQL goes through `ops sql` and only creates/alters
  `genba_ai.*`.
- **Never** `functions deploy --prune` or deploy without a function name.
- `authenticator`'s `pgrst.db_schemas` is pinned in the DB (it overrides the
  Dashboard's Exposed schemas) and shared with zapEngine: **append only**.
  If zapEngine ever rewrites it without `genba_ai`, the function returns 500
  and leads wait in the browser queue.
- Function secrets are project-wide, hence the `GENBA_` prefix.

### Production CI/CD

`.github/workflows/pages.yml` owns the production rollout. After a merge to
`main` it:

1. runs tests and builds the Vite site
2. runs every idempotent `supabase/migrations/*.sql` file through the
   Management API (never through Supabase migration history)
3. runs `pnpm ops check --strict` to verify both zapEngine invariants and the
   complete KOKODE backend state
4. reconciles `GENBA_LEAD_ALLOWED_ORIGINS`
5. deploys only `genba-lead`
6. runs the production API/DB E2E and cleans its test row
7. deploys GitHub Pages only if every backend step passed

The SQL files in this repository therefore must stay idempotent and safe to
re-run. Local `pnpm ops ...` commands remain available as break-glass
operations, not as normal release steps.

Rollback: remove `VITE_SUPABASE_URL` and rerun Pages to return the frontend
to queue-only mode; deleting the Edge Function or un-exposing `genba_ai`
should be reserved for an explicit backend rollback. Schema and data are kept.
