import { OrdersView } from "./OrdersView";

export const metadata = {
  title: "My orders",
  description: "Your Aapulki orders.",
};

export default function AccountOrdersPage() {
  return <OrdersView />;
}
