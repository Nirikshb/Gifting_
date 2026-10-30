"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  fetchAuthCsrf,
  signInWithGoogle,
  type CustomerProfile,
} from "@/src/lib/api";
import styles from "./page.module.css";

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type GoogleSignInProps = {
  clientId: string;
};

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string>,
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

let gisScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is unavailable."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (gisScriptPromise) {
    return gisScriptPromise;
  }

  gisScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_SRC}"]`,
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Could not load Google sign-in.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });

  return gisScriptPromise;
}

function getSignInErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return "Sign-in failed. Please try again.";
}

async function signInWithFreshCsrf(credential: string): Promise<CustomerProfile> {
  let csrfToken = await fetchAuthCsrf();

  try {
    return await signInWithGoogle(credential, csrfToken);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 403) {
      csrfToken = await fetchAuthCsrf();
      return signInWithGoogle(credential, csrfToken);
    }

    throw error;
  }
}

export function GoogleSignIn({ clientId }: GoogleSignInProps) {
  const router = useRouter();
  const buttonHostRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const host = buttonHostRef.current;

    if (!host) {
      return undefined;
    }

    setScriptError(null);

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !buttonHostRef.current) {
          return;
        }

        const googleId = window.google?.accounts?.id;
        if (!googleId) {
          throw new Error("Could not load Google sign-in.");
        }

        host.replaceChildren();

        googleId.initialize({
          client_id: clientId,
          callback: (response) => {
            if (submittingRef.current) {
              return;
            }

            const credential = response.credential?.trim();
            if (!credential) {
              setActionError("Sign-in failed. Please try again.");
              return;
            }

            submittingRef.current = true;
            setLoading(true);
            setActionError(null);

            signInWithFreshCsrf(credential)
              .then(() => {
                router.push("/products");
              })
              .catch((error) => {
                setActionError(getSignInErrorMessage(error));
              })
              .finally(() => {
                submittingRef.current = false;
                setLoading(false);
              });
          },
        });

        googleId.renderButton(host, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setScriptError(getSignInErrorMessage(error));
        }
      });

    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel();
    };
  }, [clientId, router]);

  const statusMessage = loading
    ? "Signing you in…"
    : scriptError
      ? scriptError
      : actionError
        ? actionError
        : null;

  const statusClassName =
    scriptError || actionError ? styles.statusError : styles.statusMuted;

  return (
    <div className={styles.panel}>
      <h1>Sign in</h1>
      <p className={styles.intro}>
        Use your Google account to sign in. Your session is stored securely in a
        cookie after a successful sign-in.
      </p>
      <div
        className={styles.buttonHost}
        ref={buttonHostRef}
        aria-hidden={loading}
      />
      {statusMessage ? (
        <p
          className={`${styles.status} ${statusClassName}`}
          role={scriptError || actionError ? "alert" : "status"}
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}

function getConfiguredGoogleClientId(): string | null {
  const value = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return value ? value : null;
}

export function GoogleSignInEntry() {
  const clientId = getConfiguredGoogleClientId();

  if (!clientId) {
    return (
      <div className={styles.panel}>
        <h1>Sign in</h1>
        <p className={`${styles.status} ${styles.statusError}`} role="alert">
          Google sign-in is not configured. Set{" "}
          <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in your frontend environment,
          then reload this page.
        </p>
      </div>
    );
  }

  return <GoogleSignIn clientId={clientId} />;
}
