import { AdminProductsView } from "@/components/AdminProductsView";

export const metadata = {
  title: "Products",
  description: "Aapulki studio product management.",
  robots: { index: false, follow: false },
};

export default function AdminProductsPage() {
  return <AdminProductsView />;
}
