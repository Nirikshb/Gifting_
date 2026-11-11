import type { ReactNode } from "react";
import { AccountFrame } from "@/components/AccountFrame";
import styles from "@/components/account.module.css";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.pageFill}>
      <AccountFrame>{children}</AccountFrame>
    </div>
  );
}
