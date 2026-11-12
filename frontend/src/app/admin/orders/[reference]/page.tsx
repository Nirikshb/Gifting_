import { AdminOrderDetail } from "@/components/AdminOrderDetail";

export const instant = false;

export const metadata = {
  title: "Order detail",
  description: "Aapulki studio order detail.",
  robots: { index: false, follow: false },
};

type AdminOrderDetailPageProps = {
  params: Promise<{ reference: string }>;
};

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  const { reference } = await params;

  return <AdminOrderDetail reference={reference} />;
}
