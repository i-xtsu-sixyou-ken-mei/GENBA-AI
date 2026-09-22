// Single source of truth for lead capture + contact.
// Fill in the values below (or via `.env`, see `.env.example`) and rebuild.
// The form endpoint URL is public by design (Basin/Formspree model);
// spam protection comes from the provider (e.g. Turnstile/honeypot).

/** Basin / Formspree form endpoint. Empty = queue submissions locally until configured. */
export const WAITLIST_ENDPOINT: string =
  import.meta.env.VITE_WAITLIST_ENDPOINT ?? "";

/** Shown on the landing page. Empty = hidden until set. */
export const SALES_EMAIL: string = import.meta.env.VITE_SALES_EMAIL ?? "";
export const SUPPORT_EMAIL: string = import.meta.env.VITE_SUPPORT_EMAIL ?? "";

export const LEAD_SOURCE = "genba-ai-healthcare";
