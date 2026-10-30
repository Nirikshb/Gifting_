"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  cartSubtotal,
  readCart,
  removeCartItem,
  updateCartQuantity,
  type CartItem,
} from "@/src/lib/cart";
import { formatProductPrice } from "@/src/lib/product-display";
import styles from "./page.module.css";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[] | null>(null);

  useEffect(() => {
    setItems(readCart());
  }, []);

  if (items === null) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1>Cart</h1>
          <p className={styles.muted}>Loading your cart…</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1>Cart</h1>
          <div className={styles.panel}>
            <p>Your cart is empty.</p>
            <p>
              <Link href="/products">Browse products</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1>Cart</h1>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.productId} className={styles.line}>
              <div>
                <Link href={`/products/${item.slug}`}>{item.name}</Link>
                <p className={styles.muted}>{formatProductPrice(item.price)}</p>
              </div>
              <label className={styles.qty}>
                Quantity
                <input
                  type="number"
                  min={1}
                  max={item.stockQuantity > 0 ? item.stockQuantity : undefined}
                  value={item.quantity}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isInteger(next)) {
                      return;
                    }
                    setItems(updateCartQuantity(item.productId, next));
                  }}
                />
              </label>
              <button
                type="button"
                className={styles.remove}
                onClick={() => setItems(removeCartItem(item.productId))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.total}>
          Total {formatProductPrice(cartSubtotal(items))}
        </p>
        <p>
          <Link className={styles.checkout} href="/checkout">
            Continue to checkout
          </Link>
        </p>
      </div>
    </div>
  );
}
