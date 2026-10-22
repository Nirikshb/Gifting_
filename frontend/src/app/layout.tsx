import type { ReactNode } from "react";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import styles from "./layout.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Gift Packaging",
  description: "Gift boxes, wrapping, and packaging for thoughtful presents.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <div className={styles.shell}>
          <header className={styles.header}>
            <Link className={styles.brand} href="/products">
              Gift Packaging
            </Link>
          </header>
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
