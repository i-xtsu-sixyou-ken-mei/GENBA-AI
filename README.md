# GENBA AI

Landing page for **GENBA AI**, built with Vite and Vanilla TypeScript.

## Local development

```bash
npm install
npm run dev
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
function inserts into `genba_ai.leads` with the server-side secret key --
the browser never touches the database directly (only the publishable key
is embedded in the bundle).

Local setup:

1. Copy `.env.example` to `.env`, set `VITE_SUPABASE_URL` +
   `VITE_SUPABASE_PUBLISHABLE_KEY` (plus `VITE_SALES_EMAIL` /
   `VITE_SUPPORT_EMAIL` to show contact emails).
2. `npm run build` — values are embedded at build time.

Production (GitHub Pages) setup — required, otherwise the live build ships
with empty values and leads stay in the visitor's browser only:

1. Repo → Settings → Secrets and variables → Actions → **Variables** tab.
2. Add (public-by-design, never secrets):
   - `VITE_SUPABASE_URL` — e.g. `https://xxxxx.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — `sb_publishable_...`
   - `VITE_SALES_EMAIL`, `VITE_SUPPORT_EMAIL` — contact addresses
   - `VITE_ANALYTICS_ENDPOINT` — optional
3. Push to `main` — `.github/workflows/pages.yml` injects these into
   `npm run build` via `vars.*`.

Reliability: failed/offline submissions are queued in local storage
(`genba-ai-lead-queue-v2`) and auto-retried on page load and on the
browser `online` event (only successful posts are removed; payloads the
server permanently rejects (4xx) are dropped).
UTM params + first-touch referrer/landing URL are captured per session
(`src/analytics.ts`) and sent with each lead. Collected fields are listed
in `privacy.html` §1.

## Supabase backend (shared project, isolated namespace)

GENBA AI shares the Zap Pilot Supabase project but lives in its own
`genba_ai` schema. Backend code lives in `supabase/`:

- `supabase/migrations/*_create_genba_ai_leads.sql` — schema + table +
  service_role-only grants (never grant `anon` / `authenticated`)
- `supabase/functions/genba-lead/index.ts` — `POST /genba-lead` validate →
  insert → `201`

One-time setup (Supabase Dashboard, no secrets in this repo):

1. SQL Editor → run `supabase/migrations/20260922000000_create_genba_ai_leads.sql`.
2. Project Settings → Data API → Exposed schemas → add `genba_ai`
   (required for the Edge Function's PostgREST insert; Postgres grants
   still restrict access to `service_role` only).
3. Edge Functions → deploy `genba-lead`:
   `supabase functions deploy genba-lead` (hosted functions already have
   `SUPABASE_URL` + secret key env; nothing to paste into GitHub).
4. Project Settings → API → copy Project URL + Publishable key into the
   GitHub Repository Variables above. The secret key stays in Supabase
   only — never in `VITE_*`, never in GitHub.
