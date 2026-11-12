"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  cancelMyOrder,
  getMyOrder,
  type CustomerOrderDetail as OrderDetail,
} from "@/lib/api/orders";
import {
  formatOrderDate,
  formatOrderDateTime,
  money,
  orderStatusNote,
  paymentStatusNote,
  shippingLabel,
} from "@/lib/orders/format";
import { OrderStatusBadge, PaymentStatusBadge } from "./orders/OrderBadges";
import { OrderTimeline } from "./orders/OrderTimeline";
import styles from "./CustomerOrderDetail.module.css";

type LoadState = "loading" | "ready" | "error";
type ErrorKind = "unauthorized" | "notFound" | "generic";

function statusOf(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  ) {
    return (error as { statusCode: number }).statusCode;
  }

  return 0;
}

export function CustomerOrderDetail({ reference }: { reference: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorKind, setErrorKind] = useState<ErrorKind>("generic");
  const [reloadKey, setReloadKey] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    getMyOrder(reference)
      .then((data) => {
        if (cancelled) return;
        setOrder(data);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const status = statusOf(error);
        setErrorKind(status === 401 ? "unauthorized" : status === 404 ? "notFound" : "generic");
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reference, reloadKey]);

  const refresh = useCallback(() => {
    setState("loading");
    setReloadKey((value) => value + 1);
  }, []);

  async function submitCancellation() {
    if (!order || submitting) return;

    setSubmitting(true);
    setCancelError("");

    try {
      const result = await cancelMyOrder(order.orderReference, reason.trim() || undefined);
      setPanelOpen(false);
      setReason("");
      setNotice(
        result.stockRestored
          ? "Order cancelled. The reserved stock has been returned to the shop."
          : "Order cancelled.",
      );
      refresh();
    } catch (error: unknown) {
      setCancelError(
        error instanceof Error && error.message
          ? error.message
          : "We could not cancel this order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading") {
    return (
      <div className={styles.loadingWrap}>
        <p className={styles.loading}>Loading order {reference}…</p>
      </div>
    );
  }

  if (state === "error" || !order) {
    return (
      <div className={styles.stateCard}>
        <p className={styles.stateTitle}>
          {errorKind === "unauthorized"
            ? "Please sign in"
            : errorKind === "notFound"
              ? "Order not found"
              : "We could not load this order"}
        </p>
        <p className={styles.stateText}>
          {errorKind === "unauthorized"
            ? "Your session may have expired. Sign in to view your orders."
            : errorKind === "notFound"
              ? "This order is not available on your account. Check the reference and try again."
              : "Check your connection and try again."}
        </p>
        <div className={styles.stateActions}>
          {errorKind === "unauthorized" ? (
            <Link className={styles.primary} href="/account" transitionTypes={["account"]}>
              Go to account
            </Link>
          ) : (
            <button className={styles.retry} type="button" onClick={refresh}>
              Try again
            </button>
          )}
          <Link className={styles.backLink} href="/account/orders" transitionTypes={["account"]}>
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const totalItems = order.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <Link className={styles.crumb} href="/account/orders" transitionTypes={["account"]}>
            ← All orders
          </Link>
          <h2 className={styles.reference}>{order.orderReference}</h2>
          <p className={styles.placed}>
            Placed {formatOrderDateTime(order.createdAt)}
          </p>
        </div>
        <div className={styles.badges}>
          <OrderStatusBadge status={order.orderStatus} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </header>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.column}>
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h3>Items</h3>
              <p className={styles.cardMeta}>
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </p>
            </div>
            <ul className={styles.items}>
              {order.items.map((item, index) => (
                <li className={styles.item} key={`${item.productSlug}-${index}`}>
                  <span className={styles.itemName}>
                    {item.productName}
                    <span className={styles.itemQty}> × {item.quantity}</span>
                    <span className={styles.unit}>
                      {money(item.unitPrice)} each
                    </span>
                  </span>
                  <span className={styles.itemTotal}>{money(item.lineTotal)}</span>
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
          </section>

          <section className={styles.card}>
            <h3>Delivery</h3>
            <address className={styles.address}>
              <span>{order.recipientName ?? order.customerName}</span>
              <span>{order.delivery.line1}</span>
              {order.delivery.line2 ? <span>{order.delivery.line2}</span> : null}
              <span>
                {order.delivery.city}, {order.delivery.postcode}
              </span>
              <span>{order.delivery.country}</span>
            </address>
            {order.giftMessage ? (
              <div className={styles.gift}>
                <p className={styles.giftLabel}>Gift message</p>
                <p className={styles.giftText}>{order.giftMessage}</p>
              </div>
            ) : null}
          </section>

          <section className={styles.card}>
            <h3>Order activity</h3>
            <p className={styles.cardHint}>
              Every fulfilment and payment update recorded for this order.
            </p>
            <OrderTimeline history={order.history} />
          </section>
        </div>

        <aside className={styles.aside}>
          <section className={styles.card}>
            <h3>Status</h3>
            <div className={styles.statusBlock}>
              <OrderStatusBadge status={order.orderStatus} />
              <p className={styles.statusNote}>{orderStatusNote(order.orderStatus)}</p>
            </div>
            <div className={styles.statusBlock}>
              <PaymentStatusBadge status={order.paymentStatus} />
              <p className={styles.statusNote}>{paymentStatusNote(order.paymentStatus)}</p>
            </div>
            <dl className={styles.metaList}>
              <div>
                <dt>Placed</dt>
                <dd>{formatOrderDate(order.createdAt)}</dd>
              </div>
              {order.paidAt ? (
                <div>
                  <dt>Paid</dt>
                  <dd>{formatOrderDate(order.paidAt)}</dd>
                </div>
              ) : null}
              {order.cancelledAt ? (
                <div>
                  <dt>Cancelled</dt>
                  <dd>{formatOrderDate(order.cancelledAt)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Customer</dt>
                <dd>{order.customerName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{order.customerEmail}</dd>
              </div>
            </dl>
          </section>

          {order.canCancel ? (
            <section className={styles.card}>
              <h3>Cancel this order</h3>
              <p className={styles.cardHint}>
                This order is still unpaid and has not been dispatched. Cancelling
                returns the reserved stock to the shop immediately.
              </p>

              {panelOpen ? (
                <div className={styles.cancelPanel}>
                  <label className={styles.field}>
                    <span>Reason (optional)</span>
                    <textarea
                      value={reason}
                      maxLength={500}
                      rows={3}
                      placeholder="Let us know why you are cancelling."
                      onChange={(event) => setReason(event.target.value)}
                      disabled={submitting}
                    />
                  </label>
                  {cancelError ? (
                    <p className={styles.error} role="alert">
                      {cancelError}
                    </p>
                  ) : null}
                  <div className={styles.cancelActions}>
                    <button
                      className={styles.danger}
                      type="button"
                      disabled={submitting}
                      onClick={submitCancellation}
                    >
                      {submitting ? "Cancelling…" : "Confirm cancellation"}
                    </button>
                    <button
                      className={styles.ghost}
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setPanelOpen(false);
                        setCancelError("");
                      }}
                    >
                      Keep order
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={styles.cancelButton}
                  type="button"
                  onClick={() => setPanelOpen(true)}
                >
                  Cancel order
                </button>
              )}
            </section>
          ) : null}

          <section className={styles.card}>
            <h3>Need help?</h3>
            <p className={styles.cardHint}>
              Keep the order reference handy when you contact us. Guest checkout
              confirmation links stay valid even after you sign in.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
