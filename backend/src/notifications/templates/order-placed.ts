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
 * Sent to the customer the moment an order is created (guest or signed in).
 *
 * It never mentions payment: no payment provider is integrated, so claiming
 * anything about payment would be a lie. It also never links to the public
 * order page, because that page only renders with a one-time token that is
 * deliberately kept out of email.
 */
export function renderOrderPlacedEmail(ctx: OrderEmailContext): RenderedEmail {
  const subject = `Aapulki order ${ctx.orderReference} received`;
  const preheader = `Order ${ctx.orderReference} — we have your order.`;

  const cta = ctx.accountOrderUrl
    ? callToAction('View this order', ctx.accountOrderUrl)
    : '';

  const referenceNote = ctx.accountOrderUrl
    ? ''
    : paragraph(
        `Keep this email: your order reference is ${ctx.orderReference}.`,
      );

  const html = renderEmailHtml({
    preheader,
    footerNote:
      "You're receiving this because an order was placed with Aapulki.",
    siteUrl: ctx.siteUrl,
    contentHtml: [
      heading("We've received your order"),
      paragraph(
        `Thanks ${ctx.customerName} — order ${ctx.orderReference} is with us. Here is everything we have for it.`,
      ),
      orderSummaryHtml(ctx),
      deliveryBlockHtml(ctx),
      ctx.giftMessage ? noticeBox('Gift message', ctx.giftMessage) : '',
      paragraph(`Placed ${formatOrderDateTime(ctx.createdAt)}.`, true),
      cta,
      referenceNote,
      paragraph(
        `We'll email you at ${ctx.customerEmail} each time the status of this order changes.`,
        true,
      ),
    ].join('\n'),
  });

  const text = renderEmailText([
    `Thanks ${ctx.customerName} — we've received your order.`,
    `Reference: ${ctx.orderReference}`,
    '',
    ...orderSummaryText(ctx),
    '',
    ...deliveryBlockText(ctx),
    ...(ctx.giftMessage ? ['', 'Gift message', ctx.giftMessage] : []),
    '',
    `Placed ${formatOrderDateTime(ctx.createdAt)}`,
    ctx.accountOrderUrl
      ? `View your order: ${ctx.accountOrderUrl}`
      : `Keep this email for your records — reference ${ctx.orderReference}.`,
    '',
    `We'll email you at ${ctx.customerEmail} each time the status of this order changes.`,
  ]);

  return { subject, html, text };
}
