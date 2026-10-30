"use client";

import { useState } from "react";
import Link from "next/link";
import { addProductToCart, type CartProduct } from "@/src/lib/cart";
import styles from "./page.module.css";

type AddToCartButtonProps = {
  product: CartProduct;
};

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const [note, setNote] = useState("");
  const inStock = product.stockQuantity > 0;

  return (
    <div className={styles.cartAction}>
      <button
        type="button"
        className={styles.addButton}
        disabled={!inStock}
        onClick={() => {
          const result = addProductToCart(product);
          setNote(
            result.added
              ? "Added to cart."
              : "That is all the stock we can add right now.",
          );
        }}
      >
        Add to cart
      </button>
      {note ? (
        <p className={styles.cartNote}>
          {note}{" "}
          <Link href="/cart">View cart</Link>
        </p>
      ) : null}
    </div>
  );
}
