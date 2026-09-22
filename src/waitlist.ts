import { getAttribution, trackEvent } from "./analytics";
import {
  LEAD_ENDPOINT,
  LEAD_SOURCE,
  SUPABASE_PUBLISHABLE_KEY,
} from "./config";

// Payload mirrors the `genba_ai.leads` columns (snake_case). The Edge
// Function whitelists these keys; `page_url` is submit-time context kept
// for forward compatibility (currently not stored).
interface LeadPayload {
  email: string;
  interest: string;
  organization: string;
  name: string;
  source: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  referrer: string;
  landing_url: string;
  page_url: string;
}

const QUEUE_KEY = "genba-ai-lead-queue-v2";
// Previous Basin/Formspree-era queue (different shape) -- migrated once.
const LEGACY_QUEUE_KEY = "genba-ai-waitlist-queue";

function isConfigured(): boolean {
  return Boolean(LEAD_ENDPOINT) && Boolean(SUPABASE_PUBLISHABLE_KEY);
}

/** 4xx from the function means retrying won't help (e.g. invalid email). */
class PermanentError extends Error {}

function readQueue(key: string): LeadPayload[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LeadPayload[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: LeadPayload[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage unavailable: retry is best-effort.
  }
}

function queueLead(payload: LeadPayload): void {
  writeQueue([...readQueue(QUEUE_KEY), payload]);
}

/** One-time migration of the old queue shape into the Supabase payload. */
function migrateLegacyQueue(): void {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LEGACY_QUEUE_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    localStorage.removeItem(LEGACY_QUEUE_KEY);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    const migrated: LeadPayload[] = [];
    for (const item of parsed as Array<Record<string, unknown>>) {
      if (typeof item !== "object" || item === null) continue;
      const attr = (item["attribution"] ?? {}) as Record<string, unknown>;
      const s = (v: unknown): string =>
        typeof v === "string" ? v : "";
      const email = s(item["email"]).trim();
      const interest = s(item["interest"]).trim();
      if (!email || !interest) continue;
      migrated.push({
        email,
        interest,
        organization: s(item["organization"]),
        name: s(item["name"]),
        source: s(item["source"]) || LEAD_SOURCE,
        utm_source: s(attr["utmSource"]),
        utm_medium: s(attr["utmMedium"]),
        utm_campaign: s(attr["utmCampaign"]),
        utm_term: s(attr["utmTerm"]),
        utm_content: s(attr["utmContent"]),
        referrer: s(attr["referrer"]),
        landing_url: s(attr["landingUrl"]),
        page_url: s(item["pageUrl"]),
      });
    }
    if (migrated.length > 0) {
      writeQueue([...readQueue(QUEUE_KEY), ...migrated]);
    }
  } catch {
    // Corrupt legacy queue: already removed, nothing to migrate.
  }
}

async function postLead(payload: LeadPayload): Promise<void> {
  const response = await fetch(LEAD_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      throw new PermanentError(`rejected: ${response.status}`);
    }
    throw new Error(`request failed: ${response.status}`);
  }
}

/**
 * Re-send leads that were queued while offline or when the POST failed.
 * Only successful posts are removed; retryable failures stay queued.
 * Permanently rejected payloads (4xx) are dropped.
 */
export async function flushQueue(): Promise<void> {
  if (!isConfigured()) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const pending = readQueue(QUEUE_KEY);
  if (pending.length === 0) return;

  const remaining: LeadPayload[] = [];
  for (const payload of pending) {
    try {
      await postLead(payload);
      trackEvent("lead_retried", { interest: payload.interest });
    } catch (error) {
      if (!(error instanceof PermanentError)) remaining.push(payload);
    }
  }
  writeQueue(remaining);
}

export function initWaitlist(): void {
  const form = document.querySelector<HTMLFormElement>("#waitlist-form");
  const message = document.querySelector<HTMLElement>("#form-message");
  const interest = document.querySelector<HTMLSelectElement>("#interest");
  const emailInput = document.querySelector<HTMLInputElement>("#email");
  if (!form || !message || !interest || !emailInput) return;
  const orgInput =
    document.querySelector<HTMLInputElement>("#organization");
  const nameInput = document.querySelector<HTMLInputElement>("#contact-name");

  // Best-effort: migrate the old queue, then re-send previous visits.
  migrateLegacyQueue();
  void flushQueue();
  window.addEventListener("online", () => {
    void flushQueue();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    if (!email) return;

    const attribution = getAttribution();
    const payload: LeadPayload = {
      email,
      interest: interest.value,
      organization: orgInput?.value.trim() ?? "",
      name: nameInput?.value.trim() ?? "",
      source: LEAD_SOURCE,
      utm_source: attribution.utmSource,
      utm_medium: attribution.utmMedium,
      utm_campaign: attribution.utmCampaign,
      utm_term: attribution.utmTerm,
      utm_content: attribution.utmContent,
      referrer: attribution.referrer,
      landing_url: attribution.landingUrl,
      page_url: window.location.href,
    };

    if (!isConfigured()) {
      queueLead(payload);
      message.textContent =
        "ありがとうございます。フォーム受付先の公開準備中です。";
      return;
    }

    void (async () => {
      try {
        await postLead(payload);
        form.reset();
        message.textContent = "登録しました。ご案内をお送りします。";
        trackEvent("lead_submitted", { interest: payload.interest });
        // A previous queue may exist; try to drain it now that we are online.
        void flushQueue();
      } catch (error) {
        if (error instanceof PermanentError) {
          message.textContent =
            "入力内容をご確認ください。メールアドレスが正しくない可能性があります。";
          return;
        }
        queueLead(payload);
        message.textContent =
          "送信できませんでした。入力内容は保存されており、接続の回復後に自動で再送します。";
        trackEvent("lead_failed", { interest: payload.interest });
      }
    })();
  });
}
