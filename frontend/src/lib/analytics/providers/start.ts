import { closeAnalytics, openAnalytics } from "../runtime";
import { clarityReady, startClarity, stopClarity } from "./clarity";
import { ga4Ready, startGa4, stopGa4 } from "./ga4";

export function syncProviders(consent: "granted" | "denied") {
  if (typeof window === "undefined") return;

  if (consent !== "granted") {
    stopGa4();
    stopClarity();
    closeAnalytics();
    return;
  }

  startGa4();
  startClarity();

  if (ga4Ready() || clarityReady()) {
    openAnalytics();
    return;
  }

  closeAnalytics();
}

export { clarityReady, ga4Ready };
