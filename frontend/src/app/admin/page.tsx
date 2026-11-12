import { AdminOverview } from "@/components/AdminOverview";

export const metadata = {
  title: "Overview",
  description: "Aapulki studio order overview.",
  robots: { index: false, follow: false },
};

export default function AdminOverviewPage() {
  return <AdminOverview />;
}
