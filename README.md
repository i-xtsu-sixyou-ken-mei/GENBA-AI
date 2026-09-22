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

1. Create a form at Basin/Formspree and copy the endpoint URL.
2. Copy `.env.example` to `.env`, set `VITE_WAITLIST_ENDPOINT` (plus
   `VITE_SALES_EMAIL` / `VITE_SUPPORT_EMAIL` to show contact emails).
3. `npm run build` — values are embedded at build time.

Until an endpoint is configured, submissions are queued only in the visitor's
local storage (`genba-ai-waitlist-queue`) and are not transmitted off-device.
UTM params + referrer are captured per session (`src/analytics.ts`) and sent
with each lead.
