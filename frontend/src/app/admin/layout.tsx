import type { ReactNode } from "react";
import { AdminFrame } from "@/components/AdminFrame";

export const metadata = {
  title: {
    default: "Studio",
    template: "%s | Aapulki Studio",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminFrame>{children}</AdminFrame>;
}
