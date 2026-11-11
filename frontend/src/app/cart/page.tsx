import { ViewTransition } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const freeShippingGoal = 499;
const subtotal = 0;
const remaining = Math.max(0, freeShippingGoal - subtotal);
const progress = Math.min(100, (subtotal / freeShippingGoal) * 100);
const remainingText = Number.isInteger(remaining)
  ? `₹${remaining}`
  : `₹${remaining.toFixed(2)}`;

export const metadata = {
  title: "Cart",
  description: "Your Aapulki cart.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <div className={styles.pageFill}>
        <section className={styles.page}>
          <div className={styles.intro}>
            <h1>Cart</h1>
            <div className={styles.shipping}>
              <p>
                {remaining > 0 ? (
                  <>
                    Shop for {remainingText} more to enjoy <strong>FREE Shipping</strong>
                  </>
                ) : (
                  <>
                    You enjoy <strong>FREE Shipping</strong>
                  </>
                )}
              </p>
              <div
                className={styles.meter}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={freeShippingGoal}
                aria-valuenow={Math.min(subtotal, freeShippingGoal)}
                aria-label={
                  remaining > 0
                    ? `Shop for ${remainingText} more for free shipping`
                    : "Free shipping unlocked"
                }
              >
                <div className={styles.track}>
                  <div className={styles.fill} style={{ width: `${progress}%` }} />
                </div>
                <span
                  className={styles.truck}
                  style={{ left: `clamp(22px, ${progress}%, calc(100% - 22px))` }}
                  aria-hidden="true"
                >
                  <TruckIcon />
                </span>
              </div>
            </div>
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
                <span>₹0</span>
              </div>
              <div className={styles.row}>
                <span>Shipping</span>
                <span>₹0</span>
              </div>
              <div className={`${styles.row} ${styles.total}`}>
                <span>Total</span>
                <span>₹0</span>
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

function TruckIcon() {
  return (
    <svg viewBox="0 0 72 40">
      <path
        fill="#f7f4ee"
        stroke="#8a8a8a"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M3 11h36v16H3z"
      />
      <path
        fill="#f7f4ee"
        stroke="#8a8a8a"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M39 16h13l12 9v2H39z"
      />
      <circle cx="18" cy="30" r="4.2" fill="#f7f4ee" stroke="#8a8a8a" strokeWidth="1.8" />
      <circle cx="54" cy="30" r="4.2" fill="#f7f4ee" stroke="#8a8a8a" strokeWidth="1.8" />
      <circle cx="18" cy="30" r="1.4" fill="#8a8a8a" />
      <circle cx="54" cy="30" r="1.4" fill="#8a8a8a" />
    </svg>
  );
}
