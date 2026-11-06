"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ViewTransition } from "react";
import { api } from "@/lib/api";
import styles from "./account.module.css";

const tabs = [
  { label: "Profile", href: "/account", icon: "profile" },
  { label: "Wishlist", href: "/account/wishlist", icon: "heart" },
  { label: "My Order", href: "/account/orders", icon: "bag" },
  { label: "Saved Address", href: "/account/address", icon: "pin" },
  { label: "Change Password", href: "/account/password", icon: "key" },
  { label: "Logout", icon: "out" },
];

export function AccountFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/auth/me")
      .then((profile) => {
        if (cancelled || !profile || typeof profile.displayName !== "string") return;
        setName(profile.displayName);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    if (leaving) return;
    setLeaving(true);

    try {
      await api.post("/auth/logout", undefined);
      router.push("/");
    } catch {
      setLeaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <div>
          <p className={styles.hello}>{greeting()},</p>
          <h1 className={styles.name}>{name || "Account"}</h1>
        </div>
        <nav className={styles.tabs} aria-label="Account">
          {tabs.map((tab) => {
            const current = tab.href ? isCurrent(tab.href, pathname) : false;
            const className = current ? `${styles.tab} ${styles.tabCurrent}` : styles.tab;
            const content = (
              <>
                <TabIcon name={tab.icon} />
                <span>{tab.label}</span>
              </>
            );

            if (!tab.href) {
              return (
                <button
                  key={tab.label}
                  className={className}
                  type="button"
                  disabled={leaving}
                  onClick={logout}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={tab.label}
                className={className}
                href={tab.href}
                aria-current={current ? "page" : undefined}
                transitionTypes={["account"]}
              >
                {content}
              </Link>
            );
          })}
        </nav>
      </header>
      <ViewTransition name="account-panel" share="account" default="none">
        {children}
      </ViewTransition>
    </div>
  );
}

function isCurrent(href: string, pathname: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function TabIcon({ name }: { name: string }) {
  if (name === "profile") return <ProfileIcon />;
  if (name === "heart") return <HeartIcon />;
  if (name === "bag") return <BagIcon />;
  if (name === "pin") return <PinIcon />;
  if (name === "key") return <KeyIcon />;
  return <LogoutIcon />;
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M6.5 19c1.2-2.4 3.1-3.5 5.5-3.5S16.3 16.6 17.5 19" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19s-6.2-3.8-6.2-8A3.4 3.4 0 0 1 12 8.2 3.4 3.4 0 0 1 18.2 11c0 4.2-6.2 8-6.2 8z" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7h12l-1 11H7L6 7z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="12" r="3" />
      <path d="M11 12h9M17 12v3M14 12v2" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 7V5H6v14h4v-2" />
      <path d="M10 12h8M15 9l3 3-3 3" />
    </svg>
  );
}
