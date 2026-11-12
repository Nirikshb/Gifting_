"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  cancelAdminOrder,
  getAdminOrder,
  updateAdminOrderStatus,
  type AdminOrderDetail as OrderDetail,
  type OrderStatus,
} from "@/lib/api/orders";
import {
  formatOrderDate,
  formatOrderDateTime,
  money,
  ORDER_STATUS_LABELS,
  orderStatusNote,
  shippingLabel,
} from "@/lib/orders/format";
import { OrderStatusBadge, PaymentStatusBadge } from "./orders/OrderBadges";
import { OrderTimeline } from "./orders/OrderTimeline";
import styles from "./admin.module.css";

type LoadState = "loading" | "ready" | "error";
type ErrorKind = "unauthorized" | "forbidden" | "notFound" | "generic";

const ADMIN_CANCELLABLE: OrderStatus[] = ["pending", "confirmed", "processing"];

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

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function AdminOrderDetail({ reference }: { reference: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorKind, setErrorKind] = useState<ErrorKind>("generic");
  const [reloadKey, setReloadKey] = useState(0);

  const [nextStatus, setNextStatus] = useState<string>("");
  const [statusNote, setStatusNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    let cancelled = false;

    getAdminOrder(reference)
      .then((data) => {
        if (cancelled) return;
        setOrder(data);
        setNextStatus(data.allowedTransitions[0] ?? "");
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const status = statusOf(error);
        setErrorKind(
          status === 401
            ? "unauthorized"
            : status === 403
              ? "forbidden"
              : status === 404
                ? "notFound"
                : "generic",
        );
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reference, reloadKey]);

  function refresh() {
    setState("loading");
    setReloadKey((value) => value + 1);
  }

  async function submitStatus(event: FormEvent) {
    event.preventDefault();
    if (!order || !nextStatus || updating) return;

    setUpdating(true);
    setUpdateError("");

    try {
      const result = await updateAdminOrderStatus(
        order.orderReference,
        nextStatus as OrderStatus,
        statusNote.trim() || undefined,
      );
      setNotice(
        `${result.orderReference} moved to ${ORDER_STATUS_LABELS[result.orderStatus].toLowerCase()}.`,
      );
      setWarning("");
      setStatusNote("");
      refresh();
    } catch (error: unknown) {
      setUpdateError(messageOf(error, "The status could not be updated."));
    } finally {
      setUpdating(false);
    }
  }

  async function submitCancellation() {
    if (!order || cancelling) return;

    setCancelling(true);
    setCancelError("");

    try {
      const result = await cancelAdminOrder(
        order.orderReference,
        reason.trim() || undefined,
      );
      setCancelOpen(false);
      setReason("");

      if (result.refundDue) {
        setWarning(
          "Order cancelled and stock restored. Payment is still recorded as paid, so a refund is now due and must be processed through the payment provider when one is connected. The system has not fabricated a refund.",
        );
        setNotice("");
      } else {
        setNotice("Order cancelled. Stock has been restored.");
        setWarning("");
      }

      refresh();
    } catch (error: unknown) {
      setCancelError(messageOf(error, "The order could not be cancelled."));
    } finally {
      setCancelling(false);
    }
  }

  if (state === "loading") {
    return (
      <div className={styles.page}>
        <div className={styles.panelSkeleton} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (state === "error" || !order) {
    return (
      <div className={styles.page}>
        <div className={styles.panel}>
          <p className={styles.emptyTitle}>
            {errorKind === "unauthorized"
              ? "Sign in required"
              : errorKind === "forbidden"
                ? "Studio access only"
                : errorKind === "notFound"
                  ? "Order not found"
                  : "We could not load this order"}
          </p>
          <p className={styles.emptyText}>
            {errorKind === "notFound"
              ? "No order exists with this reference."
              : errorKind === "generic"
                ? "The studio API did not respond. Check the connection and try again."
                : "Your session does not have access to this order."}
          </p>
          <div className={styles.stateActions}>
            {errorKind === "generic" ? (
              <button className={styles.retry} type="button" onClick={refresh}>
                Try again
              </button>
            ) : null}
            <Link className={styles.backLink} href="/admin/orders">
              Back to orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalItems = order.items.reduce((total, item) => total + item.quantity, 0);
  const canCancel = ADMIN_CANCELLABLE.includes(order.orderStatus);
  const isTerminal = order.allowedTransitions.length === 0;

  return (
    <div className={styles.page}>
      <header className={styles.detailHead}>
        <div>
          <Link className={styles.backLink} href="/admin/orders">
            ← All orders
          </Link>
          <h1 className={styles.detailTitle}>{order.orderReference}</h1>
          <p className={styles.detailMeta}>
            Placed {formatOrderDateTime(order.createdAt)} · Updated{" "}
            {formatOrderDateTime(order.updatedAt)}
          </p>
        </div>
        <div className={styles.badgeRow}>
          <OrderStatusBadge status={order.orderStatus} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </header>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      {warning ? (
        <p className={styles.noticeDanger} role="alert">
          {warning}
        </p>
      ) : null}

      <div className={styles.detailGrid}>
        <div className={styles.detailColumn}>
          <section className={styles.detailCard}>
            <div className={styles.panelHead}>
              <h2 className={styles.cardTitle}>Items</h2>
              <p className={styles.cardMeta}>
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </p>
            </div>
            <ul className={styles.itemList}>
              {order.items.map((item, index) => (
                <li className={styles.itemRow} key={`${item.productSlug}-${index}`}>
                  <span className={styles.itemName}>
                    {item.productName}
                    <span className={styles.itemQty}>
                      {money(item.unitPrice)} × {item.quantity}
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

          <section className={styles.detailCard}>
            <h2 className={styles.cardTitle}>Customer and delivery</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoBlock}>
                <p className={styles.infoLabel}>Customer</p>
                <p className={styles.infoValue}>{order.customerName}</p>
                <p className={styles.infoSub}>{order.customerEmail}</p>
                <p className={styles.infoSub}>
                  {order.customerId === null
                    ? "Guest checkout — no customer account linked"
                    : `Customer ID ${order.customerId}`}
                </p>
              </div>
              <div className={styles.infoBlock}>
                <p className={styles.infoLabel}>Recipient</p>
                <p className={styles.infoValue}>
                  {order.recipientName ?? order.customerName}
                </p>
                <address className={styles.address}>
                  <span>{order.delivery.line1}</span>
                  {order.delivery.line2 ? <span>{order.delivery.line2}</span> : null}
                  <span>
                    {order.delivery.city}, {order.delivery.postcode}
                  </span>
                  <span>{order.delivery.country}</span>
                </address>
              </div>
            </div>
            {order.giftMessage ? (
              <div className={styles.gift}>
                <p className={styles.infoLabel}>Gift message</p>
                <p className={styles.giftText}>{order.giftMessage}</p>
              </div>
            ) : null}
          </section>

          <section className={styles.detailCard}>
            <h2 className={styles.cardTitle}>Order activity</h2>
            <p className={styles.cardHint}>
              Fulfilment and payment history, oldest first.
            </p>
            <OrderTimeline history={order.history} />
          </section>
        </div>

        <aside className={styles.sideStack}>
          <section className={styles.detailCard}>
            <h2 className={styles.cardTitle}>Payment</h2>
            <div className={styles.badgeRow}>
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
            <dl className={styles.kv}>
              <div>
                <dt>Payment reference</dt>
                <dd>{order.paymentReference ?? "None recorded"}</dd>
              </div>
              <div>
                <dt>Paid at</dt>
                <dd>{order.paidAt ? formatOrderDateTime(order.paidAt) : "Not paid"}</dd>
              </div>
              <div>
                <dt>Cancelled at</dt>
                <dd>
                  {order.cancelledAt
                    ? formatOrderDateTime(order.cancelledAt)
                    : "Not cancelled"}
                </dd>
              </div>
              <div>
                <dt>Stock restored</dt>
                <dd>
                  {order.stockRestoredAt
                    ? formatOrderDateTime(order.stockRestoredAt)
                    : "Not restored"}
                </dd>
              </div>
            </dl>
          </section>

          <section className={styles.detailCard}>
            <h2 className={styles.cardTitle}>Fulfilment</h2>
            <p className={styles.statusNote}>{orderStatusNote(order.orderStatus)}</p>

            {isTerminal ? (
              <p className={styles.cardHint}>
                {order.orderStatus === "delivered"
                  ? "Delivered orders are complete and cannot be moved again."
                  : "Cancelled orders are final and cannot be moved again."}
              </p>
            ) : (
              <form className={styles.actionForm} onSubmit={submitStatus}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Next status</span>
                  <select
                    className={styles.selectInput}
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value)}
                    disabled={updating}
                  >
                    {order.allowedTransitions.map((status) => (
                      <option key={status} value={status}>
                        {ORDER_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Note (optional)</span>
                  <textarea
                    className={styles.textarea}
                    rows={2}
                    maxLength={500}
                    value={statusNote}
                    placeholder="Internal note for the history timeline."
                    onChange={(event) => setStatusNote(event.target.value)}
                    disabled={updating}
                  />
                </label>
                {updateError ? (
                  <p className={styles.errorText} role="alert">
                    {updateError}
                  </p>
                ) : null}
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={updating || !nextStatus}
                >
                  {updating ? "Updating…" : "Update status"}
                </button>
              </form>
            )}

            {canCancel ? (
              <div className={styles.cancelSection}>
                <p className={styles.cardHint}>
                  Cancelling restores stock once. A paid order keeps its payment
                  status and is flagged as refund due.
                </p>
                {cancelOpen ? (
                  <div className={styles.cancelPanel}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Reason (optional)</span>
                      <textarea
                        className={styles.textarea}
                        rows={2}
                        maxLength={500}
                        value={reason}
                        placeholder="Why is this order being cancelled?"
                        onChange={(event) => setReason(event.target.value)}
                        disabled={cancelling}
                      />
                    </label>
                    {cancelError ? (
                      <p className={styles.errorText} role="alert">
                        {cancelError}
                      </p>
                    ) : null}
                    <div className={styles.actionRow}>
                      <button
                        className={styles.dangerButton}
                        type="button"
                        disabled={cancelling}
                        onClick={submitCancellation}
                      >
                        {cancelling ? "Cancelling…" : "Confirm cancellation"}
                      </button>
                      <button
                        className={styles.ghostButton}
                        type="button"
                        disabled={cancelling}
                        onClick={() => {
                          setCancelOpen(false);
                          setCancelError("");
                        }}
                      >
                        Keep order
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={styles.dangerOutline}
                    type="button"
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancel order
                  </button>
                )}
              </div>
            ) : null}
          </section>

          <section className={styles.detailCard}>
            <h2 className={styles.cardTitle}>Order record</h2>
            <dl className={styles.kv}>
              <div>
                <dt>Reference</dt>
                <dd>{order.orderReference}</dd>
              </div>
              <div>
                <dt>Placed</dt>
                <dd>{formatOrderDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>{order.currency}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
