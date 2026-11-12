import type { OrderHistoryEntry } from "@/lib/api/orders";
import {
  formatOrderDateTime,
  isKnownOrderStatus,
  isKnownPaymentStatus,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders/format";
import styles from "./OrderTimeline.module.css";

const ACTOR_LABELS: Record<OrderHistoryEntry["actorType"], string> = {
  customer: "Customer",
  admin: "Studio",
  system: "System",
};

function entryTitle(entry: OrderHistoryEntry) {
  if (entry.category === "payment" && isKnownPaymentStatus(entry.toStatus)) {
    return `Payment: ${PAYMENT_STATUS_LABELS[entry.toStatus]}`;
  }

  if (isKnownOrderStatus(entry.toStatus)) {
    return ORDER_STATUS_LABELS[entry.toStatus];
  }

  return entry.toStatus;
}

export function OrderTimeline({
  history,
  emptyLabel = "No activity recorded yet.",
}: {
  history: OrderHistoryEntry[];
  emptyLabel?: string;
}) {
  if (history.length === 0) {
    return <p className={styles.empty}>{emptyLabel}</p>;
  }

  return (
    <ol className={styles.timeline}>
      {history.map((entry) => (
        <li className={styles.entry} key={entry.id}>
          <span
            className={
              entry.category === "payment"
                ? `${styles.marker} ${styles.markerPayment}`
                : styles.marker
            }
            aria-hidden="true"
          />
          <div className={styles.content}>
            <div className={styles.head}>
              <p className={styles.title}>{entryTitle(entry)}</p>
              <p className={styles.date}>{formatOrderDateTime(entry.createdAt)}</p>
            </div>
            <p className={styles.meta}>
              {ACTOR_LABELS[entry.actorType]}
              {entry.fromStatus && entry.fromStatus !== entry.toStatus ? (
                <span> · from {entry.fromStatus}</span>
              ) : null}
            </p>
            {entry.note ? <p className={styles.note}>{entry.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
