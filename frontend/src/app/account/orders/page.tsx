import { OrdersView } from "@/components/OrdersView";

export const metadata = {
  title: "My orders",
  description: "Your Aapulki orders.",
  robots: { index: false, follow: false },
};

export default function AccountOrdersPage() {
  return <OrdersView />;
}
