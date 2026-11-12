import { AdminOrdersView } from "@/components/AdminOrdersView";

export const metadata = {
  title: "Orders",
  description: "Aapulki studio order management.",
  robots: { index: false, follow: false },
};

export default function AdminOrdersPage() {
  return <AdminOrdersView />;
}
