import { ProfilePanel } from "./ProfilePanel";

export const metadata = {
  title: "Profile",
  description: "Your Aapulki profile.",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfilePanel />;
}
