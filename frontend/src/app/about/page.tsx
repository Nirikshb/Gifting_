import { ViewTransition } from "react";
import styles from "./page.module.css";

export const metadata = {
  title: "About",
  description: "About Aapulki.",
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
