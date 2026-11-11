import { ViewTransition } from "react";
import { CheckoutView } from "@/components/CheckoutView";

export const metadata = {
  title: "Checkout",
  description: "Complete your Aapulki order.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <CheckoutView />
    </ViewTransition>
  );
}
