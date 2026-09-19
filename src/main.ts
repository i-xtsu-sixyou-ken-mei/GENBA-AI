const WAITLIST_ENDPOINT = "";

const form = document.querySelector<HTMLFormElement>("#waitlist-form");
const message = document.querySelector<HTMLElement>("#form-message");
const interest = document.querySelector<HTMLSelectElement>("#interest");
const emailInput = document.querySelector<HTMLInputElement>("#email");

document.querySelectorAll<HTMLAnchorElement>(".interest-link").forEach((link) => {
  link.addEventListener("click", () => {
    if (!interest) return;
    interest.value = link.dataset.interest || "GENBA Studio";
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!message || !interest || !emailInput) return;

  const email = emailInput.value.trim();
  if (!email) return;

  if (!WAITLIST_ENDPOINT) {
    localStorage.setItem("genba-ai-waitlist-email", email);
    localStorage.setItem("genba-ai-waitlist-interest", interest.value);
    message.textContent = "ありがとうございます。フォーム受付先の公開準備中です。";
    return;
  }

  try {
    const response = await fetch(WAITLIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        interest: interest.value,
        source: "genba-ai-healthcare",
      }),
    });

    if (!response.ok) throw new Error("request failed");

    form.reset();
    message.textContent = "登録しました。ご案内をお送りします。";
  } catch {
    message.textContent = "送信できませんでした。時間をおいて再度お試しください。";
  }
});
