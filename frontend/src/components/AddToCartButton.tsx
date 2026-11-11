"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart/CartProvider";
import styles from "./AddToCartButton.module.css";

type AddToCartButtonProps = {
  productId: number;
  stockQuantity: number;
};

const ADDED_NOTICE_MS = 2500;

export function AddToCartButton({ productId, stockQuantity }: AddToCartButtonProps) {
  const { addItem, pendingAction } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (addedTimerRef.current) {
        clearTimeout(addedTimerRef.current);
      }
    },
    [],
  );

  const busy = pendingAction !== null;
  const outOfStock = stockQuantity <= 0;
  const maxQuantity = Math.max(1, stockQuantity);

  function changeQuantity(next: number) {
    if (!Number.isInteger(next) || next < 1) return;
    setQuantity(Math.min(next, maxQuantity));
  }

  async function handleAdd() {
    if (busy || outOfStock) return;

    setError(null);
    const result = await addItem(productId, quantity);

    if (result.ok) {
      setAdded(true);
      if (addedTimerRef.current) {
        clearTimeout(addedTimerRef.current);
      }
      addedTimerRef.current = setTimeout(() => setAdded(false), ADDED_NOTICE_MS);
    } else {
      setError(result.message ?? "Could not add this item. Please try again.");
    }
  }

  if (outOfStock) {
    return (
      <div className={styles.wrap}>
        <p className={styles.outOfStock}>Out of stock</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <div className={styles.stepper}>
          <button
            className={styles.stepperButton}
            type="button"
            aria-label="Decrease quantity"
            disabled={busy || quantity <= 1}
            onClick={() => changeQuantity(quantity - 1)}
          >
            −
          </button>
          <span className={styles.stepperValue}>{quantity}</span>
          <button
            className={styles.stepperButton}
            type="button"
            aria-label="Increase quantity"
            disabled={busy || quantity >= maxQuantity}
            onClick={() => changeQuantity(quantity + 1)}
          >
            +
          </button>
        </div>
        <button
          className={styles.add}
          type="button"
          disabled={busy}
          onClick={() => void handleAdd()}
        >
          {added ? "Added ✓" : "Add to cart"}
        </button>
      </div>
      {added ? <p className={styles.added}>Added to your cart.</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
