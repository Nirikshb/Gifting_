import type { OrderStatus, PaymentStatus } from "@/lib/api/orders";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
} from "@/lib/orders/format";
import styles from "./OrderBadges.module.css";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`${styles.badge} ${styles[ORDER_STATUS_TONES[status]]}`}>
      <span className={styles.dot} aria-hidden="true" />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`${styles.badge} ${styles[PAYMENT_STATUS_TONES[status]]}`}>
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
