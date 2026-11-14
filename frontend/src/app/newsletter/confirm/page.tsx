import { Suspense } from "react";
import { ViewTransition } from "react";
import { NewsletterConfirmView } from "@/components/NewsletterConfirmView";
import { publicPageMetadata } from "@/lib/site-url";

export const metadata = {
  title: "Confirm subscription",
  ...publicPageMetadata(
    "Confirm subscription | Aapulki",
    "Confirm your Aapulki newsletter subscription.",
    "/newsletter/confirm",
  ),
  robots: { index: false, follow: false },
};

export default function NewsletterConfirmPage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <Suspense fallback={null}>
        <NewsletterConfirmView />
      </Suspense>
    </ViewTransition>
  );
}
