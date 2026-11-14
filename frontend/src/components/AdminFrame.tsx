"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { initials } from "@/lib/orders/format";
import styles from "./admin.module.css";

type Gate =
  "checking" | "authorized" | "unauthenticated" | "forbidden" | "error";

type Profile = {
  displayName?: string;
  email?: string;
  role?: string;
};

const navigation = [
  { label: "Overview", href: "/admin" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Email", href: "/admin/email" },
];

function isCurrent(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [gate, setGate] = useState<Gate>("checking");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/auth/me")
      .then((data: Profile) => {
        if (cancelled) return;
        setProfile(data);
        setGate(data?.role === "admin" ? "authorized" : "forbidden");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const status =
          typeof error === "object" && error !== null && "statusCode" in error
            ? (error as { statusCode: unknown }).statusCode
            : 0;
        setGate(status === 401 ? "unauthenticated" : "error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => setMenuOpen(false));
  }, [pathname]);

  if (gate === "checking") {
    return (
      <div className={styles.gate}>
        <p className={styles.gateLabel}>Checking access…</p>
      </div>
    );
  }

  if (gate !== "authorized") {
    return (
      <div className={styles.gate}>
        <div className={styles.gateCard}>
          <p className={styles.gateEyebrow}>Aapulki studio</p>
          <h1 className={styles.gateTitle}>
            {gate === "unauthenticated"
              ? "Sign in required"
              : "Studio access only"}
          </h1>
          <p className={styles.gateText}>
            {gate === "unauthenticated"
              ? "This area is restricted to studio administrators. Sign in with an authorised account, then reload this page."
              : gate === "forbidden"
                ? "Your account does not have administrator access. If you believe this is a mistake, ask the store owner to grant the admin role."
                : "We could not verify your access right now. Please try again shortly."}
          </p>
          <div className={styles.gateActions}>
            <Link
              className={styles.gatePrimary}
              href="/account"
              transitionTypes={["account"]}
            >
              Go to account
            </Link>
            <Link className={styles.gateSecondary} href="/">
              Back to the shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile?.displayName ?? "Studio admin";

  return (
    <div className={styles.adminShell}>
      <div className={styles.mobileBar}>
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="studio-sidebar"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.menuIcon} aria-hidden="true" />
          <span className={styles.menuLabel}>
            {menuOpen ? "Close" : "Menu"}
          </span>
        </button>
        <Link className={styles.mobileBrand} href="/admin">
          Aapulki <span className={styles.logoBadge}>Studio</span>
        </Link>
      </div>

      {menuOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        id="studio-sidebar"
        className={
          menuOpen ? `${styles.sidebar} ${styles.sidebarOpen}` : styles.sidebar
        }
      >
        <div className={styles.sidebarInner}>
          <div className={styles.brand}>
            <Link className={styles.logo} href="/admin">
              Aapulki
            </Link>
            <span className={styles.logoBadge}>Studio</span>
          </div>

          <nav className={styles.sideNav} aria-label="Studio">
            {navigation.map((item) => {
              const current = isCurrent(item.href, pathname);

              return (
                <Link
                  key={item.href}
                  className={
                    current
                      ? `${styles.sideLink} ${styles.sideLinkCurrent}`
                      : styles.sideLink
                  }
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className={styles.sideFoot}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(displayName)}
            </span>
            <div className={styles.sideMeta}>
              <p className={styles.sideName}>{displayName}</p>
              <p className={styles.sideRole}>
                {profile?.email ?? "Administrator"}
              </p>
            </div>
            <Link
              className={styles.sideExit}
              href="/"
              transitionTypes={["curtain"]}
            >
              Back to shop
            </Link>
          </div>
        </div>
      </aside>

      <div className={styles.main}>{children}</div>
    </div>
  );
}
