// Minimal attribution: capture UTM params + referrer once per session so a
// later form submit keeps the original traffic source. No third-party script
// is loaded; add one explicitly only when you are ready for analytics.

export interface Attribution {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  referrer: string;
  landingUrl: string;
}

const STORAGE_KEY = "genba-ai-attribution";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

type UtmKey = (typeof UTM_KEYS)[number];

function readStored(): Partial<Record<UtmKey, string>> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<UtmKey, string>>;
  } catch {
    return {};
  }
}

export function getAttribution(): Attribution {
  const stored = readStored();
  const query = new URLSearchParams(window.location.search);
  const merged: Record<UtmKey, string> = {
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
  };

  for (const key of UTM_KEYS) {
    const current = query.get(key);
    merged[key] = current ?? stored[key] ?? "";
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Storage unavailable (private mode etc.): attribution is best-effort.
  }

  return {
    utmSource: merged.utm_source,
    utmMedium: merged.utm_medium,
    utmCampaign: merged.utm_campaign,
    utmTerm: merged.utm_term,
    utmContent: merged.utm_content,
    referrer: document.referrer,
    landingUrl: window.location.href,
  };
}

/** Future hook for product analytics. No-ops until VITE_ANALYTICS_ENDPOINT is set. */
export function trackEvent(name: string, data?: Record<string, string>): void {
  const endpoint: string = import.meta.env.VITE_ANALYTICS_ENDPOINT ?? "";
  if (!endpoint) {
    if (import.meta.env.DEV) {
      console.debug(`[analytics] ${name}`, data ?? {});
    }
    return;
  }

  try {
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: name, ...data }),
      keepalive: true,
    });
  } catch {
    // Analytics must never break the page.
  }
}
