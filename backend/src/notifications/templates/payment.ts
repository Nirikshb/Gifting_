import type { PaymentStatus } from '../../orders/entities/order.entity';

/**
 * Payment wording mirrors the storefront labels exactly
 * (`frontend/src/lib/orders/format.ts`), and is factual only: it reports the
 * stored status, it never infers a successful payment.
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  pending: 'Payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

export const PAYMENT_STATUS_NOTES: Record<PaymentStatus, string> = {
  unpaid: 'No payment has been collected.',
  pending: 'Payment is being arranged.',
  paid: 'Payment marked as received.',
  failed: 'The payment attempt failed.',
  refunded: 'Payment refunded.',
};
