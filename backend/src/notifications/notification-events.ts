import { createHash } from 'crypto';
import type { OrderStatus } from '../orders/entities/order.entity';

/**
 * Stable keys for the logical email events. One key = at most one outbox row
 * (the table has a unique constraint on it), which is what makes a repeated
 * status request or a retried checkout harmless: the second insert is
 * ignored by the database instead of producing a second email.
 */
export function orderPlacedEventKey(orderId: number): string {
  return `order_placed:${orderId}`;
}

export function adminNewOrderEventKey(orderId: number): string {
  return `admin_new_order:${orderId}`;
}

export function orderStatusEventKey(
  orderId: number,
  status: OrderStatus,
): string {
  return `order_status:${orderId}:${status}`;
}

/**
 * Stable key for a newsletter confirmation email. Scoped per address and token
 * so a confirmation resend (new token, same address) is a distinct event.
 */
export function newsletterConfirmationEventKey(
  email: string,
  confirmationTokenHash: string,
): string {
  return `newsletter_confirmation:${email}:${confirmationTokenHash}`;
}

/**
 * Deterministic key for a campaign recipient send. One key = at most one
 * outbox row for a (campaign, address) pair, so re-processing (a retry or a
 * repeated send request) hits the unique `event_key` constraint and is
 * ignored instead of producing a duplicate email. The address is hashed so
 * the key always fits `event_key VARCHAR(255)`; the recipient is stored
 * separately on the outbox row.
 */
export function campaignSendEventKey(
  campaignId: number,
  recipientEmail: string,
): string {
  const hash = createHash('sha256')
    .update(recipientEmail.trim().toLowerCase())
    .digest('hex');
  return `campaign_send:${campaignId}:${hash}`;
}

/**
 * Fulfilment changes the customer is told about. `pending` is deliberately
 * absent: the order-placed email already tells them the order was received.
 */
export const CUSTOMER_NOTIFIABLE_ORDER_STATUSES: readonly Exclude<
  OrderStatus,
  'pending'
>[] = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export function isCustomerNotifiableStatus(
  status: OrderStatus,
): status is Exclude<OrderStatus, 'pending'> {
  return (
    CUSTOMER_NOTIFIABLE_ORDER_STATUSES as readonly OrderStatus[]
  ).includes(status);
}
