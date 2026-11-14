import { AdminEmailView } from "@/components/AdminEmailView";

export const metadata = {
  title: "Email management",
  description: "Aapulki studio email management.",
  robots: { index: false, follow: false },
};

export default function AdminEmailPage() {
  return <AdminEmailView />;
}
