import { ViewTransition } from "react";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Cart",
  description: "Your Aapulki cart.",
};

export default function CartPage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <div className={styles.pageFill}>
        <section className={styles.page}>
          <div className={styles.intro}>
            <h1>Cart</h1>
            <p>
              Your cart is empty. Check out the{" "}
              <Link href="/" transitionTypes={["curtain"]}>
                home page
              </Link>
              .
            </p>
          </div>

          <div className={styles.layout}>
            <section className={styles.bag} aria-label="Bag">
              <h2>Bag (0)</h2>
              <div className={styles.empty}>
                <span className={styles.thumb} aria-hidden="true" />
                <p>No pieces in the bag yet.</p>
              </div>
            </section>

            <aside className={styles.summary}>
              <h2>Order summary</h2>
              <div className={styles.row}>
                <span>Items</span>
                <span>0</span>
              </div>
              <div className={styles.row}>
                <span>Subtotal</span>
                <span>0$</span>
              </div>
              <div className={styles.row}>
                <span>Shipping</span>
                <span>0$</span>
              </div>
              <div className={`${styles.row} ${styles.total}`}>
                <span>Total</span>
                <span>0$</span>
              </div>
              <Link className={styles.action} href="/" transitionTypes={["curtain"]}>
                Home page
              </Link>
            </aside>
          </div>
        </section>
      </div>
    </ViewTransition>
  );
}
