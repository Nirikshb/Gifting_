"use client";

import dynamic from "next/dynamic";
import { PageViews } from "@/lib/analytics/PageViews";

const AnalyticsConsent = dynamic(
  () => import("./AnalyticsConsent").then((module) => module.AnalyticsConsent),
  { ssr: false },
);

export function Analytics() {
  return (
    <>
      <PageViews />
      <AnalyticsConsent />
    </>
  );
}
