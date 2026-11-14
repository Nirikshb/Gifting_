"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type AnimationEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import Image from "next/image";
import { subscribeToNewsletter } from "@/lib/api/newsletter";
import styles from "./NewsletterBanner.module.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const invalidEmailMessage = "Your email address appears to be invalid.";
const failedMessage = "Something went wrong. Please try again.";
const consentRequiredMessage =
  "Please accept the newsletter terms before subscribing.";

export function NewsletterBanner() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [problem, setProblem] = useState<"invalid" | "failed" | null>(null);
  const [consentError, setConsentError] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [poof, setPoof] = useState(false);
  const [phase, setPhase] = useState<"hidden" | "open" | "closing">("hidden");

  useEffect(() => {
    let started = false;
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      setPhase("open");
    };
    const onStart = () => {
      started = true;
    };
    const onExit = () => {
      if (started) open();
    };
    window.addEventListener("swarm:start", onStart);
    window.addEventListener("swarm:exit", onExit);
    const fallback = window.setTimeout(() => {
      if (!started) open();
    }, 2500);
    return () => {
      opened = true;
      window.removeEventListener("swarm:start", onStart);
      window.removeEventListener("swarm:exit", onExit);
      window.clearTimeout(fallback);
    };
  }, []);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (phase === "open" && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "closing") return;
    const id = window.setTimeout(() => setPhase("hidden"), 340);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (!signedUp || pendingConfirmation) return;
    const id = window.setTimeout(() => setPoof(true), 700);
    return () => window.clearTimeout(id);
  }, [signedUp, pendingConfirmation]);

  function close() {
    setPhase((current) => (current === "open" ? "closing" : current));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signedUp || submitting) return;

    const value = email.trim();
    if (!emailPattern.test(value)) {
      setProblem("invalid");
      return;
    }
    if (!consent) {
      setConsentError(true);
      return;
    }
    setConsentError(false);

    setSubmitting(true);
    try {
      const result = await subscribeToNewsletter(value);
      if (result.status === "pending_confirmation") {
        // Double opt-in: the address is queued and a confirmation email is on
        // its way. Nothing is sent to this address until it is confirmed.
        setProblem(null);
        setPendingConfirmation(true);
        setSignedUp(true);
        return;
      }

      setProblem(null);
      setSignedUp(true);
    } finally {
      setSubmitting(false);
    }
  }

  function onPoofEnd(event: AnimationEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || !poof) return;
    const name = String(event.animationName);
    if (!name.includes("signup-poof") && !name.includes("signup-fade")) return;
    setPhase("hidden");
  }

  function change(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
    if (problem && emailPattern.test(event.target.value.trim())) {
      setProblem(null);
    }
  }

  function onDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) close();
  }

  const heading = signedUp
    ? pendingConfirmation
      ? "Check your inbox to confirm."
      : "You're signed up."
    : "Join my newsletter";

  const copy = signedUp
    ? pendingConfirmation
      ? "We've sent you a confirmation link. Confirm it to start the newsletter."
      : "Thank you."
    : "Receive fresh articles straight in your inbox, every Friday morning. I also share interesting finds from the internet!";

  if (phase === "hidden") return null;

  return (
    <dialog
      ref={dialogRef}
      data-swarm-ignore=""
      className={
        phase === "closing"
          ? styles.dialogClosing
          : poof
            ? `${styles.dialog} ${styles.dialogPoof}`
            : styles.dialog
      }
      aria-labelledby="newsletter-title"
      onClick={onDialogClick}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <section
        className={poof ? `${styles.banner} ${styles.poof}` : styles.banner}
        aria-label="Newsletter"
        onAnimationEnd={onPoofEnd}
      >
        <button
          className={styles.close}
          type="button"
          aria-label="Close"
          onClick={close}
        >
          <CloseIcon />
        </button>
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.wash}>
            <img className={styles.photo} src="/newsletter/7c86d.png" alt="" />
            <div className={styles.grain} />
            <div className={styles.fade} />
          </div>
          <Envelopes />
        </div>

        <div className={styles.content}>
          <div className={styles.text}>
            <h2 id="newsletter-title">{heading}</h2>
            <p>{copy}</p>
          </div>

          <form className={styles.form} onSubmit={submit} noValidate>
            <div className={styles.field}>
              <input
                className={problem ? styles.inputInvalid : styles.input}
                type="email"
                name="email"
                autoComplete="email"
                data-clarity-mask="true"
                placeholder="Your email address…"
                value={email}
                disabled={signedUp || submitting}
                aria-invalid={
                  problem === "invalid" || consentError ? true : undefined
                }
                aria-describedby="newsletter-note"
                onChange={change}
              />
              <p
                id="newsletter-note"
                className={problem ? styles.error : styles.note}
              >
                {problem === "invalid"
                  ? invalidEmailMessage
                  : problem === "failed"
                    ? failedMessage
                    : consentError
                      ? consentRequiredMessage
                      : "Weekly newsletter only. No spam, unsubscribe at any time."}
              </p>
            </div>

            {!signedUp && (
              <div className={styles.consent}>
                <input
                  id="newsletter-consent"
                  className={styles.consentInput}
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => {
                    setConsent(event.target.checked);
                    if (event.target.checked) {
                      setConsentError(false);
                    }
                  }}
                />
                <label
                  className={styles.consentLabel}
                  htmlFor="newsletter-consent"
                >
                  I want the Aapulki newsletter — fresh articles every Friday
                  morning and interesting finds from the internet. No spam, and
                  you can unsubscribe at any time.
                </label>
              </div>
            )}

            <button
              className={styles.button}
              type="submit"
              disabled={signedUp || submitting}
            >
              {submitting
                ? "Joining…"
                : signedUp
                  ? pendingConfirmation
                    ? "Pending confirmation"
                    : "Subscribed"
                  : "Subscribe"}
            </button>
            <p className={styles.mobileNote}>
              Weekly newsletter only. No spam,
              <br />
              unsubscribe at any time.
            </p>
          </form>
        </div>
      </section>
    </dialog>
  );
}

/**
 * Original Aapulki illustration (drawn for this project â€” no borrowed assets,
 * zero network requests): a letter slipping out of an envelope beside a small
 * ribboned gift, in the site's cream / olive palette.
 */
function EnvelopeArt() {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 340 260"
      fill="none"
      aria-hidden="true"
    >
      {/* soft backdrop shapes */}
      <circle cx="242" cy="86" r="104" fill="var(--tint)" />
      <circle cx="76" cy="228" r="46" fill="var(--surface)" />

      {/* letter peeking out of the envelope */}
      <g transform="rotate(-8 170 96)">
        <rect x="128" y="34" width="92" height="108" rx="6" fill="var(--card)" stroke="var(--rule)" strokeWidth="2" />
        <line x1="142" y1="58" x2="206" y2="54" stroke="var(--rule)" strokeWidth="3" strokeLinecap="round" />
        <line x1="142" y1="74" x2="206" y2="70" stroke="var(--rule)" strokeWidth="3" strokeLinecap="round" />
        {/* wax-seal heart on the letter */}
        <path
          d="M174 96c-7-6-14-11-14-18 0-5 4-8 8-8 3 0 5 1 6 4 1-3 3-4 6-4 4 0 8 3 8 8 0 7-7 12-14 18z"
          fill="#3f4034"
        />
      </g>

      {/* envelope body */}
      <rect x="84" y="118" width="180" height="116" rx="10" fill="var(--surface)" stroke="var(--rule)" strokeWidth="2" />
      {/* open flap folded back */}
      <path
        d="M84 128c0-6 5-10 10-10h160c5 0 10 4 10 10l-84 56c-4 3-8 3-12 0z"
        fill="var(--tint)"
        stroke="var(--rule)"
        strokeWidth="2"
      />
      {/* front folds */}
      <path d="M84 128l84 56 84-56" stroke="var(--rule)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M84 234l62-50M264 234l-62-50" stroke="var(--rule)" strokeWidth="2" strokeLinecap="round" />

      {/* wax seal on the flap tip */}
      <circle cx="168" cy="180" r="13" fill="#3f4034" />
      <path
        d="M168 174l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z"
        fill="var(--card)"
      />

      {/* small ribboned gift box */}
      <g>
        <rect x="228" y="176" width="64" height="58" rx="7" fill="#3f4034" />
        <rect x="228" y="196" width="64" height="12" fill="#9b9c86" />
        <rect x="254" y="176" width="12" height="58" fill="#9b9c86" />
        {/* bow */}
        <path
          d="M260 176c-10-2-16-8-14-14 2-5 9-5 12 0 2 3 2 8 2 14zm0 0c10-2 16-8 14-14-2-5-9-5-12 0-2 3-2 8-2 14z"
          stroke="var(--card)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>

      {/* hand-tied sprig accents */}
      <path d="M296 128c10-8 22-10 30-6" stroke="#9b9c86" strokeWidth="3" strokeLinecap="round" />
      <path d="M306 116c6-2 12-1 16 2" stroke="#9b9c86" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 66c-8-8-10-18-7-26" stroke="#9b9c86" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}


