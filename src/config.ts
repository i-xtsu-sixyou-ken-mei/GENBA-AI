// Single source of truth for lead capture + contact.
// Fill in the values below (or via `.env`, see `.env.example`) and rebuild.
//
// Leads go to the Supabase Edge Function `genba-lead`, which inserts into
// `genba_ai.leads` with the server-side secret key. The browser never
// touches the database directly -- only the publishable key is embedded
// here (public by design). Never add a `VITE_*` secret key.

/** Supabase project URL, e.g. https://xxxxx.supabase.co */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? "";

/** Publishable key (`sb_publishable_...`). Safe to embed in the bundle. */
export const SUPABASE_PUBLISHABLE_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Lead endpoint. Empty = queue submissions locally until configured. */
export const LEAD_ENDPOINT: string = SUPABASE_URL
  ? `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/genba-lead`
  : "";

/** Shown on the landing page. Empty = hidden until set. */
export const SALES_EMAIL: string = import.meta.env.VITE_SALES_EMAIL ?? "";
export const SUPPORT_EMAIL: string = import.meta.env.VITE_SUPPORT_EMAIL ?? "";

export const LEAD_SOURCE = "genba-ai-website";
