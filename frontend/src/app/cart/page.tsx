import { ViewTransition } from "react";
import { CartView } from "@/components/CartView";

export const metadata = {
  title: "Cart",
  description: "Your Aapulki cart.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <CartView />
    </ViewTransition>
  );
}
