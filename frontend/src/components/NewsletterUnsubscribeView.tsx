"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { unsubscribeNewsletter } from "@/lib/api/newsletter";

type UnsubscribeStatus = "idle" | "confirming" | "done" | "error";

/**
 * Unsubscribe page. Like the confirmation flow, the status change happens
 * through the explicit unsubscribe action — a plain GET must never mutate it.
 */
export function NewsletterUnsubscribeView() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<UnsubscribeStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleUnsubscribe() {
    if (!email || !token || status === "confirming" || status === "done") {
      return;
    }

    setStatus("confirming");
    setError(null);

    try {
      const result = await unsubscribeNewsletter(email, token);
      setStatus(result.status === "unsubscribed" ? "done" : "error");
      if (result.status !== "unsubscribed") {
        setError("This unsubscribe link is no longer valid.");
      }
    } catch {
      setStatus("error");
      setError("This unsubscribe link is no longer valid.");
    }
  }

  return (
    <section className="newsletter-unsubscribe">
      <h1>Unsubscribe from the newsletter</h1>
      <p>
        {status === "done"
          ? "You're now unsubscribed. No further promotional emails will be sent to this address."
          : status === "error"
            ? "This unsubscribe link is no longer valid."
            : `Unsubscribe ${email ? `from ${email}` : "this address"} from the Aapulki newsletter?`}
      </p>

      {status !== "done" && (
        <button
          type="button"
          onClick={handleUnsubscribe}
          disabled={status === "confirming"}
        >
          {status === "confirming" ? "Unsubscribing…" : "Unsubscribe"}
        </button>
      )}
    </section>
  );
}
