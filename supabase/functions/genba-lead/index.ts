// genba-lead: public lead-capture endpoint for the GENBA AI website.
//
// Browser flow (publishable key only):
//   POST https://<project>.supabase.co/functions/v1/genba-lead
//   Headers: apikey: <publishable key>, Authorization: Bearer <publishable key>
//
// Server side (secret, never in the repo / browser):
//   SUPABASE_URL + SUPABASE_SECRET_KEY (fallback: SUPABASE_SERVICE_ROLE_KEY)
//   insert into genba_ai.leads via PostgREST with the service_role key.
//   NOTE: `genba_ai` must be listed under Project Settings > Data API >
//   Exposed schemas for PostgREST access; Postgres grants still restrict
//   access to service_role only, so browsers cannot touch the table.
//
// Deploy: `supabase functions deploy genba-lead` (no secrets in code --
// hosted functions read project secrets from the environment).

import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_LEN = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowOrigin =
    allowed.includes("*") || !origin || allowed.includes(origin)
      ? (origin ?? "*")
      : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(
  status: number,
  body: unknown,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function str(value: unknown, limit = MAX_LEN): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" }, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json(400, { error: "invalid_json" }, origin);
  }

  // Cheap bot trap: common honeypot fields. Silently accept, store nothing.
  for (const field of ["website", "company_website", "nickname", "_gotcha"]) {
    if (typeof body[field] === "string" && body[field].trim() !== "") {
      return json(201, { ok: true }, origin);
    }
  }

  const email = str(body["email"], 254);
  const interest = str(body["interest"], 120);
  if (!EMAIL_RE.test(email)) {
    return json(400, { error: "invalid_email" }, origin);
  }
  if (!interest) {
    return json(400, { error: "invalid_interest" }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !secretKey) {
    console.error("genba-lead: missing SUPABASE_URL / secret key env");
    return json(500, { error: "not_configured" }, origin);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.schema("genba_ai").from("leads").insert({
    email,
    name: str(body["name"], 200) || null,
    organization: str(body["organization"], 200) || null,
    interest,
    source: str(body["source"], 100) || "genba-ai-website",
    utm_source: str(body["utm_source"]) || null,
    utm_medium: str(body["utm_medium"]) || null,
    utm_campaign: str(body["utm_campaign"]) || null,
    utm_term: str(body["utm_term"]) || null,
    utm_content: str(body["utm_content"]) || null,
    referrer: str(body["referrer"]) || null,
    landing_url: str(body["landing_url"]) || null,
  });

  if (error) {
    console.error("genba-lead: insert failed", error.message);
    return json(500, { error: "save_failed" }, origin);
  }

  // Future hooks: Turnstile verify, rate limit, email notification, auto-reply.
  return json(201, { ok: true }, origin);
});
