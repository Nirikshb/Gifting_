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
import styles from "./NewsletterBanner.module.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const invalidEmailMessage = "Your email address appears to be invalid.";
const failedMessage = "Something went wrong. Please try again.";

async function subscribeToNewsletter(
  email: string,
): Promise<"ok" | "invalid" | "failed"> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) return "failed";

  try {
    const response = await fetch(`${baseUrl}/newsletter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (response.status === 400) return "invalid";
    if (!response.ok) return "failed";

    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "success" in body &&
      (body as { success: unknown }).success === true
    ) {
      return "ok";
    }

    return "failed";
  } catch {
    return "failed";
  }
}

export function NewsletterBanner() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [problem, setProblem] = useState<"invalid" | "failed" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [poof, setPoof] = useState(false);
  const [phase, setPhase] = useState<"hidden" | "open" | "closing">("hidden");

  useEffect(() => {
    const id = window.setTimeout(() => setPhase("open"), 400);
    return () => window.clearTimeout(id);
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
    if (!signedUp) return;
    const id = window.setTimeout(() => setPoof(true), 700);
    return () => window.clearTimeout(id);
  }, [signedUp]);

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

    setSubmitting(true);
    try {
      const result = await subscribeToNewsletter(value);
      if (result === "ok") {
        setProblem(null);
        setSignedUp(true);
        return;
      }

      setProblem(result);
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

  if (phase === "hidden") return null;

  return (
    <dialog
      ref={dialogRef}
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
      <button className={styles.close} type="button" aria-label="Close" onClick={close}>
        <CloseIcon />
      </button>
      <div className={styles.visual} aria-hidden="true">
        <div className={styles.wash}>
          <img
            className={styles.photo}
            src="/newsletter/7c86d.png"
            alt=""
          />
          <div className={styles.grain} />
          <div className={styles.fade} />
        </div>
        <Envelopes />
      </div>

      <div className={styles.content}>
        <div className={styles.text}>
          <h2 id="newsletter-title">
            {signedUp ? "You're signed up." : "Join my newsletter"}
          </h2>
          <p>
            {signedUp
              ? "Thank you."
              : "Receive fresh articles straight in your inbox, every Friday morning. I also share interesting finds from the internet!"}
          </p>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.field}>
            <input
              className={problem ? styles.inputInvalid : styles.input}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Your email address…"
              value={email}
              disabled={signedUp || submitting}
              aria-invalid={problem === "invalid" || undefined}
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
                  : "Weekly newsletter only. No spam, unsubscribe at any time."}
            </p>
          </div>
          <button
            className={styles.button}
            type="submit"
            disabled={signedUp || submitting}
          >
            Subscribe
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}

function Envelopes() {
  return (
    <div className={styles.envelopes}>
      <div className={styles.closedWrap}>
        <div className={styles.closed}>
          <div className={styles.closedBody} />
          <div className={styles.closedFolds}>
            <img
              className={styles.closedShadow}
              src="/newsletter/0d66b.svg"
              alt=""
              width="155"
              height="98.5577"
            />
            <img
              className={styles.closedBottom}
              src="/newsletter/8899c.svg"
              alt=""
              width="155"
              height="98.5577"
            />
            <img
              className={styles.closedTop}
              src="/newsletter/0c772.svg"
              alt=""
              width="120"
              height="49.5356"
            />
            <img
              className={styles.closedEdge}
              src="/newsletter/774b2.svg"
              alt=""
              width="118.876"
              height="49.86"
            />
          </div>
        </div>
      </div>
      <div className={styles.openWrap}>
        <div className={styles.open}>
          <img
            className={styles.base}
            src="/newsletter/8a113.svg"
            alt=""
            width="168"
            height="164"
          />
          <img
            className={styles.paperShadow}
            src="/newsletter/42cbf.svg"
            alt=""
            width="144.28"
            height="85.538"
          />
          <img
            className={styles.paper}
            src="/newsletter/7ab61.svg"
            alt=""
            width="105.5"
            height="108.5"
          />
          <img
            className={styles.letter}
            src="/newsletter/1a4e8.svg"
            alt=""
            width="86.9238"
            height="77.7129"
          />
          <img
            className={styles.paperEdge}
            src="/newsletter/cf5f8.svg"
            alt=""
            width="103.75"
            height="60.875"
          />
          <div className={styles.front}>
            <img
              className={styles.leftFold}
              src="/newsletter/8a53a.svg"
              alt=""
              width="116"
              height="76.9318"
            />
            <img
              className={styles.leftStroke}
              src="/newsletter/8f6ce.svg"
              alt=""
              width="100.078"
              height="58.9318"
            />
            <img
              className={styles.rightFold}
              src="/newsletter/935fa.svg"
              alt=""
              width="116"
              height="76.9318"
            />
            <img
              className={styles.rightStroke}
              src="/newsletter/7c8ea.svg"
              alt=""
              width="100.078"
              height="58.9318"
            />
            <img
              className={styles.bottomShadow}
              src="/newsletter/0e388.svg"
              alt=""
              width="186"
              height="118.269"
            />
            <img
              className={styles.bottomFold}
              src="/newsletter/daab7.svg"
              alt=""
              width="144"
              height="59.4429"
            />
            <img
              className={styles.bottomEdge}
              src="/newsletter/0f3fe.svg"
              alt=""
              width="142.652"
              height="59.7922"
            />
            <img
              className={styles.openFade}
              src="/newsletter/b3d36.svg"
              alt=""
              width="176"
              height="101.5"
            />
            <img
              className={styles.openBorder}
              src="/newsletter/8efeb.svg"
              alt=""
              width="146"
              height="94"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
