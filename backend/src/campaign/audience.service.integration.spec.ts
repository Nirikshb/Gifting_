import 'dotenv/config';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AudienceService } from './audience.service';
import { Newsletter } from '../newsletter/entities/newsletter.entity';
import { Product } from '../products/entities/product.entity';
import { ProductImage } from '../products/entities/product-image.entity';
import { StockAdjustment } from '../products/entities/stock-adjustment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatusHistory } from '../orders/entities/order-status-history.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerSession } from '../customers/entities/customer-session.entity';
import { Cart } from '../carts/entities/cart.entity';
import { CartItem } from '../carts/entities/cart-item.entity';
import { EmailOutbox } from '../notifications/entities/email-outbox.entity';
import { Campaign } from './entities/campaign.entity';
import { CreateProducts1792400315297 } from '../migrations/1792400315297-CreateProducts';
import { CreateOrders1792500800000 } from '../migrations/1792500800000-CreateOrders';
import { CreateCustomersAndSessions1792600000000 } from '../migrations/1792600000000-CreateCustomersAndSessions';
import { CreateCarts1792700000000 } from '../migrations/1792700000000-CreateCarts';
import { CreateNewsletterSubscriptions1792800000000 } from '../migrations/1792800000000-CreateNewsletterSubscriptions';
import { AddCheckoutFieldsToOrders1792900000000 } from '../migrations/1792900000000-AddCheckoutFieldsToOrders';
import { OrderLifecycle1793000000000 } from '../migrations/1793000000000-OrderLifecycle';
import { ProductManagement1793100000000 } from '../migrations/1793100000000-ProductManagement';
import { EmailOutbox1793200000000 } from '../migrations/1793200000000-EmailOutbox';
import { NewsletterConsent1793300000000 } from '../migrations/1793300000000-NewsletterConsent';
import { EmailSettings1793400000000 } from '../migrations/1793400000000-EmailSettings';
import { MarketingAllowanceLedger1793500000000 } from '../migrations/1793500000000-MarketingAllowanceLedger';
import { Campaigns1793600000000 } from '../migrations/1793600000000-Campaigns';
import { EmailOutboxMarketingEvents1793700000000 } from '../migrations/1793700000000-EmailOutboxMarketingEvents';
import { EmailOutboxSubscriberKind1793800000000 } from '../migrations/1793800000000-EmailOutboxSubscriberKind';

/**
 * Real-database verification of the audience preview.
 *
 * Creates a dedicated `gifting_audience_test` database, applies every
 * migration and exercises the segmentation SQL against Postgres instead of a
 * mocked query layer. The database is dropped afterwards.
 */

const TEST_DATABASE = 'gifting_audience_test';
const MAINTENANCE_DATABASE = 'postgres';

const host = process.env.DB_HOST ?? '127.0.0.1';
const port = Number(process.env.DB_PORT ?? 5432);
const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;
if (!username || !password) {
  throw new Error(
    'Audience integration tests require DB_USERNAME and DB_PASSWORD (see backend/.env).',
  );
}

async function withMaintenanceDatabase<T>(
  run: (dataSource: DataSource) => Promise<T>,
): Promise<T> {
  const maintenance = new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database: MAINTENANCE_DATABASE,
    synchronize: false,
  });
  await maintenance.initialize();
  try {
    return await run(maintenance);
  } finally {
    await maintenance.destroy();
  }
}

let dataSource: DataSource;
let service: AudienceService;
let referenceCounter = 0;
let productSlugCounter = 0;
let googleSubCounter = 0;

beforeAll(async () => {
  await withMaintenanceDatabase(async (maintenance) => {
    await maintenance.query(
      `DROP DATABASE IF EXISTS ${TEST_DATABASE} WITH (FORCE)`,
    );
    await maintenance.query(`CREATE DATABASE ${TEST_DATABASE}`);
  });

  dataSource = new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database: TEST_DATABASE,
    entities: [
      Product,
      ProductImage,
      StockAdjustment,
      Order,
      OrderItem,
      OrderStatusHistory,
      EmailOutbox,
      Customer,
      CustomerSession,
      Cart,
      CartItem,
      Newsletter,
      Campaign,
    ],
    migrations: [
      CreateProducts1792400315297,
      CreateOrders1792500800000,
      CreateCustomersAndSessions1792600000000,
      CreateCarts1792700000000,
      CreateNewsletterSubscriptions1792800000000,
      AddCheckoutFieldsToOrders1792900000000,
      OrderLifecycle1793000000000,
      ProductManagement1793100000000,
      EmailOutbox1793200000000,
      NewsletterConsent1793300000000,
      EmailSettings1793400000000,
      MarketingAllowanceLedger1793500000000,
      Campaigns1793600000000,
      EmailOutboxMarketingEvents1793700000000,
      EmailOutboxSubscriberKind1793800000000,
    ],
    synchronize: false,
  });
  await dataSource.initialize();
  await dataSource.runMigrations();

  service = new AudienceService(dataSource);
}, 120000);

afterAll(async () => {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
  }
  await withMaintenanceDatabase(async (maintenance) => {
    await maintenance.query(
      `DROP DATABASE IF EXISTS ${TEST_DATABASE} WITH (FORCE)`,
    );
  });
}, 60000);

beforeEach(async () => {
  await dataSource.query(
    `TRUNCATE order_items, orders, customers, products, newsletter_subscriptions RESTART IDENTITY CASCADE`,
  );
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

async function seedSubscriber(
  email: string,
  status: 'pending_confirmation' | 'subscribed' | 'unsubscribed' = 'subscribed',
): Promise<void> {
  await dataSource.query(
    `INSERT INTO newsletter_subscriptions (email, status, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())`,
    [email, status],
  );
}

interface ProductSeed {
  slug?: string;
  category?: string;
  price?: string;
}

async function seedProduct(seed: ProductSeed = {}): Promise<number> {
  const slug = seed.slug ?? `test-product-${productSlugCounter++}`;
  const result = await dataSource.query<Array<{ id: number }>>(
    `INSERT INTO products (name, slug, description, price, stock_quantity, category, is_active)
     VALUES ($1, $2, 'Description', $3, 10, $4, TRUE)
     RETURNING id`,
    ['Test Product', slug, seed.price ?? '10.00', seed.category ?? 'Tea'],
  );
  return result[0].id;
}

async function seedCustomer(email: string): Promise<number> {
  const result = await dataSource.query<Array<{ id: number }>>(
    `INSERT INTO customers (google_sub, email, display_name, role)
     VALUES ($1, $2, 'Test Customer', 'customer')
     RETURNING id`,
    [`sub-${googleSubCounter++}-${Date.now()}`, email],
  );
  return result[0].id;
}

interface SeedItem {
  productId?: number | null;
  lineTotal?: string;
  quantity?: number;
  unitPrice?: string;
}

interface SeedOrder {
  email?: string;
  customerId?: number | null;
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus?: string;
  paidAt?: Date | null;
  createdAt?: Date;
  items?: SeedItem[];
}

async function seedOrder(seed: SeedOrder = {}): Promise<number> {
  const items = seed.items ?? [{ lineTotal: '25.00' }];
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.lineTotal ?? '0'),
    0,
  );
  const total = subtotal.toFixed(2);
  const paidAt = seed.paidAt === undefined ? new Date() : seed.paidAt;
  const createdAt = seed.createdAt ?? paidAt ?? new Date();

  const result = await dataSource.query<Array<{ id: number }>>(
    `INSERT INTO orders (
       order_reference, customer_id, customer_name, customer_email,
       delivery_line1, delivery_city, delivery_postcode, delivery_country,
       subtotal_amount, shipping_amount, total_amount,
       order_status, payment_status, paid_at, created_at, updated_at
     ) VALUES ($1,$2,'Test Customer',$3,'1 Test Street','Test City','12345','Test Country',
       $4, 0, $4, $5, $6, $7, $8, $8) RETURNING id`,
    [
      `T10-${Date.now().toString(36)}-${referenceCounter++}`,
      seed.customerId ?? null,
      seed.email ?? 'guest-order@example.com',
      total,
      seed.orderStatus ?? 'pending',
      seed.paymentStatus ?? 'paid',
      paidAt,
      createdAt,
    ],
  );
  const orderId = result[0].id;

  for (const item of items) {
    await dataSource.query(
      `INSERT INTO order_items (
         order_id, product_id, product_name, product_slug,
         unit_price, quantity, line_total
       ) VALUES ($1,$2,'Test Item','test-item-slug',$3,$4,$5)`,
      [
        orderId,
        item.productId ?? null,
        item.unitPrice ?? item.lineTotal ?? '0.00',
        item.quantity ?? 1,
        item.lineTotal ?? '0.00',
      ],
    );
  }

  return orderId;
}

const daysAgo = (days: number): Date =>
  new Date(Date.now() - Math.round(days * 86400000));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AudienceService (real database)', () => {
  describe('eligibility', () => {
    it('returns all confirmed subscribers for an empty definition', async () => {
      await seedSubscriber('eligible-one@example.com');
      await seedSubscriber('eligible-two@example.com');
      await seedSubscriber('pending@example.com', 'pending_confirmation');
      await seedSubscriber('unsubscribed@example.com', 'unsubscribed');
      await seedSubscriber('not-an-email-address');

      const result = await service.countEligible({});

      expect(result.count).toBe(2);
      expect(result.sampleEmails).toHaveLength(2);
      expect(result.sampleEmails).toContain('eli***@example.com');
    });

    it('excludes unconfirmed and unsubscribed subscribers even with filters', async () => {
      await seedSubscriber(
        'pending-filter@example.com',
        'pending_confirmation',
      );
      await seedSubscriber('gone-filter@example.com', 'unsubscribed');
      await seedSubscriber('eligible-filter@example.com');

      const result = await service.countEligible({ ltv: { min: 0 } });

      expect(result.count).toBe(1);
    });

    it('matches orders written with different case and padding', async () => {
      await seedSubscriber('casematch@example.com');
      await seedOrder({ email: '  CaseMatch@EXAMPLE.com  ' });

      const result = await service.countEligible({ firstTimePurchaser: {} });

      expect(result.count).toBe(1);
    });
  });

  describe('firstTimePurchaser', () => {
    it('includes exactly one qualifying purchase', async () => {
      await seedSubscriber('one-purchase@example.com');
      await seedOrder({ email: 'one-purchase@example.com' });
      await seedSubscriber('two-purchases@example.com');
      await seedOrder({ email: 'two-purchases@example.com' });
      await seedOrder({ email: 'two-purchases@example.com' });
      await seedSubscriber('no-purchase@example.com');

      const result = await service.countEligible({ firstTimePurchaser: {} });

      expect(result.count).toBe(1);
      expect(result.sampleEmails).toEqual(['one***@example.com']);
    });

    it('ignores unpaid, cancelled and refunded orders', async () => {
      await seedSubscriber('unpaid-only@example.com');
      await seedOrder({
        email: 'unpaid-only@example.com',
        paymentStatus: 'unpaid',
      });
      await seedSubscriber('cancelled-only@example.com');
      await seedOrder({
        email: 'cancelled-only@example.com',
        paymentStatus: 'paid',
        orderStatus: 'cancelled',
      });
      await seedSubscriber('refunded-only@example.com');
      await seedOrder({
        email: 'refunded-only@example.com',
        paymentStatus: 'refunded',
      });
      await seedSubscriber('qualifying@example.com');
      await seedOrder({
        email: 'qualifying@example.com',
        paymentStatus: 'paid',
      });

      const result = await service.countEligible({ firstTimePurchaser: {} });

      expect(result.count).toBe(1);
      expect(result.sampleEmails).toEqual(['qua***@example.com']);
    });

    it('counts a qualifying order plus a non-qualifying one as first-time', async () => {
      await seedSubscriber('mixed-quality@example.com');
      await seedOrder({
        email: 'mixed-quality@example.com',
        paymentStatus: 'paid',
      });
      await seedOrder({
        email: 'mixed-quality@example.com',
        paymentStatus: 'paid',
        orderStatus: 'cancelled',
      });

      const result = await service.countEligible({ firstTimePurchaser: {} });

      expect(result.count).toBe(1);
    });
  });

  describe('repeatPurchaser', () => {
    it('requires at least two qualifying purchases', async () => {
      await seedSubscriber('repeat-two@example.com');
      await seedOrder({ email: 'repeat-two@example.com' });
      await seedOrder({ email: 'repeat-two@example.com' });
      await seedSubscriber('repeat-one@example.com');
      await seedOrder({ email: 'repeat-one@example.com' });
      await seedSubscriber('repeat-cancelled@example.com');
      await seedOrder({ email: 'repeat-cancelled@example.com' });
      await seedOrder({
        email: 'repeat-cancelled@example.com',
        orderStatus: 'cancelled',
      });
      await seedSubscriber('repeat-refunded@example.com');
      await seedOrder({ email: 'repeat-refunded@example.com' });
      await seedOrder({
        email: 'repeat-refunded@example.com',
        paymentStatus: 'refunded',
      });

      const result = await service.countEligible({ repeatPurchaser: {} });

      expect(result.count).toBe(1);
      expect(result.sampleEmails).toEqual(['rep***@example.com']);
    });
  });

  describe('noRecentPurchase', () => {
    it('includes subscribers whose last qualifying purchase is older than the window', async () => {
      await seedSubscriber('stale-buyer@example.com');
      await seedOrder({
        email: 'stale-buyer@example.com',
        paidAt: daysAgo(40),
      });
      await seedSubscriber('recent-buyer@example.com');
      await seedOrder({
        email: 'recent-buyer@example.com',
        paidAt: daysAgo(10),
      });
      await seedSubscriber('never-bought@example.com');

      const result = await service.countEligible({
        noRecentPurchase: { days: 30 },
      });

      expect(result.count).toBe(2);
      expect(result.sampleEmails).toEqual(
        expect.arrayContaining(['sta***@example.com', 'nev***@example.com']),
      );
      expect(result.sampleEmails).not.toContain('rec***@example.com');
    });

    it('treats a purchase exactly at the window boundary as recent', async () => {
      await seedSubscriber('boundary-buyer@example.com');
      await seedOrder({
        email: 'boundary-buyer@example.com',
        paidAt: new Date(Date.now() - 30 * 86400000 + 60 * 60 * 1000),
      });

      const inside = await service.countEligible({
        noRecentPurchase: { days: 30 },
      });

      expect(inside.count).toBe(0);

      await dataSource.query(
        `TRUNCATE orders, order_items RESTART IDENTITY CASCADE`,
      );
      await seedOrder({
        email: 'boundary-buyer@example.com',
        paidAt: new Date(Date.now() - 30 * 86400000 - 60 * 60 * 1000),
      });

      const outside = await service.countEligible({
        noRecentPurchase: { days: 30 },
      });

      expect(outside.count).toBe(1);
    });

    it('does not count refunded or cancelled orders as recent purchases', async () => {
      await seedSubscriber('refund-stale@example.com');
      await seedOrder({
        email: 'refund-stale@example.com',
        paymentStatus: 'refunded',
        paidAt: daysAgo(5),
      });
      await seedSubscriber('cancel-stale@example.com');
      await seedOrder({
        email: 'cancel-stale@example.com',
        orderStatus: 'cancelled',
        paidAt: daysAgo(5),
      });

      const result = await service.countEligible({
        noRecentPurchase: { days: 30 },
      });

      expect(result.count).toBe(2);
    });
  });

  describe('ltv', () => {
    it('applies the minimum and maximum bounds to qualifying spend', async () => {
      await seedSubscriber('ltv-low@example.com');
      await seedOrder({
        email: 'ltv-low@example.com',
        items: [{ lineTotal: '99.99' }],
      });
      await seedSubscriber('ltv-boundary-min@example.com');
      await seedOrder({
        email: 'ltv-boundary-min@example.com',
        items: [{ lineTotal: '100.00' }],
      });
      await seedSubscriber('ltv-boundary-max@example.com');
      await seedOrder({
        email: 'ltv-boundary-max@example.com',
        items: [{ lineTotal: '500.00' }],
      });
      await seedSubscriber('ltv-high@example.com');
      await seedOrder({
        email: 'ltv-high@example.com',
        items: [{ lineTotal: '500.01' }],
      });

      const result = await service.countEligible({
        ltv: { min: 100, max: 500 },
      });

      expect(result.count).toBe(2);
      expect(result.sampleEmails).toEqual(
        expect.arrayContaining(['ltv***@example.com']),
      );
    });

    it('sums line totals across qualifying orders only', async () => {
      await seedSubscriber('ltv-sum@example.com');
      await seedOrder({
        email: 'ltv-sum@example.com',
        items: [{ lineTotal: '60.00' }],
      });
      await seedOrder({
        email: 'ltv-sum@example.com',
        items: [{ lineTotal: '25.00' }, { lineTotal: '15.00' }],
      });
      await seedOrder({
        email: 'ltv-sum@example.com',
        items: [{ lineTotal: '1000.00' }],
        paymentStatus: 'refunded',
      });

      const result = await service.countEligible({
        ltv: { min: 100, max: 100 },
      });

      expect(result.count).toBe(1);
    });

    it('supports a minimum-only and a maximum-only bound', async () => {
      await seedSubscriber('ltv-min-only@example.com');
      await seedOrder({
        email: 'ltv-min-only@example.com',
        items: [{ lineTotal: '150.00' }],
      });
      await seedSubscriber('ltv-max-only@example.com');
      await seedOrder({
        email: 'ltv-max-only@example.com',
        items: [{ lineTotal: '50.00' }],
      });
      // A subscriber who never purchased has 0 qualifying spend.
      await seedSubscriber('ltv-never@example.com');

      const minOnly = await service.countEligible({ ltv: { min: 100 } });
      expect(minOnly.count).toBe(1);
      expect(minOnly.sampleEmails).toContain('ltv***@example.com');

      const maxOnly = await service.countEligible({ ltv: { max: 100 } });
      expect(maxOnly.count).toBe(2);
    });
  });

  describe('productIds', () => {
    it('matches a qualifying order containing any specified product', async () => {
      const tea = await seedProduct({ category: 'Tea' });
      const coffee = await seedProduct({ category: 'Coffee' });

      await seedSubscriber('product-tea@example.com');
      await seedOrder({
        email: 'product-tea@example.com',
        items: [{ productId: tea, lineTotal: '20.00' }],
      });
      await seedSubscriber('product-coffee@example.com');
      await seedOrder({
        email: 'product-coffee@example.com',
        items: [{ productId: coffee, lineTotal: '20.00' }],
      });
      await seedSubscriber('product-none@example.com');

      const result = await service.countEligible({
        productIds: [String(tea)],
      });

      expect(result.count).toBe(1);
      expect(result.sampleEmails).toEqual(['pro***@example.com']);
    });

    it('accepts any of the supplied product IDs', async () => {
      const tea = await seedProduct({ category: 'Tea' });
      const coffee = await seedProduct({ category: 'Coffee' });

      await seedSubscriber('product-either@example.com');
      await seedOrder({
        email: 'product-either@example.com',
        items: [{ productId: coffee, lineTotal: '20.00' }],
      });

      const result = await service.countEligible({
        productIds: [String(tea), String(coffee)],
      });

      expect(result.count).toBe(1);
    });

    it('ignores unpaid orders containing the product', async () => {
      const tea = await seedProduct({ category: 'Tea' });
      await seedSubscriber('product-unpaid@example.com');
      await seedOrder({
        email: 'product-unpaid@example.com',
        paymentStatus: 'unpaid',
        items: [{ productId: tea, lineTotal: '20.00' }],
      });

      const result = await service.countEligible({
        productIds: [String(tea)],
      });

      expect(result.count).toBe(0);
    });

    it('treats an empty productIds array as no filter', async () => {
      await seedSubscriber('product-empty@example.com');

      const result = await service.countEligible({ productIds: [] });

      expect(result.count).toBe(1);
    });
  });

  describe('categories', () => {
    it('matches products by their current category, case-insensitively', async () => {
      const tea = await seedProduct({ category: 'Tea' });
      await seedSubscriber('category-tea@example.com');
      await seedOrder({
        email: 'category-tea@example.com',
        items: [{ productId: tea, lineTotal: '20.00' }],
      });

      const lower = await service.countEligible({ categories: ['tea'] });
      expect(lower.count).toBe(1);

      const upper = await service.countEligible({ categories: ['TEA'] });
      expect(upper.count).toBe(1);
    });

    it('uses the current Product record rather than the purchase-time category', async () => {
      const product = await seedProduct({ category: 'Tea' });
      await seedSubscriber('category-current@example.com');
      await seedOrder({
        email: 'category-current@example.com',
        items: [{ productId: product, lineTotal: '20.00' }],
      });
      await dataSource.query(
        `UPDATE products SET category = 'Coffee' WHERE id = $1`,
        [product],
      );

      const stale = await service.countEligible({ categories: ['tea'] });
      expect(stale.count).toBe(0);

      const current = await service.countEligible({ categories: ['coffee'] });
      expect(current.count).toBe(1);
    });
  });

  describe('missing or deleted products', () => {
    it('does not match product filters for missing products', async () => {
      await seedSubscriber('deleted-items@example.com');
      await seedOrder({
        email: 'deleted-items@example.com',
        items: [
          { productId: null, lineTotal: '20.00' },
          { productId: null, lineTotal: '30.00' },
        ],
      });

      const categories = await service.countEligible({
        categories: ['tea'],
      });
      expect(categories.count).toBe(0);

      const productIds = await service.countEligible({ productIds: ['1'] });
      expect(productIds.count).toBe(0);
    });

    it('still applies unrelated purchase filters when products are missing', async () => {
      await seedSubscriber('deleted-unaffected@example.com');
      await seedOrder({
        email: 'deleted-unaffected@example.com',
        items: [{ productId: null, lineTotal: '100.00' }],
      });

      const result = await service.countEligible({
        firstTimePurchaser: {},
        ltv: { min: 100 },
      });

      expect(result.count).toBe(1);
    });
  });

  describe('guest and customer-linked identity matching', () => {
    it('associates guest purchases through the checkout email', async () => {
      await seedSubscriber('guest-match@example.com');
      await seedOrder({ email: 'guest-match@example.com', customerId: null });

      const result = await service.countEligible({ firstTimePurchaser: {} });

      expect(result.count).toBe(1);
    });

    it('associates customer-linked purchases through the account email', async () => {
      const customerId = await seedCustomer('account-match@example.com');
      await seedSubscriber('account-match@example.com');
      await seedOrder({
        email: 'snapshot-differs@example.com',
        customerId,
      });

      const result = await service.countEligible({ firstTimePurchaser: {} });

      expect(result.count).toBe(1);
      expect(result.sampleEmails).toEqual(['acc***@example.com']);
    });

    it('matches a customer-linked order via both the account and the snapshot email', async () => {
      const customerId = await seedCustomer('dual-match@example.com');
      await seedSubscriber('dual-match@example.com');
      await seedSubscriber('snapshot-only@example.com');
      await seedOrder({ email: 'snapshot-only@example.com', customerId });

      const result = await service.countEligible({ ltv: { min: 1000 } });

      expect(result.count).toBe(0);

      // The 25.00 order is visible to both identities but must not be
      // double-counted within either one.
      const exact = await service.countEligible({ ltv: { min: 25, max: 25 } });
      expect(exact.count).toBe(2);

      const withBoth = await service.countEligible({ firstTimePurchaser: {} });
      expect(withBoth.count).toBe(2);
    });

    it('does not double-count an order that matches both email branches', async () => {
      const customerId = await seedCustomer('dedupe-match@example.com');
      await seedSubscriber('dedupe-match@example.com');
      await seedOrder({ email: 'dedupe-match@example.com', customerId });

      const firstTime = await service.countEligible({
        firstTimePurchaser: {},
      });
      expect(firstTime.count).toBe(1);

      const repeat = await service.countEligible({ repeatPurchaser: {} });
      expect(repeat.count).toBe(0);

      const ltv = await service.countEligible({ ltv: { min: 25, max: 25 } });
      expect(ltv.count).toBe(1);
    });
  });

  describe('multiple filters', () => {
    it('applies AND logic across filters', async () => {
      const tea = await seedProduct({ category: 'Tea' });

      await seedSubscriber('and-all-match@example.com');
      await seedOrder({
        email: 'and-all-match@example.com',
        paidAt: daysAgo(100),
        items: [{ productId: tea, lineTotal: '150.00' }],
      });
      await seedOrder({
        email: 'and-all-match@example.com',
        paidAt: daysAgo(90),
        items: [{ productId: tea, lineTotal: '150.00' }],
      });

      await seedSubscriber('and-ltv-fails@example.com');
      await seedOrder({
        email: 'and-ltv-fails@example.com',
        paidAt: daysAgo(100),
        items: [{ productId: tea, lineTotal: '10.00' }],
      });
      await seedOrder({
        email: 'and-ltv-fails@example.com',
        paidAt: daysAgo(90),
        items: [{ productId: tea, lineTotal: '10.00' }],
      });

      const result = await service.countEligible({
        repeatPurchaser: {},
        ltv: { min: 100 },
        productIds: [String(tea)],
        categories: ['tea'],
        noRecentPurchase: { days: 30 },
      });

      expect(result.count).toBe(1);
      expect(result.sampleEmails).toEqual(['and***@example.com']);
    });
  });

  describe('query count', () => {
    it('issues exactly one query and does not grow with subscriber count', async () => {
      const prototype = Object.getPrototypeOf(dataSource) as DataSource;

      for (const size of [1, 5, 25]) {
        await dataSource.query(
          `TRUNCATE order_items, orders, customers, products, newsletter_subscriptions RESTART IDENTITY CASCADE`,
        );
        const productIds: number[] = [];
        for (let index = 0; index < size; index += 1) {
          const productId = await seedProduct({
            slug: `scale-${size}-${index}`,
            category: 'Tea',
          });
          productIds.push(productId);
          const email = `scale-${size}-${index}@example.com`;
          await seedSubscriber(email);
          await seedOrder({
            email,
            items: [{ productId, lineTotal: '20.00' }],
          });
          await seedOrder({
            email,
            items: [{ productId, lineTotal: '20.00' }],
          });
        }

        let queryCount = 0;
        const countingQuery = (sql: string, params?: unknown[]) => {
          queryCount += 1;
          return prototype.query.call(
            dataSource,
            sql,
            params ?? [],
          ) as Promise<unknown>;
        };
        (dataSource as unknown as { query: typeof countingQuery }).query =
          countingQuery;
        try {
          const result = await service.countEligible({
            repeatPurchaser: {},
            ltv: { min: 10 },
            productIds: productIds.map(String),
            categories: ['tea'],
          });

          expect(result.count).toBe(size);
        } finally {
          delete (dataSource as unknown as { query?: unknown }).query;
        }

        expect(queryCount).toBe(1);
      }
    }, 120000);
  });

  describe('sample masking', () => {
    it('returns at most five masked emails', async () => {
      for (let index = 0; index < 7; index += 1) {
        await seedSubscriber(`mask-${index}@example.com`);
      }

      const result = await service.countEligible({});

      expect(result.count).toBe(7);
      expect(result.sampleEmails).toHaveLength(5);
      for (const email of result.sampleEmails) {
        expect(email).toMatch(/^mas\*\*\*/);
        expect(email).not.toContain('mask-0');
      }
    });
  });
});
