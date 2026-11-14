import { Suspense } from "react";
import { ViewTransition } from "react";
import { NewsletterUnsubscribeView } from "@/components/NewsletterUnsubscribeView";
import { publicPageMetadata } from "@/lib/site-url";

export const metadata = {
  title: "Unsubscribe",
  ...publicPageMetadata(
    "Unsubscribe | Aapulki",
    "Unsubscribe from the Aapulki newsletter.",
    "/newsletter/unsubscribe",
  ),
  robots: { index: false, follow: false },
};

export default function NewsletterUnsubscribePage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <Suspense fallback={null}>
        <NewsletterUnsubscribeView />
      </Suspense>
    </ViewTransition>
  );
}
