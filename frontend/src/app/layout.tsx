import type { ReactNode } from "react";
import { Figtree, Nunito, Prata } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { customFontVariables } from "@/lib/fonts";
import "./globals.css";
import styles from "./layout.module.css";

const prata = Prata({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-prata",
});

const nunito = Nunito({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-nunito",
});

const figtree = Figtree({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const metadata = {
  title: "Gift Packaging",
  description: "Gift boxes, wrapping, and packaging for thoughtful presents.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${prata.variable} ${nunito.variable} ${figtree.variable} ${customFontVariables}`}
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
