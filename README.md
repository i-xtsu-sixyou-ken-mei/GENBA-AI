# GENBA AI

Static landing page for **GENBA AI**.

## Local preview

Open `index.html` directly in a browser, or run any static file server.

## GitHub Pages

The site is fully static and deployable from the repository root.

A Pages workflow is included at:

`.github/workflows/pages.yml`

For the first deployment, enable GitHub Pages once in:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

After that, pushes to `main` deploy automatically.

Expected URL:

`https://i-xtsu-sixyou-ken-mei.github.io/GENBA-AI/`

## Waitlist form

The landing page contains the email capture UI, but GitHub Pages itself has no backend.

Set `WAITLIST_ENDPOINT` near the bottom of `index.html` to a Formspree/Basin/custom API endpoint to begin storing submissions.

Until an endpoint is configured, the form only shows the pre-launch confirmation locally and does not transmit the email off-device.
