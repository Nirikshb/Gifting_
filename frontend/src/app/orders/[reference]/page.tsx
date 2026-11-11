import { ViewTransition } from "react";
import { OrderConfirmation } from "@/components/OrderConfirmation";

// The confirmation link carries a one-time token in the query string, so the
// route renders per request instead of prerendering.
export const instant = false;

export const metadata = {
  title: "Order confirmation",
  description: "Your Aapulki order confirmation.",
  robots: { index: false, follow: false },
};

type OrderConfirmationPageProps = {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: OrderConfirmationPageProps) {
  const { reference } = await params;
  const { token } = await searchParams;
  const confirmationToken = typeof token === "string" && token ? token : null;

  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <OrderConfirmation reference={reference} token={confirmationToken} />
    </ViewTransition>
  );
}
