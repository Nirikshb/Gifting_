import { ViewTransition } from "react";
import { SwarmCursor } from "@/components/SwarmCursor";
import styles from "./page.module.css";

export const metadata = {
  title: "Shop",
  description: "Shop Aapulki.",
};

export default function ShopPage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <SwarmCursor className={styles.pageFill} count={1520} lightMode>
        <section className={styles.page}>
          <h1>Shop</h1>
          <p>Pieces for wrapping, boxing, and giving will live here.</p>
        </section>
      </SwarmCursor>
    </ViewTransition>
  );
}
