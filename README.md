# GENBA AI

Landing page for **GENBA AI**, built with Vite and Vanilla TypeScript.

## Local development

```bash
npm install
npm run dev        # leads queue locally (no endpoint configured)
npm run dev:live   # posts to the live genba-lead function (see below)
npm test           # vitest: form/queue logic + Edge Function handler
```

Open `http://localhost:5173/GENBA-AI/` in a browser (the dev server respects the `/GENBA-AI/` base path).

## Production build

```bash
npm run build
```

The production output is written to `dist/`.

## GitHub Pages

The repository uses a GitHub Actions Pages workflow at:

`.github/workflows/pages.yml`

Pull requests run the Vite build as a validation check. Pushes to `main` build and deploy `dist/` to GitHub Pages.

Current Pages base path:

`/GENBA-AI/`

Expected URL:

`https://i-xtsu-sixyou-ken-mei.github.io/GENBA-AI/`

## Brand assets

- `public/logo.webp` — GENBA AI primary logo
- `public/favicon.svg` — compact GENBA AI mark

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

Production (GitHub Pages) needs one Repository Variable, set with
`npm run ops -- gh-vars` (or Settings → Secrets and variables → Actions →
Variables):

- `VITE_SUPABASE_URL` -- the shared project URL (public by design)
- `VITE_SALES_EMAIL`, `VITE_SUPPORT_EMAIL`, `VITE_ANALYTICS_ENDPOINT` --
  optional

Without `VITE_SUPABASE_URL` the live site keeps leads in each visitor's
browser queue; they are sent automatically once a build with the URL ships.

## Supabase backend (shared project, isolated namespace)

GENBA AI shares the Zap Pilot Supabase project (owned by zapEngine) but lives
in its own `genba_ai` schema, which GENBA manages itself -- outside
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

| Purpose | Project | Keys GENBA reads |
|---|---|---|
| GENBA's own credentials (repo default, `.infisical.json`) | genba-ai | `SUPABASE_ACCESS_TOKEN` (personal access token) |
| Shared Supabase coordinates -- **read only** | Zap Pilot | `SUPABASE_URL` |

`scripts/infisical.sh <genba|zap> -- <cmd>` switches between them
(`INFISICAL_ENV` overrides `prod`). Never write to the Zap Pilot project:
zapEngine's env loader fails on keys it does not declare.

### Operations: `npm run ops -- <task>`

`scripts/supabase-ops.sh` is the only way GENBA touches the shared project.
Secrets are never printed or passed through argv.

| Task | What it does |
|---|---|
| `sql <file>` | Run an idempotent SQL file via the Management API (no migration history) |
| `check` | Read-only report: table, RLS, grants, exposed schemas, migration count; exits 1 if a zapEngine invariant broke |
| `secrets` | Set `GENBA_LEAD_ALLOWED_ORIGINS` (Pages origin + `localhost:5173`) |
| `deploy` | Deploy **only** `genba-lead` (`--no-verify-jwt --use-api`, no Docker) |
| `dev` | Vite dev server against the live function (= `npm run dev:live`); submitted leads go to the **production** table |
| `e2e` | API-level E2E: preflight, keyless POST, invalid email, foreign origin, DB row count |
| `e2e-cleanup [--yes]` | List, then delete, `e2e+%@example.com` rows |
| `gh-vars` | Set the `VITE_SUPABASE_URL` Actions variable (value not echoed) |

### Rules for the shared project

- **Never** `supabase db push`, `db reset`, `migration repair` or
  `config push` against it. zapEngine's CI `db push`es its own history from
  `supabase_migrations.schema_migrations`; a GENBA version there breaks its
  deploys. GENBA SQL goes through `ops sql` and only creates/alters
  `genba_ai.*`.
- **Never** `functions deploy --prune` or deploy without a function name.
- `authenticator`'s `pgrst.db_schemas` is pinned in the DB (it overrides the
  Dashboard's Exposed schemas) and shared with zapEngine: **append only**.
  If zapEngine ever rewrites it without `genba_ai`, the function returns 500
  and leads wait in the browser queue.
- Function secrets are project-wide, hence the `GENBA_` prefix.

### Rollout order

The endpoint must work before the site points at it -- visitors' queued leads
are re-sent as soon as a build with `VITE_SUPABASE_URL` ships.

1. `npm run ops -- check` (baseline: note the migration count)
2. `npm run ops -- sql supabase/migrations/20260922000000_create_genba_ai_leads.sql`
3. `npm run ops -- sql supabase/migrations/<ts>_expose_genba_ai_schema.sql`
4. `npm run ops -- check` -- all OK, migration count unchanged
5. `npm run ops -- secrets` then `npm run ops -- deploy`
6. `npm run ops -- e2e`
7. `npm run ops -- gh-vars`, then merge to `main` (Pages deploy)
8. Verify on the live site, then `npm run ops -- e2e-cleanup`

Rollback: `gh variable delete VITE_SUPABASE_URL` + rerun Pages (back to
queue-only; no lead is lost); `npx supabase@2.117.0 functions delete
genba-lead --project-ref <ref>`; to un-expose, rerun the expose block with
`genba_ai` filtered out. Schema and data are kept.
