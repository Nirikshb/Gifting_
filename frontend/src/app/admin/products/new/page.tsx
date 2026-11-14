import { AdminProductForm } from "@/components/AdminProductForm";

export const metadata = {
  title: "Add product",
  description: "Add a product to the Aapulki catalogue.",
  robots: { index: false, follow: false },
};

export default function AdminNewProductPage() {
  return <AdminProductForm mode="create" />;
}
