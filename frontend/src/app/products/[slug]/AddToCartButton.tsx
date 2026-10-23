"use client";

import { useState } from "react";
import styles from "./page.module.css";

type AddToCartButtonProps = {
  inStock: boolean;
};

export function AddToCartButton({ inStock }: AddToCartButtonProps) {
  const [note, setNote] = useState("");

  return (
    <div className={styles.cartAction}>
      <button
        type="button"
        className={styles.addButton}
        disabled={!inStock}
        onClick={() => {
          setNote("The cart is not available yet.");
        }}
      >
        Add to cart
      </button>
      {note ? <p className={styles.cartNote}>{note}</p> : null}
    </div>
  );
}
