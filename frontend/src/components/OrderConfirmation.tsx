"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOrderConfirmation, type CheckoutOrder } from "@/lib/api/orders";
import {
  formatOrderDateTime,
  money,
  paymentStatusNote,
  shippingLabel,
} from "@/lib/orders/format";
import { OrderStatusBadge, PaymentStatusBadge } from "./orders/OrderBadges";
import styles from "./OrderConfirmation.module.css";

type Status = "loading" | "ready" | "error";

type OrderConfirmationProps = {
  reference: string;
  token: string | null;
};

export function OrderConfirmation({ reference, token }: OrderConfirmationProps) {
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

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

  if (token && status === "loading") {
    return (
      <div className={styles.pageFill}>
        <section className={styles.page}>
          <p className={styles.loading}>Loading your order…</p>
        </section>
      </div>
    );
  }

  if (!token || status === "error" || !order) {
    return (
      <div className={styles.pageFill}>
        <section className={styles.page}>
          <div className={styles.stateCard}>
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
          </div>
        </section>
      </div>
    );
  }

  const formattedDate = formatOrderDateTime(order.createdAt);
  const totalItems = order.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className={styles.pageFill}>
      <section className={styles.page}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Order confirmation</p>
          <h1>
            {order.orderStatus === "cancelled"
              ? "This order was cancelled"
              : "Thank you for your order"}
          </h1>
          <p className={styles.lead}>
            {order.orderStatus === "cancelled"
              ? "Here is the record of the order and its cancellation. Keep the reference below for any questions."
              : "Here is your receipt. Keep this page or the reference below handy for any questions about your order."}
          </p>
        </div>

        <article className={styles.ticket}>
          <header className={styles.ticketHead}>
            <div className={styles.brand}>
              <p className={styles.brandName}>Aapulki</p>
              <p className={styles.brandTag}>Order receipt</p>
            </div>
            <dl className={styles.ticketMeta}>
              <div>
                <dt>Reference</dt>
                <dd className={styles.reference}>{order.orderReference}</dd>
              </div>
              <div>
                <dt>Placed</dt>
                <dd>{formattedDate}</dd>
              </div>
              <div>
                <dt>Items</dt>
                <dd>
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </dd>
              </div>
            </dl>
            <div className={styles.statuses}>
              <OrderStatusBadge status={order.orderStatus} />
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
          </header>

          <div className={styles.perforation} aria-hidden="true">
            <span />
          </div>

          <div className={styles.ticketBody}>
            <div className={styles.main}>
              <section className={styles.section}>
                <h2>Items</h2>
                <ul className={styles.items}>
                  {order.items.map((item, index) => (
                    <li className={styles.item} key={`${item.productSlug}-${index}`}>
                      <span className={styles.itemName}>
                        {item.productName}
                        <span className={styles.itemQty}>
                          {money(item.unitPrice)} × {item.quantity}
                        </span>
                      </span>
                      <span className={styles.itemTotal}>
                        {money(item.lineTotal)}
                      </span>
                    </li>
                  ))}
                </ul>

                <dl className={styles.totals}>
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{money(order.subtotal)}</dd>
                  </div>
                  <div>
                    <dt>Shipping</dt>
                    <dd>{shippingLabel(order.shipping)}</dd>
                  </div>
                  <div className={styles.grandTotal}>
                    <dt>Total</dt>
                    <dd>{money(order.totalAmount)}</dd>
                  </div>
                </dl>

                <p className={styles.paymentNote}>
                  {order.paymentStatus === "unpaid"
                    ? "No payment has been collected yet. This order is recorded as unpaid until payment is arranged."
                    : paymentStatusNote(order.paymentStatus)}
                </p>
              </section>
            </div>

            <aside className={styles.aside}>
              <section className={styles.section}>
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

              <section className={styles.section}>
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
                <section className={styles.section}>
                  <h2>Gift message</h2>
                  <p className={styles.giftMessage}>{order.giftMessage}</p>
                </section>
              ) : null}
            </aside>
          </div>

          <div className={styles.perforation} aria-hidden="true">
            <span />
          </div>

          <footer className={styles.ticketFoot}>
            <div className={styles.actions}>
              <Link className={styles.action} href="/shop">
                Continue shopping
              </Link>
              <Link className={styles.secondary} href="/">
                Back home
              </Link>
            </div>
            <div className={styles.stub}>
              <Barcode value={order.orderReference} />
              <p className={styles.barcodeLabel}>{order.orderReference}</p>
              <p className={styles.stubNote}>
                Created with your account? Sign in to follow its progress and
                cancel while it is still unfulfilled.
              </p>
            </div>
          </footer>
        </article>

        <p className={styles.footNote}>
          No payment was taken on this site. Payment and delivery details are
          arranged separately by the studio.
        </p>
      </section>
    </div>
  );
}

function Barcode({ value }: { value: string }) {
  const characters = value.replace(/[^A-Za-z0-9]/g, "").split("");

  return (
    <div className={styles.barcode} aria-hidden="true">
      {characters.slice(0, 26).map((character, index) => {
        const code = character.charCodeAt(0);
        return (
          <span
            key={`${character}-${index}`}
            style={{
              width: `${(code % 3) + 1}px`,
              height: `${26 + (code % 14)}px`,
            }}
          />
        );
      })}
    </div>
  );
}
