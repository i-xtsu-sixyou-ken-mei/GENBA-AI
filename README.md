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

The email capture UI is wired in `src/main.ts`, but no remote form backend is configured yet.

Set `WAITLIST_ENDPOINT` to a Formspree, Basin, Supabase Edge Function, or another API endpoint when lead storage is ready.

Until an endpoint is configured, submissions are kept only in the visitor's local storage and are not transmitted off-device.
