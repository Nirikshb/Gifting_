import { analyticsIsOpen } from "../runtime";

type ClarityStub = ((...args: unknown[]) => void) & { q?: unknown[][] };

let injected = false;

function projectId() {
  const id = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  if (!id || !/^[a-z0-9]{4,32}$/i.test(id)) return "";
  return id;
}

export function clarityReady() {
  return typeof window !== "undefined" && typeof window.clarity === "function";
}

export function startClarity() {
  if (typeof window === "undefined") return;
  const id = projectId();
  if (!id) return;

  if (!injected) {
    injected = true;
    const stub: ClarityStub = (...args) => {
      stub.q = stub.q || [];
      stub.q.push(args);
    };
    window.clarity = stub;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${id}`;
    document.head.appendChild(script);
  }

  window.clarity?.("consentv2", {
    ad_Storage: "denied",
    analytics_Storage: "granted",
  });
}

export function stopClarity() {
  try {
    window.clarity?.("consentv2", {
      ad_Storage: "denied",
      analytics_Storage: "denied",
    });
    window.clarity?.("consent", false);
  } catch {
    return;
  }
}

export function sendClarityEvent(name: string) {
  try {
    if (!analyticsIsOpen() || typeof window.clarity !== "function") return false;
    window.clarity("event", name);
    return true;
  } catch {
    return false;
  }
}
