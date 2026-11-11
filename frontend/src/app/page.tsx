import { ViewTransition } from "react";
import Link from "next/link";
import { publicPageMetadata } from "@/lib/site-url";
import styles from "./page.module.css";

const description = "Aapulki. Continue to the shop.";

export const metadata = {
  title: { absolute: "Aapulki" },
  ...publicPageMetadata("Aapulki", description, "/"),
};

export default function Home() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <div className={styles.pageFill}>
        <section className={styles.page}>
          <Link className={styles.link} href="/shop" transitionTypes={["curtain"]}>
            Shop
          </Link>
        </section>
      </div>
    </ViewTransition>
  );
}
