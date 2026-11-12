import type { ReactNode } from "react";
import { Figtree, Nunito } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import { SiteHeader } from "@/components/SiteHeader";
import { customFontVariables } from "@/lib/fonts";
import { CartProvider } from "@/lib/cart/CartProvider";
import { getSiteUrl, publicPageMetadata } from "@/lib/site-url";
import "./globals.css";
import styles from "./layout.module.css";

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

const description = "Aapulki. Continue to the shop.";
const siteUrl = getSiteUrl();

export const metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "Aapulki",
    template: "%s | Aapulki",
  },
  ...publicPageMetadata("Aapulki", description, "/"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${figtree.variable} ${customFontVariables}`}
    >
      <body>
        <CartProvider>
          <div className={styles.shell}>
            <SiteHeader />
            <main className={styles.main}>{children}</main>
          </div>
          <Analytics />
        </CartProvider>
      </body>
    </html>
  );
}
