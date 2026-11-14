import {
  escapeHtml,
  formatInr,
  isZeroAmount,
  EMAIL_PALETTE,
  FONT_STACK,
} from './brand';
import type {
  OrderStatus,
  PaymentStatus,
} from '../../orders/entities/order.entity';

/**
 * The order facts every template renders, and the shared blocks that render
 * them. Contexts are built once per event from the order row inside the same
 * transaction that queues the email, so the numbers in an email always match
 * the order as it was at that moment.
 */

export type OrderEmailLine = {
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type OrderEmailDelivery = {
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  country: string;
};

export type OrderEmailContext = {
  orderReference: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  customerName: string;
  customerEmail: string;
  recipientName: string | null;
  delivery: OrderEmailDelivery;
  giftMessage: string | null;
  subtotalAmount: string;
  shippingAmount: string;
  totalAmount: string;
  items: OrderEmailLine[];
  createdAt: Date;
  /** Absolute storefront origin, null when not configured (links omitted). */
  siteUrl: string | null;
  /** Order page for a signed-in customer; null for guest checkouts. */
  accountOrderUrl: string | null;
  /** Studio order page for the admin notification. */
  adminOrderUrl: string | null;
};

export function shippingDisplay(amount: string): string {
  return isZeroAmount(amount) ? 'Free' : formatInr(amount);
}

export function orderSummaryHtml(ctx: OrderEmailContext): string {
  const headerStyle = `font-family:${FONT_STACK};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_PALETTE.muted};padding:0 0 8px 0;`;
  const cellStyle = `font-family:${FONT_STACK};font-size:15px;padding:10px 0;color:${EMAIL_PALETTE.ink};vertical-align:top;`;

  const rows = ctx.items
    .map(
      (item) => `
        <tr>
          <td style="${cellStyle}">${escapeHtml(item.productName)}<br><span style="font-size:13px;color:${EMAIL_PALETTE.muted};">${escapeHtml(formatInr(item.unitPrice))} each</span></td>
          <td align="right" style="${cellStyle};color:${EMAIL_PALETTE.muted};">${escapeHtml(String(item.quantity))}</td>
          <td align="right" style="${cellStyle};white-space:nowrap;">${escapeHtml(formatInr(item.lineTotal))}</td>
        </tr>`,
    )
    .join('');

  return `
      <p style="margin:0 0 8px 0;font-family:${FONT_STACK};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_PALETTE.muted};">Order summary</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px 0;">
        <tr>
          <td style="${headerStyle}">Item</td>
          <td align="right" style="${headerStyle}">Qty</td>
          <td align="right" style="${headerStyle}">Total</td>
        </tr>
        <tr><td colspan="3" style="padding:0;border-top:1px solid ${EMAIL_PALETTE.line};font-size:0;line-height:0;">&nbsp;</td></tr>
        ${rows}
        <tr><td colspan="3" style="padding:0;border-top:1px solid ${EMAIL_PALETTE.line};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td colspan="2" style="${cellStyle};color:${EMAIL_PALETTE.muted};">Subtotal</td>
          <td align="right" style="${cellStyle};white-space:nowrap;">${escapeHtml(formatInr(ctx.subtotalAmount))}</td>
        </tr>
        <tr>
          <td colspan="2" style="${cellStyle};color:${EMAIL_PALETTE.muted};">Shipping</td>
          <td align="right" style="${cellStyle};white-space:nowrap;">${escapeHtml(shippingDisplay(ctx.shippingAmount))}</td>
        </tr>
        <tr><td colspan="3" style="padding:0;border-top:1px solid ${EMAIL_PALETTE.line};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td colspan="2" style="${cellStyle};font-weight:700;">Total</td>
          <td align="right" style="${cellStyle};font-weight:700;white-space:nowrap;">${escapeHtml(formatInr(ctx.totalAmount))}</td>
        </tr>
      </table>`;
}

export function orderSummaryText(ctx: OrderEmailContext): string[] {
  const lines = ['Order summary', `Reference: ${ctx.orderReference}`];

  for (const item of ctx.items) {
    lines.push(
      `${item.quantity} x ${item.productName} @ ${formatInr(item.unitPrice)} = ${formatInr(item.lineTotal)}`,
    );
  }

  lines.push(`Subtotal: ${formatInr(ctx.subtotalAmount)}`);
  lines.push(`Shipping: ${shippingDisplay(ctx.shippingAmount)}`);
  lines.push(`Total: ${formatInr(ctx.totalAmount)}`);
  return lines;
}

export function deliveryBlockHtml(ctx: OrderEmailContext): string {
  const line2 = ctx.delivery.line2
    ? `<br>${escapeHtml(ctx.delivery.line2)}`
    : '';

  return `
      <p style="margin:0 0 6px 0;font-family:${FONT_STACK};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_PALETTE.muted};">Delivery address</p>
      <p style="margin:0 0 20px 0;font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:${EMAIL_PALETTE.ink};">
        <span style="font-weight:600;">${escapeHtml(ctx.recipientName ?? ctx.customerName)}</span><br>
        ${escapeHtml(ctx.delivery.line1)}${line2}<br>
        ${escapeHtml(ctx.delivery.city)} ${escapeHtml(ctx.delivery.postcode)}<br>
        ${escapeHtml(ctx.delivery.country)}
      </p>`;
}

export function deliveryBlockText(ctx: OrderEmailContext): string[] {
  const lines = [
    'Delivery address',
    ctx.recipientName ?? ctx.customerName,
    ctx.delivery.line1,
  ];

  if (ctx.delivery.line2) {
    lines.push(ctx.delivery.line2);
  }

  lines.push(`${ctx.delivery.city} ${ctx.delivery.postcode}`);
  lines.push(ctx.delivery.country);
  return lines;
}
