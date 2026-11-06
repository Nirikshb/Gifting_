const STORAGE_KEY = "gp_analytics_consent";

export type AnalyticsConsentChoice = "unknown" | "granted" | "denied";

const listeners = new Set<() => void>();
let memory: AnalyticsConsentChoice | null = null;

export function readConsent(): AnalyticsConsentChoice {
  if (memory === "granted" || memory === "denied") return memory;
  if (typeof window === "undefined") return "unknown";

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "granted" || value === "denied") {
      memory = value;
      return value;
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

export function grantConsent() {
  write("granted");
}

export function denyConsent() {
  write("denied");
}

export function subscribeConsent(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function write(choice: "granted" | "denied") {
  memory = choice;

  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    memory = choice;
  }

  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      return;
    }
  });
}
