import { analyticsIsOpen } from "../runtime";

let injected = false;

function measurementId() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return "";
  return id;
}

export function ga4Ready() {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

export function startGa4() {
  if (typeof window === "undefined") return;
  const id = measurementId();
  if (!id) return;

  if (!injected) {
    injected = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
    window.gtag("js", new Date());
    window.gtag("config", id, {
      send_page_view: false,
      debug_mode: process.env.NODE_ENV === "development",
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
  }

  window.gtag?.("consent", "update", { analytics_storage: "granted" });
}

export function stopGa4() {
  try {
    window.gtag?.("consent", "update", { analytics_storage: "denied" });
  } catch {
    return;
  }
}

export function sendGa4Event(name: string, params: Record<string, unknown>) {
  try {
    if (!analyticsIsOpen() || typeof window.gtag !== "function") return false;
    window.gtag("event", name, params);
    return true;
  } catch {
    return false;
  }
}
