import { ViewTransition } from "react";
import { publicPageMetadata } from "@/lib/site-url";
import styles from "./page.module.css";

const description = "Aapulki makes packaging for gifts that are meant to be kept.";

export const metadata = {
  title: "About",
  ...publicPageMetadata("About | Aapulki", description, "/about"),
};

export default function AboutPage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <div className={styles.pageFill}>
        <section className={styles.page}>
          <h1>About</h1>
          <p>Aapulki makes packaging for gifts that are meant to be kept.</p>
        </section>
      </div>
    </ViewTransition>
  );
}
