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
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_NOTES } from './payment';

/**
 * Sent to the studio when a new order is placed. This is the one email that
 * reports payment status, because staff need it to decide what to do next —
 * it only ever repeats the stored status.
 */
export function renderAdminNewOrderEmail(
  ctx: OrderEmailContext,
): RenderedEmail {
  const subject = `New Aapulki order ${ctx.orderReference}`;
  const preheader = `New order ${ctx.orderReference} from ${ctx.customerName}.`;

  const paymentLine = `${PAYMENT_STATUS_LABELS[ctx.paymentStatus]} — ${PAYMENT_STATUS_NOTES[ctx.paymentStatus]}`;

  const cta = ctx.adminOrderUrl
    ? callToAction('Open in the studio', ctx.adminOrderUrl)
    : '';

  const html = renderEmailHtml({
    preheader,
    footerNote:
      "You're receiving this because you're listed as an Aapulki studio administrator.",
    siteUrl: ctx.siteUrl,
    contentHtml: [
      heading('New order'),
      paragraph(
        `${ctx.customerName} placed order ${ctx.orderReference} on ${formatOrderDateTime(ctx.createdAt)}.`,
      ),
      orderSummaryHtml(ctx),
      deliveryBlockHtml(ctx),
      ctx.giftMessage ? noticeBox('Gift message', ctx.giftMessage) : '',
      noticeBox('Payment', paymentLine),
      paragraph(
        `Customer contact: ${ctx.customerName} (${ctx.customerEmail})`,
        true,
      ),
      cta,
    ].join('\n'),
  });

  const text = renderEmailText([
    'New order',
    `${ctx.customerName} placed order ${ctx.orderReference} on ${formatOrderDateTime(ctx.createdAt)}.`,
    '',
    ...orderSummaryText(ctx),
    '',
    ...deliveryBlockText(ctx),
    ...(ctx.giftMessage ? ['', 'Gift message', ctx.giftMessage] : []),
    '',
    'Payment',
    paymentLine,
    '',
    `Customer contact: ${ctx.customerName} (${ctx.customerEmail})`,
    '',
    ctx.adminOrderUrl
      ? `Open in the studio: ${ctx.adminOrderUrl}`
      : `Reference: ${ctx.orderReference}`,
  ]);

  return { subject, html, text };
}
