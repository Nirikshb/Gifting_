import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { customFontVariables } from "@/src/lib/fonts";
import { SiteHeader } from "./SiteHeader";
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${customFontVariables}`}
    >
      <body>
        <div className={styles.shell}>
          <SiteHeader />
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
