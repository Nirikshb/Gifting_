import { CustomerOrderDetail } from "@/components/CustomerOrderDetail";

export const instant = false;

export const metadata = {
  title: "Order details",
  description: "Your Aapulki order details.",
  robots: { index: false, follow: false },
};

type AccountOrderDetailPageProps = {
  params: Promise<{ reference: string }>;
};

export default async function AccountOrderDetailPage({
  params,
}: AccountOrderDetailPageProps) {
  const { reference } = await params;

  return <CustomerOrderDetail reference={reference} />;
}
