"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, createOrder } from "@/src/lib/api";
import {
  cartSubtotal,
  clearCart,
  readCart,
  type CartItem,
} from "@/src/lib/cart";
import { formatProductPrice } from "@/src/lib/product-display";
import styles from "./page.module.css";

type CheckoutFields = {
  customerName: string;
  customerEmail: string;
  deliveryLine1: string;
  deliveryLine2: string;
  deliveryCity: string;
  deliveryPostcode: string;
  deliveryCountry: string;
};

const emptyFields: CheckoutFields = {
  customerName: "",
  customerEmail: "",
  deliveryLine1: "",
  deliveryLine2: "",
  deliveryCity: "",
  deliveryPostcode: "",
  deliveryCountry: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [fields, setFields] = useState<CheckoutFields>(emptyFields);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setItems(readCart());
  }, []);

  function updateField(name: keyof CheckoutFields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items || items.length === 0 || submitting) {
      return;
    }

    const customerName = fields.customerName.trim();
    const customerEmail = fields.customerEmail.trim();
    const deliveryLine1 = fields.deliveryLine1.trim();
    const deliveryLine2 = fields.deliveryLine2.trim();
    const deliveryCity = fields.deliveryCity.trim();
    const deliveryPostcode = fields.deliveryPostcode.trim();
    const deliveryCountry = fields.deliveryCountry.trim();

    if (
      !customerName ||
      !customerEmail ||
      !deliveryLine1 ||
      !deliveryCity ||
      !deliveryPostcode ||
      !deliveryCountry
    ) {
      setError("Fill in every required field.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const order = await createOrder({
        customerName,
        customerEmail,
        deliveryLine1,
        deliveryLine2: deliveryLine2 || undefined,
        deliveryCity,
        deliveryPostcode,
        deliveryCountry,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
      clearCart();
      router.push(`/orders/${order.orderReference}`);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The order could not be placed. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (items === null) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1>Checkout</h1>
          <p className={styles.muted}>Loading your cart…</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1>Checkout</h1>
          <p className={styles.muted}>
            Your cart is empty. <Link href="/products">Browse products</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1>Checkout</h1>
        <div className={styles.layout}>
          <form className={styles.form} onSubmit={onSubmit}>
            <label>
              Name
              <input
                value={fields.customerName}
                maxLength={150}
                onChange={(event) => updateField("customerName", event.target.value)}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={fields.customerEmail}
                maxLength={255}
                onChange={(event) => updateField("customerEmail", event.target.value)}
                required
              />
            </label>
            <label>
              Address line 1
              <input
                value={fields.deliveryLine1}
                maxLength={200}
                onChange={(event) => updateField("deliveryLine1", event.target.value)}
                required
              />
            </label>
            <label>
              Address line 2
              <input
                value={fields.deliveryLine2}
                maxLength={200}
                onChange={(event) => updateField("deliveryLine2", event.target.value)}
              />
            </label>
            <label>
              City
              <input
                value={fields.deliveryCity}
                maxLength={100}
                onChange={(event) => updateField("deliveryCity", event.target.value)}
                required
              />
            </label>
            <label>
              Postcode
              <input
                value={fields.deliveryPostcode}
                maxLength={20}
                onChange={(event) =>
                  updateField("deliveryPostcode", event.target.value)
                }
                required
              />
            </label>
            <label>
              Country
              <input
                value={fields.deliveryCountry}
                maxLength={100}
                onChange={(event) =>
                  updateField("deliveryCountry", event.target.value)
                }
                required
              />
            </label>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={submitting}>
              {submitting ? "Placing order…" : "Place order"}
            </button>
          </form>
          <aside className={styles.summary}>
            <h2>Order summary</h2>
            <ul>
              {items.map((item) => (
                <li key={item.productId}>
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>
                    {formatProductPrice(
                      cartSubtotal([{ ...item }]),
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.total}>
              Total {formatProductPrice(cartSubtotal(items))}
            </p>
            <p className={styles.muted}>Payment is not taken yet. The order stays unpaid.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
