import type { OrderStatus, PaymentStatus } from "@/lib/api/orders";
import { formatInr } from "@/lib/api/product-format";

export type BadgeTone =
  | "neutral"
  | "amber"
  | "olive"
  | "blue"
  | "green"
  | "red"
  | "grey";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

export const ORDER_STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  pending: "amber",
  confirmed: "olive",
  processing: "olive",
  shipped: "blue",
  delivered: "green",
  cancelled: "red",
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, BadgeTone> = {
  unpaid: "amber",
  pending: "blue",
  paid: "green",
  failed: "red",
  refunded: "grey",
};

const FULFILMENT_NOTES: Record<OrderStatus, string> = {
  pending: "Order received and awaiting confirmation.",
  confirmed: "Confirmed by the studio.",
  processing: "Being prepared for dispatch.",
  shipped: "Handed to the delivery partner.",
  delivered: "Delivered to the recipient.",
  cancelled: "Order cancelled.",
};

const PAYMENT_NOTES: Record<PaymentStatus, string> = {
  unpaid: "No payment has been collected.",
  pending: "Payment is being arranged.",
  paid: "Payment marked as received.",
  failed: "The payment attempt failed.",
  refunded: "Payment refunded.",
};

export function money(value: string) {
  return formatInr(value) ?? `₹${value}`;
}

export function shippingLabel(value: string) {
  return Number.parseFloat(value) === 0 ? "Free" : money(value);
}

export function formatOrderDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatOrderDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "?";

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function orderStatusNote(status: OrderStatus) {
  return FULFILMENT_NOTES[status];
}

export function paymentStatusNote(status: PaymentStatus) {
  return PAYMENT_NOTES[status];
}

export function isKnownOrderStatus(value: string): value is OrderStatus {
  return value in ORDER_STATUS_LABELS;
}

export function isKnownPaymentStatus(value: string): value is PaymentStatus {
  return value in PAYMENT_STATUS_LABELS;
}
