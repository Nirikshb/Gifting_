import type { OrderStatus } from '../../orders/entities/order.entity';
import {
  callToAction,
  formatOrderDateTime,
  heading,
  noticeBox,
  paragraph,
  renderEmailHtml,
  renderEmailText,
  type RenderedEmail,
} from './brand';
import {
  deliveryBlockHtml,
  deliveryBlockText,
  orderSummaryHtml,
  orderSummaryText,
  type OrderEmailContext,
} from './order-summary';

/**
 * Customer email for every fulfilment change after checkout: confirmed,
 * processing, shipped, delivered and cancelled.
 *
 * The wording mirrors the storefront's fulfilment notes so an email and the
 * account page never say different things. There is no tracking number
 * anywhere: the system does not have any, and inventing one would be worse
 * than saying nothing.
 */
export type StatusCopy = {
  heading: string;
  lead: (orderReference: string) => string;
  note: string;
};

export const ORDER_STATUS_COPY: Record<
  Exclude<OrderStatus, 'pending'>,
  StatusCopy
> = {
  confirmed: {
    heading: 'Your order is confirmed',
    lead: (ref) => `The studio has confirmed order ${ref}.`,
    note: 'Confirmed by the studio.',
  },
  processing: {
    heading: 'Your order is being prepared',
    lead: (ref) => `We are preparing order ${ref} for dispatch.`,
    note: 'Being prepared for dispatch.',
  },
  shipped: {
    heading: 'Your order has shipped',
    lead: (ref) => `Order ${ref} has been handed to our delivery partner.`,
    note: 'Handed to the delivery partner.',
  },
  delivered: {
    heading: 'Your order has been delivered',
    lead: (ref) => `Order ${ref} has been delivered.`,
    note: 'Delivered to the recipient.',
  },
  cancelled: {
    heading: 'Your order has been cancelled',
    lead: (ref) => `Order ${ref} has been cancelled.`,
    note: 'Order cancelled.',
  },
};

export type OrderStatusEmailInput = {
  ctx: OrderEmailContext;
  status: Exclude<OrderStatus, 'pending'>;
  /** Reason recorded with the cancellation, when one was given. */
  cancellationReason?: string | null;
  /** When the status actually changed; falls back to the order's created date. */
  changedAt?: Date;
};

export function renderOrderStatusEmail(
  input: OrderStatusEmailInput,
): RenderedEmail {
  const { ctx, status } = input;
  const copy = ORDER_STATUS_COPY[status];
  const changedAt = input.changedAt ?? ctx.createdAt;

  const subject = `Aapulki order ${ctx.orderReference}: ${status}`;
  const preheader = `Order ${ctx.orderReference}: ${status}.`;

  const cta = ctx.accountOrderUrl
    ? callToAction('View this order', ctx.accountOrderUrl)
    : '';

  const html = renderEmailHtml({
    preheader,
    footerNote:
      "You're receiving this because an order was placed with Aapulki.",
    siteUrl: ctx.siteUrl,
    contentHtml: [
      heading(copy.heading),
      paragraph(`Hi ${ctx.customerName},`),
      paragraph(copy.lead(ctx.orderReference)),
      orderSummaryHtml(ctx),
      paragraph(copy.note, true),
      input.cancellationReason
        ? noticeBox('Cancellation reason', input.cancellationReason)
        : '',
      deliveryBlockHtml(ctx),
      paragraph(`Status updated ${formatOrderDateTime(changedAt)}.`, true),
      cta,
    ].join('\n'),
  });

  const text = renderEmailText([
    copy.heading,
    '',
    `Hi ${ctx.customerName},`,
    copy.lead(ctx.orderReference),
    '',
    ...orderSummaryText(ctx),
    '',
    copy.note,
    ...(input.cancellationReason
      ? ['', 'Cancellation reason', input.cancellationReason]
      : []),
    '',
    ...deliveryBlockText(ctx),
    '',
    `Status updated ${formatOrderDateTime(changedAt)}`,
    ctx.accountOrderUrl
      ? `View your order: ${ctx.accountOrderUrl}`
      : `Reference: ${ctx.orderReference}`,
  ]);

  return { subject, html, text };
}
