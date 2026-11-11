import { ProfilePanel } from "@/components/ProfilePanel";

export const metadata = {
  title: "Profile",
  description: "Your Aapulki profile.",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfilePanel />;
}
