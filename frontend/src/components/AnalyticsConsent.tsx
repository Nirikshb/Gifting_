"use client";

import { useState } from "react";
import {
  denyConsent,
  grantConsent,
  readConsent,
  type AnalyticsConsentChoice,
} from "@/lib/analytics/consent";
import styles from "./AnalyticsConsent.module.css";

export function AnalyticsConsent() {
  const [choice, setChoice] = useState<AnalyticsConsentChoice>(() => readConsent());
  const [open, setOpen] = useState(() => readConsent() === "unknown");

  if (!open) {
    return (
      <button className={styles.reopen} type="button" onClick={() => setOpen(true)}>
        Analytics
      </button>
    );
  }

  function allow() {
    grantConsent();
    setChoice("granted");
    setOpen(false);
  }

  function keepOff() {
    denyConsent();
    setChoice("denied");
    setOpen(false);
  }

  const enabled = choice === "granted";

  return (
    <div className={styles.banner} role="dialog" aria-label="Analytics consent">
      <p>
        {enabled
          ? "Analytics is on. Google Analytics and Microsoft Clarity can run until you turn them off."
          : "Analytics is off. Allow Google Analytics and Microsoft Clarity, or leave them off. Clarity can record the screen after you allow it."}
      </p>
      <div className={styles.actions}>
        <button className={styles.allow} type="button" onClick={allow}>
          Allow
        </button>
        <button className={styles.decline} type="button" onClick={keepOff}>
          {enabled ? "Turn off" : "Leave off"}
        </button>
      </div>
    </div>
  );
}
