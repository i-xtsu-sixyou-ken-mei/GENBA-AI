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

`src/waitlist.ts` posts leads as JSON to the endpoint in `src/config.ts`
(`VITE_WAITLIST_ENDPOINT`, see `.env.example`). Basin and Formspree both
accept this format (~50 free submissions/month each).

Local setup:

1. Create a form at Basin/Formspree and copy the endpoint URL.
2. Copy `.env.example` to `.env`, set `VITE_WAITLIST_ENDPOINT` (plus
   `VITE_SALES_EMAIL` / `VITE_SUPPORT_EMAIL` to show contact emails).
3. `npm run build` — values are embedded at build time.

Production (GitHub Pages) setup — required, otherwise the live build ships
with empty values and leads stay in the visitor's browser only:

1. Repo → Settings → Secrets and variables → Actions → **Variables** tab.
2. Add (public-by-design, never secrets):
   - `VITE_WAITLIST_ENDPOINT` — Basin/Formspree endpoint URL
   - `VITE_SALES_EMAIL`, `VITE_SUPPORT_EMAIL` — contact addresses
   - `VITE_ANALYTICS_ENDPOINT` — optional
3. Push to `main` — `.github/workflows/pages.yml` injects these into
   `npm run build` via `vars.*`.

Reliability: failed/offline submissions are queued in local storage
(`genba-ai-waitlist-queue`) and auto-retried on page load and on the
browser `online` event (only successful posts are removed).
UTM params + first-touch referrer/landing URL are captured per session
(`src/analytics.ts`) and sent with each lead. Collected fields are listed
in `privacy.html` §1.
