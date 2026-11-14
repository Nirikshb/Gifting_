import { describe, expect, it } from 'vitest';
import { renderAdminNewOrderEmail } from './admin-new-order';
import { renderOrderPlacedEmail } from './order-placed';
import { ORDER_STATUS_COPY, renderOrderStatusEmail } from './order-status';
import type { OrderEmailContext } from './order-summary';

const REFERENCE = '11111111-1111-4111-8111-111111111111';

function makeContext(
  overrides: Partial<OrderEmailContext> = {},
): OrderEmailContext {
  return {
    orderReference: REFERENCE,
    orderStatus: 'pending',
    paymentStatus: 'unpaid',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    recipientName: 'Arjun Doe',
    delivery: {
      line1: '12 Market Road',
      line2: 'Flat 4B',
      city: 'Jaipur',
      postcode: '302001',
      country: 'India',
    },
    giftMessage: 'Happy birthday',
    subtotalAmount: '9.00',
    shippingAmount: '49.00',
    totalAmount: '58.00',
    items: [
      {
        productName: 'Kraft Gift Box',
        quantity: 2,
        unitPrice: '4.50',
        lineTotal: '9.00',
      },
    ],
    createdAt: new Date('2026-02-01T10:00:00Z'),
    siteUrl: 'https://aapulki.example',
    accountOrderUrl: `https://aapulki.example/account/orders/${REFERENCE}`,
    adminOrderUrl: `https://aapulki.example/admin/orders/${REFERENCE}`,
    ...overrides,
  };
}

const STATUSES = [
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

describe('order placed email', () => {
  const rendered = renderOrderPlacedEmail(makeContext());

  it('uses the order reference in the subject', () => {
    expect(rendered.subject).toBe(`Aapulki order ${REFERENCE} received`);
  });

  it('renders the real order details in both parts', () => {
    for (const part of [rendered.html, rendered.text]) {
      expect(part).toContain('Kraft Gift Box');
      expect(part).toContain('₹58.00');
      expect(part).toContain('₹9.00');
      expect(part).toContain('Jaipur 302001');
      expect(part).toContain('Happy birthday');
      expect(part).toContain(REFERENCE);
    }
  });

  it('says nothing about payment or tracking', () => {
    expect(rendered.html.toLowerCase()).not.toContain('payment');
    expect(rendered.text.toLowerCase()).not.toContain('payment');
    expect(rendered.html.toLowerCase()).not.toMatch(/\bpaid\b/);
    expect(rendered.text.toLowerCase()).not.toMatch(/\bpaid\b/);
    expect(rendered.html.toLowerCase()).not.toContain('tracking');
  });

  it('links signed-in customers to their account and never to a token URL', () => {
    expect(rendered.html).toContain(`/account/orders/${REFERENCE}`);
    expect(rendered.html).not.toContain('?token=');
  });

  it('omits the account link for guest orders', () => {
    const guest = renderOrderPlacedEmail(
      makeContext({ accountOrderUrl: null }),
    );
    expect(guest.html).not.toContain('/account/orders/');
    expect(guest.text).not.toContain('/account/orders/');
    expect(guest.text).toContain(`reference ${REFERENCE}`);
  });

  it('drops every link when no site origin is configured', () => {
    const linkless = renderOrderPlacedEmail(
      makeContext({
        siteUrl: null,
        accountOrderUrl: null,
        adminOrderUrl: null,
      }),
    );
    expect(linkless.html).not.toContain('https://');
    expect(linkless.text).not.toContain('https://');
  });

  it('is branded, mobile-friendly HTML', () => {
    expect(rendered.html).toContain('<!doctype html>');
    expect(rendered.html).toContain('name="viewport"');
    expect(rendered.html).toContain('Aapulki');
    expect(rendered.html).toContain('#f7f4ee'); // ivory shell
    expect(rendered.html).toContain('#f0d9d4'); // blush accent
    expect(rendered.html).toContain('max-width:600px');
  });

  it('escapes order data instead of interpolating HTML', () => {
    const hostile = renderOrderPlacedEmail(
      makeContext({
        giftMessage: '<script>alert("xss")</script>',
        customerName: 'Eve <img src=x onerror=alert(1)>',
      }),
    );

    expect(hostile.html).not.toContain('<script>');
    expect(hostile.html).not.toContain('<img src=x');
    expect(hostile.html).toContain('&lt;script&gt;');
    expect(hostile.text).toContain('<script>alert("xss")</script>');
  });
});

describe('admin new order email', () => {
  const rendered = renderAdminNewOrderEmail(makeContext());

  it('identifies the order in the subject', () => {
    expect(rendered.subject).toBe(`New Aapulki order ${REFERENCE}`);
  });

  it('reports payment status factually without claiming success', () => {
    expect(rendered.html).toContain('Unpaid — No payment has been collected.');
    expect(rendered.text).toContain('Unpaid — No payment has been collected.');
  });

  it('uses the stored payment status when it changes', () => {
    const paid = renderAdminNewOrderEmail(
      makeContext({ paymentStatus: 'paid' }),
    );
    expect(paid.html).toContain('Paid — Payment marked as received.');
  });

  it('includes the customer contact and the studio link', () => {
    expect(rendered.html).toContain('jane@example.com');
    expect(rendered.html).toContain(`/admin/orders/${REFERENCE}`);
    expect(rendered.text).toContain(`/admin/orders/${REFERENCE}`);
  });

  it('includes the delivery address for fulfilment', () => {
    expect(rendered.html).toContain('12 Market Road');
    expect(rendered.text).toContain('Flat 4B');
  });
});

describe.each(STATUSES)('order status email: %s', (status) => {
  const ctx = makeContext({ orderStatus: status });
  const rendered = renderOrderStatusEmail({ ctx, status });

  it('names the status in the subject', () => {
    expect(rendered.subject).toBe(`Aapulki order ${REFERENCE}: ${status}`);
  });

  it('uses the storefront wording for the heading', () => {
    expect(rendered.html).toContain(ORDER_STATUS_COPY[status].heading);
    expect(rendered.text).toContain(ORDER_STATUS_COPY[status].heading);
    expect(rendered.text).toContain(ORDER_STATUS_COPY[status].note);
  });

  it('carries the order summary', () => {
    expect(rendered.html).toContain('Kraft Gift Box');
    expect(rendered.text).toContain('Total: ₹58.00');
  });

  it('never mentions payment or tracking', () => {
    expect(rendered.html.toLowerCase()).not.toContain('payment');
    expect(rendered.text.toLowerCase()).not.toContain('payment');
    expect(rendered.html.toLowerCase()).not.toContain('tracking');
    expect(rendered.text.toLowerCase()).not.toContain('tracking');
  });

  it('has no cancellation reason', () => {
    expect(rendered.html).not.toContain('Cancellation reason');
    expect(rendered.text).not.toContain('Cancellation reason');
  });
});

describe('cancelled order email details', () => {
  it('includes the recorded cancellation reason', () => {
    const rendered = renderOrderStatusEmail({
      ctx: makeContext({ orderStatus: 'cancelled' }),
      status: 'cancelled',
      cancellationReason: 'Recipient address changed',
      changedAt: new Date('2026-02-03T09:30:00Z'),
    });

    expect(rendered.html).toContain('Recipient address changed');
    expect(rendered.text).toContain('Recipient address changed');
    expect(rendered.text).toContain('Status updated');
  });

  it('stays quiet when no reason was recorded', () => {
    const rendered = renderOrderStatusEmail({
      ctx: makeContext({ orderStatus: 'cancelled' }),
      status: 'cancelled',
      cancellationReason: null,
    });

    expect(rendered.html).not.toContain('Cancellation reason');
    expect(rendered.text).not.toContain('Cancellation reason');
  });
});

describe('status copy coverage', () => {
  it('has copy for every customer-notifiable status', () => {
    expect(Object.keys(ORDER_STATUS_COPY).sort()).toEqual([...STATUSES].sort());
  });
});
