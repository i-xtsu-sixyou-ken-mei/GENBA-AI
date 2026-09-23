// genba-lead: public lead-capture endpoint for the GENBA AI website.
//
// Browser flow (no key at all -- the function is public):
//   POST https://<project>.supabase.co/functions/v1/genba-lead
//   Headers: Content-Type: application/json
// Deployed with `verify_jwt = false` (supabase/config.toml): the gateway's
// JWT check only understands legacy JWT keys, and this endpoint has no
// caller identity to verify anyway.
//
// Server side (never in the repo / browser): the Edge runtime injects
// SUPABASE_URL + SUPABASE_SECRET_KEYS; createAdminClient() uses the
// `default` secret key (else the first one) to insert into genba_ai.leads
// via PostgREST. `genba_ai` must be in authenticator's pgrst.db_schemas
// (migration *_expose_genba_ai_schema.sql); grants restrict the table to
// service_role.
//
// Not `withSupabase`: it eagerly builds a publishable-key client on every
// request (this shared project has no publishable key -> 500) and forces
// `Access-Control-Allow-Origin: *`.
//
// GENBA_LEAD_ALLOWED_ORIGINS: comma-separated origins (function secrets are
// project-wide and shared with zapEngine, hence the prefix). Unset = any.
//
// Deploy: `npm run ops -- deploy` (see scripts/supabase-ops.sh).

import { createAdminClient } from "npm:@supabase/server@1.8.0/core";
import { handleLead, parseAllowedOrigins } from "./handler.ts";

const allowedOrigins = parseAllowedOrigins(
  Deno.env.get("GENBA_LEAD_ALLOWED_ORIGINS"),
);

Deno.serve((req) =>
  handleLead(req, {
    allowedOrigins,
    insertLead: (row) =>
      createAdminClient().schema("genba_ai").from("leads").insert(row),
  })
);
