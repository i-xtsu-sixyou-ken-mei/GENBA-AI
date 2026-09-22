import { getAttribution, trackEvent } from "./analytics";
import { LEAD_SOURCE, WAITLIST_ENDPOINT } from "./config";

const QUEUE_KEY = "genba-ai-waitlist-queue";

interface LeadPayload {
  email: string;
  interest: string;
  organization?: string;
  name?: string;
  source: string;
  pageUrl: string;
  submittedAt: string;
  attribution: ReturnType<typeof getAttribution>;
}

function readQueue(): LeadPayload[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
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
  writeQueue([...readQueue(), payload]);
}

async function postLead(payload: LeadPayload): Promise<void> {
  const response = await fetch(WAITLIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`request failed: ${response.status}`);
}

/**
 * Re-send leads that were queued while offline or when the POST failed.
 * Only successful posts are removed; failures stay queued for next time.
 */
export async function flushQueue(): Promise<void> {
  if (!WAITLIST_ENDPOINT) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const pending = readQueue();
  if (pending.length === 0) return;

  const remaining: LeadPayload[] = [];
  for (const payload of pending) {
    try {
      await postLead(payload);
      trackEvent("lead_retried", { interest: payload.interest });
    } catch {
      remaining.push(payload);
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

  // Best-effort: re-send anything queued from a previous visit.
  void flushQueue();
  window.addEventListener("online", () => {
    void flushQueue();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    if (!email) return;

    const payload: LeadPayload = {
      email,
      interest: interest.value,
      organization: orgInput?.value.trim() ?? "",
      name: nameInput?.value.trim() ?? "",
      source: LEAD_SOURCE,
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
      attribution: getAttribution(),
    };

    if (!WAITLIST_ENDPOINT) {
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
      } catch {
        queueLead(payload);
        message.textContent =
          "送信できませんでした。入力内容は保存されており、接続の回復後に自動で再送します。";
        trackEvent("lead_failed", { interest: payload.interest });
      }
    })();
  });
}
