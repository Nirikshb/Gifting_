import { AdminProductForm } from "@/components/AdminProductForm";

export const instant = false;

export const metadata = {
  title: "Edit product",
  description: "Edit a product in the Aapulki catalogue.",
  robots: { index: false, follow: false },
};

type AdminProductEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminProductEditPage({
  params,
}: AdminProductEditPageProps) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return null;
  }

  return <AdminProductForm mode="edit" productId={productId} />;
}
