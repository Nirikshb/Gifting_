"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { confirmNewsletterSubscription } from "@/lib/api/newsletter";

type ConfirmStatus = "idle" | "confirming" | "done" | "error";

/**
 * Confirmation page. The confirmation itself only happens through the
 * explicit "Confirm subscription" action below; the emailed link only prefills
 * the token, it never confirms on its own.
 */
export function NewsletterConfirmView() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<ConfirmStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!email || !token || status === "confirming" || status === "done") {
      return;
    }

    setStatus("confirming");
    setError(null);

    try {
      const result = await confirmNewsletterSubscription(email, token);
      setStatus(result.status === "subscribed" ? "done" : "error");
      if (result.status !== "subscribed") {
        setError("This confirmation link is no longer valid.");
      }
    } catch {
      setStatus("error");
      setError("This confirmation link is no longer valid.");
    }
  }

  return (
    <section className="newsletter-confirm">
      <h1>Confirm your newsletter subscription</h1>
      <p>
        {status === "done"
          ? "You're confirmed. The Aapulki newsletter will now start."
          : status === "error"
            ? "This confirmation link is no longer valid. You can request a new subscription from the banner."
            : `Confirm your Aapulki newsletter subscription for ${email || "this address"}. No promotional emails will be sent before you confirm.`}
      </p>

      {status !== "done" && (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={status === "confirming"}
        >
          {status === "confirming" ? "Confirming…" : "Confirm subscription"}
        </button>
      )}
    </section>
  );
}
