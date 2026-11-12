"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart/CartProvider";
import styles from "./SiteHeader.module.css";

const links = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Process", href: "/process" },
  { label: "Style", href: "/style" },
  { label: "Shop", href: "/shop" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { count } = useCart();

  if (pathname === "/detail") return null;

  // Studio pages provide their own chrome; the storefront header would
  // duplicate navigation and break the admin layout.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <header
      className={open ? `${styles.header} ${styles.headerOpen}` : styles.header}
      style={{ viewTransitionName: "site-header" }}
    >
      <div className={styles.top}>
        <div className={styles.social}>
          <a href="/" aria-label="Facebook">
            <FacebookIcon />
          </a>
          <a href="/" aria-label="Instagram">
            <InstagramIcon />
          </a>
          <a href="/" aria-label="X">
            <XIcon />
          </a>
          <a href="/" aria-label="Pinterest">
            <PinterestIcon />
          </a>
        </div>
        <div className={styles.tools}>
          <Link href="/account" transitionTypes={["account"]}>
            <UserIcon />
            <span>Account</span>
          </Link>
          <Link href="/cart" transitionTypes={["curtain"]}>
            <CartIcon />
            <span>{count === null ? "Cart" : `Cart (${count})`}</span>
          </Link>
        </div>
      </div>
      <div className={styles.bar}>
        <Link className={styles.logo} href="/" transitionTypes={["curtain"]}>
          Aapulki
        </Link>
        <div className={styles.barEnd}>
          <nav className={open ? styles.navOpen : styles.nav} aria-label="Primary">
            {links.map((link) => {
              const current =
                link.href === "/process"
                  ? pathname === "/process"
                  : link.label === "About"
                    ? pathname === "/about"
                    : link.label === "Style"
                      ? pathname === "/style"
                      : link.label === "Shop"
                        ? pathname === "/shop"
                        : link.label === "Home" && pathname === "/";

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  transitionTypes={["curtain"]}
                  aria-current={current ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <button
            className={styles.menu}
            type="button"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 8.5h2.2V6h-2.1C12.2 6 11 7.2 11 9.1V11H9v2.6h2V21h3.2v-7.4h2.2l.4-2.6h-2.6V9.2c0-.5.3-.7.8-.7z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8 4.5h8A3.5 3.5 0 0 1 19.5 8v8a3.5 3.5 0 0 1-3.5 3.5H8A3.5 3.5 0 0 1 4.5 16V8A3.5 3.5 0 0 1 8 4.5zm0 1.6A1.9 1.9 0 0 0 6.1 8v8A1.9 1.9 0 0 0 8 17.9h8A1.9 1.9 0 0 0 17.9 16V8A1.9 1.9 0 0 0 16 6.1H8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM16.7 7.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5.2h3.1l3.2 4.5 3.6-4.5H19l-4.8 5.9L19.3 19h-3.1l-3.5-4.8L8.8 19H6.2l5.1-6.3L6 5.2z" />
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.5a7.5 7.5 0 0 0-2.7 14.5c-.1-.6-.2-1.6 0-2.3l1.2-5.1s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.8 3.4-.3 1.1.5 2 1.6 2 1.9 0 3.2-2.4 3.2-5.3 0-2.2-1.5-3.8-4.2-3.8-3 0-4.9 2.3-4.9 4.8 0 .9.3 1.8.7 2.4.1.1.1.2.1.3l-.3 1.1c-.1.3-.2.3-.4.2-1.4-.6-2-2.2-2-4 0-3 2.5-6.6 7.5-6.6 4 0 6.6 2.9 6.6 6 0 4.1-2.3 7.2-5.6 7.2-1.1 0-2.2-.6-2.6-1.3l-.7 2.7c-.2.8-.7 1.7-1.1 2.3A7.5 7.5 0 1 0 12 4.5z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M6.5 19c1.2-2.4 3.1-3.5 5.5-3.5S16.3 16.6 17.5 19" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7h12l-1 11H7L6 7z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

