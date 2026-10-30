"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApiError, fetchAuthMe, type CustomerProfile } from "@/src/lib/api";
import styles from "./layout.module.css";

type AccountState =
  | { status: "unknown" }
  | { status: "signedOut" }
  | { status: "signedIn"; profile: CustomerProfile };

export function SiteHeader() {
  const pathname = usePathname();
  const requestIdRef = useRef(0);
  const [account, setAccount] = useState<AccountState>({ status: "unknown" });

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    fetchAuthMe()
      .then((profile) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setAccount({ status: "signedIn", profile });
      })
      .catch((error: unknown) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        if (error instanceof ApiError && error.statusCode === 401) {
          setAccount({ status: "signedOut" });
          return;
        }

        setAccount({ status: "unknown" });
      });
  }, [pathname]);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/products">
          Gift Packaging
        </Link>
        <div className={styles.headerActions}>
          <Link className={styles.signIn} href="/cart">
            Cart
          </Link>
          {account.status === "signedIn" ? (
            <p className={styles.accountName}>{account.profile.displayName}</p>
          ) : null}
          {account.status === "signedOut" ? (
            <Link className={styles.signIn} href="/sign-in">
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
