import { ViewTransition } from "react";
import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <div className={styles.pageFill}>
        <section className={styles.page}>
          <h1>Page not found</h1>
          <p>This page is not available.</p>
          <div className={styles.links}>
            <Link href="/">Home</Link>
            <Link href="/shop">Shop</Link>
          </div>
        </section>
      </div>
    </ViewTransition>
  );
}
