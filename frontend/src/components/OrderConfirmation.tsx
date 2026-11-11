"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOrderConfirmation, type CheckoutOrder } from "@/lib/api/orders";
import { formatInr } from "@/lib/api/product-format";
import styles from "./OrderConfirmation.module.css";

type Status = "loading" | "ready" | "error";

const ORDER_STATUS_LABELS: Record<CheckoutOrder["orderStatus"], string> = {
  pending: "Order received",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

const PAYMENT_STATUS_LABELS: Record<CheckoutOrder["paymentStatus"], string> = {
  unpaid: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
};

type OrderConfirmationProps = {
  reference: string;
  token: string | null;
};

function money(value: string) {
  return formatInr(value) ?? `₹${value}`;
}

function shippingLabel(value: string) {
  return Number.parseFloat(value) === 0 ? "Free" : money(value);
}

export function OrderConfirmation({ reference, token }: OrderConfirmationProps) {
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    getOrderConfirmation(reference, token)
      .then((data) => {
        if (cancelled) return;
        setOrder(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reference, token]);

  if (status === "loading") {
    return (
      <div className={styles.pageFill}>
        <section className={styles.page}>
          <p className={styles.loading}>Loading your order…</p>
        </section>
      </div>
    );
  }

  if (status === "error" || !order) {
    return (
      <div className={styles.pageFill}>
        <section className={styles.page}>
          <h1 className={styles.errorTitle}>Order not found</h1>
          <p className={styles.errorText}>
            We could not find this order. The confirmation link may be
            incomplete or no longer valid.
          </p>
          <div className={styles.errorActions}>
            <Link className={styles.action} href="/shop">
              Browse the shop
            </Link>
            <Link className={styles.secondary} href="/">
              Back home
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const formattedDate = new Date(order.createdAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className={styles.pageFill}>
      <section className={styles.page}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Order confirmation</p>
          <h1>Thank you for your order</h1>
          <p className={styles.lead}>
            We have recorded your order. Keep this page or your reference handy
            for any questions.
          </p>
        </div>

        <div className={styles.meta}>
          <div>
            <p className={styles.metaLabel}>Order reference</p>
            <p className={styles.reference}>{order.orderReference}</p>
          </div>
          <div>
            <p className={styles.metaLabel}>Placed</p>
            <p className={styles.metaValue}>{formattedDate}</p>
          </div>
          <div className={styles.statuses}>
            <span className={styles.statusChip}>
              {ORDER_STATUS_LABELS[order.orderStatus]}
            </span>
            <span className={styles.paymentChip}>
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </span>
          </div>
        </div>

        <div className={styles.layout}>
          <div className={styles.column}>
            <section className={styles.card}>
              <h2>Items</h2>
              <ul className={styles.items}>
                {order.items.map((item, index) => (
                  <li className={styles.item} key={`${item.productSlug}-${index}`}>
                    <span className={styles.itemName}>
                      {item.productName}
                      <span className={styles.itemQty}> × {item.quantity}</span>
                    </span>
                    <span className={styles.itemPrice}>
                      {money(item.unitPrice)}
                    </span>
                    <span className={styles.itemTotal}>
                      {money(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className={styles.row}>
                <span>Subtotal</span>
                <span>{money(order.subtotal)}</span>
              </div>
              <div className={styles.row}>
                <span>Shipping</span>
                <span>{shippingLabel(order.shipping)}</span>
              </div>
              <div className={`${styles.row} ${styles.total}`}>
                <span>Total</span>
                <span>{money(order.totalAmount)}</span>
              </div>
              {order.paymentStatus === "unpaid" ? (
                <p className={styles.paymentNote}>
                  No payment has been collected. This order is recorded as
                  unpaid until payment is arranged.
                </p>
              ) : null}
            </section>

            <section className={styles.card}>
              <h2>Customer</h2>
              <dl className={styles.details}>
                <div>
                  <dt>Name</dt>
                  <dd>{order.customerName}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{order.customerEmail}</dd>
                </div>
                <div>
                  <dt>Recipient</dt>
                  <dd>{order.recipientName ?? order.customerName}</dd>
                </div>
              </dl>
            </section>

            <section className={styles.card}>
              <h2>Delivery</h2>
              <address className={styles.address}>
                <span>{order.recipientName ?? order.customerName}</span>
                <span>{order.delivery.line1}</span>
                {order.delivery.line2 ? <span>{order.delivery.line2}</span> : null}
                <span>
                  {order.delivery.city}, {order.delivery.postcode}
                </span>
                <span>{order.delivery.country}</span>
              </address>
            </section>

            {order.giftMessage ? (
              <section className={styles.card}>
                <h2>Gift message</h2>
                <p className={styles.giftMessage}>{order.giftMessage}</p>
              </section>
            ) : null}
          </div>

          <aside className={styles.aside}>
            <section className={styles.card}>
              <h2>What happens next</h2>
              <p className={styles.nextText}>
                We have reserved your items. Payment and delivery details will
                be arranged separately; no payment was taken on this site.
              </p>
              <Link className={styles.action} href="/shop">
                Continue shopping
              </Link>
              <Link className={styles.secondary} href="/">
                Back home
              </Link>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
