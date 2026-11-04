import { ViewTransition } from "react";
import styles from "./page.module.css";

export const metadata = {
  title: "Shop",
  description: "Shop Aapulki.",
};

export default function ShopPage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <div className={styles.pageFill}>
        <section className={styles.page}>
          <h1>Shop</h1>
          <p>Pieces for wrapping, boxing, and giving will live here.</p>
        </section>
      </div>
    </ViewTransition>
  );
}
