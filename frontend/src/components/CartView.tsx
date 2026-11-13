"use client";

import { useState } from "react";
import Link from "next/link";
import { formatInr, productImageUrl, productPath } from "@/lib/api/product-format";
import { useCart } from "@/lib/cart/CartProvider";
import styles from "./CartView.module.css";

const FREE_SHIPPING_GOAL = 499;

export function CartView() {
  const {
    cart,
    status,
    pendingAction,
    refresh,
    updateItem,
    removeItem,
    clearCartItems,
  } = useCart();
  const [notice, setNotice] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? "0.00";
  const shipping = cart?.shipping ?? "0.00";
  const total = cart?.total ?? subtotal;
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotalValue = Number.parseFloat(subtotal) || 0;
  const remaining = Math.max(0, FREE_SHIPPING_GOAL - subtotalValue);
  const progress = Math.min(100, (subtotalValue / FREE_SHIPPING_GOAL) * 100);
  const remainingText = Number.isInteger(remaining)
    ? `â‚¹${remaining}`
    : `â‚¹${remaining.toFixed(2)}`;
  const subtotalText = formatInr(subtotal) ?? `â‚¹${subtotal}`;
  const shippingText =
    Number.parseFloat(shipping) === 0
      ? "Free"
      : (formatInr(shipping) ?? `â‚¹${shipping}`);
  const totalText = formatInr(total) ?? `â‚¹${total}`;
  const busy = pendingAction !== null;
  const loading = status === "loading" && cart === null;
  const failed = status === "error" && cart === null;

  async function handleUpdate(productId: number, quantity: number) {
    setNotice(null);
    const result = await updateItem(productId, quantity);
    if (!result.ok) {
      setNotice(result.message ?? "Could not update this item. Please try again.");
    }
  }

  async function handleRemove(productId: number) {
    setNotice(null);
    const result = await removeItem(productId);
    if (!result.ok) {
      setNotice(result.message ?? "Could not remove this item. Please try again.");
    }
  }

  async function handleClear() {
    setNotice(null);
    const result = await clearCartItems();
    if (!result.ok) {
      setNotice(result.message ?? "Could not clear the bag. Please try again.");
    }
  }

  return (
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
              aria-valuemax={FREE_SHIPPING_GOAL}
              aria-valuenow={Math.min(subtotalValue, FREE_SHIPPING_GOAL)}
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
        </div>

        <div className={styles.layout}>
          <section className={styles.bag} aria-label="Bag">
            <div className={styles.bagHead}>
              <h2>Bag ({itemCount})</h2>
              {items.length > 0 ? (
                <button
                  className={styles.clear}
                  type="button"
                  disabled={busy}
                  onClick={() => void handleClear()}
                >
                  Clear bag
                </button>
              ) : null}
            </div>

            {notice ? (
              <p className={styles.notice} role="alert">
                {notice}
              </p>
            ) : null}

            {loading ? <p className={styles.loading}>Loading your bagâ€¦</p> : null}

            {failed ? (
              <div className={styles.errorState}>
                <p>Your bag could not be loaded right now.</p>
                <button
                  className={styles.retry}
                  type="button"
                  onClick={() => void refresh()}
                >
                  Try again
                </button>
              </div>
            ) : null}

            {!loading && !failed && items.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.thumb} aria-hidden="true" />
                <p>
                  No pieces in the bag yet. Browse the <Link href="/shop">shop</Link>.
                </p>
              </div>
            ) : null}

            {items.length > 0 ? (
              <ul className={styles.items}>
                {items.map((item) => {
                  const href = productPath(item.slug);
                  const image = productImageUrl(item.imageUrl);
                  const unitPrice = formatInr(item.unitPrice) ?? `â‚¹${item.unitPrice}`;
                  const seenPrice = formatInr(item.seenUnitPrice) ?? `â‚¹${item.seenUnitPrice}`;
                  const lineTotal = formatInr(item.lineTotal) ?? `â‚¹${item.lineTotal}`;
                  const increaseDisabled = busy || item.quantity >= item.stockQuantity;

                  return (
                    <li className={styles.item} key={item.productId}>
                      {href ? (
                        <Link className={styles.photo} href={href}>
                          {image ? (
                            <img src={image} alt={item.name} />
                          ) : (
                            <span className={styles.thumb} aria-hidden="true" />
                          )}
                        </Link>
                      ) : (
                        <span className={styles.photo} aria-hidden="true">
                          {image ? <img src={image} alt="" /> : null}
                        </span>
                      )}

                      <div className={styles.info}>
                        {href ? (
                          <Link className={styles.name} href={href}>
                            {item.name}
                          </Link>
                        ) : (
                          <span className={styles.name}>{item.name}</span>
                        )}
                        <p className={styles.unit}>
                          {unitPrice}
                          {item.priceChanged ? (
                            <s className={styles.oldPrice}>{seenPrice}</s>
                          ) : null}
                        </p>
                        {item.requiresAttention && item.attentionMessage ? (
                          <p className={styles.warn}>{item.attentionMessage}</p>
                        ) : null}
                        <div className={styles.controls}>
                          <div className={styles.qty}>
                            <button
                              className={styles.qtyButton}
                              type="button"
                              aria-label={`Decrease quantity of ${item.name}`}
                              disabled={busy || item.quantity <= 1}
                              onClick={() => void handleUpdate(item.productId, item.quantity - 1)}
                            >
                              âˆ’
                            </button>
                            <span className={styles.qtyValue} aria-live="polite">
                              {item.quantity}
                            </span>
                            <button
                              className={styles.qtyButton}
                              type="button"
                              aria-label={`Increase quantity of ${item.name}`}
                              disabled={increaseDisabled}
                              onClick={() => void handleUpdate(item.productId, item.quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                          <button
                            className={styles.remove}
                            type="button"
                            disabled={busy}
                            onClick={() => void handleRemove(item.productId)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <p className={styles.lineTotal}>{lineTotal}</p>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>

          <aside className={styles.summary}>
            <h2>Order summary</h2>
            <div className={styles.row}>
              <span>Items</span>
              <span>{itemCount}</span>
            </div>
            <div className={styles.row}>
              <span>Subtotal</span>
              <span>{subtotalText}</span>
            </div>
            <div className={styles.row}>
              <span>Shipping</span>
              <span>{shippingText}</span>
            </div>
            <div className={`${styles.row} ${styles.total}`}>
              <span>Total</span>
              <span>{totalText}</span>
            </div>
            {items.length > 0 ? (
              <>
                <Link
                  className={styles.action}
                  href="/checkout"
                  transitionTypes={["curtain"]}
                >
                  Checkout
                </Link>
                <Link className={styles.secondary} href="/shop">
                  Continue shopping
                </Link>
              </>
            ) : (
              <Link
                className={styles.action}
                href="/"
                transitionTypes={["curtain"]}
              >
                Home page
              </Link>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 72 40">
      <path
        fill="var(--background)"
        stroke="var(--muted)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M3 11h36v16H3z"
      />
      <path
        fill="var(--background)"
        stroke="var(--muted)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M39 16h13l12 9v2H39z"
      />
      <circle cx="18" cy="30" r="4.2" fill="var(--background)" stroke="var(--muted)" strokeWidth="1.8" />
      <circle cx="54" cy="30" r="4.2" fill="var(--background)" stroke="var(--muted)" strokeWidth="1.8" />
      <circle cx="18" cy="30" r="1.4" fill="var(--muted)" />
      <circle cx="54" cy="30" r="1.4" fill="var(--muted)" />
    </svg>
  );
}

