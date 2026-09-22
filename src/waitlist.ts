import { getAttribution, trackEvent } from "./analytics";
import { LEAD_SOURCE, WAITLIST_ENDPOINT } from "./config";

const QUEUE_KEY = "genba-ai-waitlist-queue";

interface LeadPayload {
  email: string;
  interest: string;
  source: string;
  pageUrl: string;
  submittedAt: string;
  attribution: ReturnType<typeof getAttribution>;
}

function queueLead(payload: LeadPayload): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue = (raw ? JSON.parse(raw) : []) as LeadPayload[];
    queue.push(payload);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage unavailable: the lead cannot be kept; surface the error message.
  }
}

export function initWaitlist(): void {
  const form = document.querySelector<HTMLFormElement>("#waitlist-form");
  const message = document.querySelector<HTMLElement>("#form-message");
  const interest = document.querySelector<HTMLSelectElement>("#interest");
  const emailInput = document.querySelector<HTMLInputElement>("#email");
  if (!form || !message || !interest || !emailInput) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    if (!email) return;

    const payload: LeadPayload = {
      email,
      interest: interest.value,
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
        const response = await fetch(WAITLIST_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`request failed: ${response.status}`);

        form.reset();
        message.textContent = "登録しました。ご案内をお送りします。";
        trackEvent("lead_submitted", { interest: payload.interest });
      } catch {
        queueLead(payload);
        message.textContent =
          "送信できませんでした。時間をおいて再度お試しください。";
        trackEvent("lead_failed", { interest: payload.interest });
      }
    })();
  });
}
