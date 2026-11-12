import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { Product } from '../products/entities/product.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Order } from './entities/order.entity';
import { OrderManagementService } from './order-management.service';

type HistoryEntry = Partial<OrderStatusHistory>;
type OrderItemRow = OrderItem;

let nextOrderId = 0;
let nextItemId = 0;

function makeOrder(overrides: Partial<Order> = {}): Order {
  const id = overrides.id ?? ++nextOrderId;
  const createdAt = overrides.createdAt ?? new Date('2026-05-01T10:00:00Z');

  return {
    id,
    orderReference: `order-${id}`,
    customerId: 42,
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    recipientName: 'Jane Doe',
    deliveryLine1: '12 Market Road',
    deliveryLine2: null,
    deliveryCity: 'Jaipur',
    deliveryPostcode: '302001',
    deliveryCountry: 'India',
    giftMessage: null,
    subtotalAmount: '9.00',
    shippingAmount: '49.00',
    totalAmount: '58.00',
    orderStatus: 'pending',
    paymentStatus: 'unpaid',
    idempotencyKey: null,
    confirmationTokenHash: null,
    paidAt: null,
    cancelledAt: null,
    stockRestoredAt: null,
    paymentReference: null,
    items: [],
    statusHistory: [],
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  } as Order;
}

function makeItem(
  orderId: number,
  overrides: Partial<OrderItemRow> = {},
): OrderItemRow {
  const id = overrides.id ?? ++nextItemId;
  return {
    id,
    orderId,
    productId: 1,
    productName: 'Kraft Gift Box',
    productSlug: 'kraft-gift-box',
    unitPrice: '4.50',
    quantity: 2,
    lineTotal: '9.00',
    createdAt: new Date('2026-05-01T10:00:00Z'),
    ...overrides,
  } as OrderItemRow;
}

function makeProduct(stockQuantity = 5): Product {
  return {
    id: 1,
    name: 'Kraft Gift Box',
    slug: 'kraft-gift-box',
    description: 'A sturdy kraft gift box.',
    price: '4.50',
    stockQuantity,
    imageUrl: null,
    category: 'gift boxes',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
}

function isFindOperator(
  value: unknown,
): value is { type: string; value: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'value' in value
  );
}

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (isFindOperator(expected)) {
    if (expected.type === 'in') {
      return (expected.value as unknown[]).includes(actual);
    }
    if (expected.type === 'ilike') {
      const needle = String(expected.value).replace(/%/g, '').toLowerCase();
      return String(actual ?? '')
        .toLowerCase()
        .includes(needle);
    }
    return actual === expected.value;
  }

  return actual === expected;
}

function matchesWhere(
  record: Record<string, unknown>,
  where: unknown,
): boolean {
  if (!where) return true;
  if (Array.isArray(where)) {
    return where.some((entry) => matchesWhere(record, entry));
  }

  return Object.entries(where as Record<string, unknown>).every(
    ([key, expected]) => matchesValue(record[key], expected),
  );
}

class FakeStore {
  readonly orders: Order[];
  readonly items: OrderItemRow[];
  readonly history: OrderStatusHistory[] = [];
  readonly products = new Map<number, Product>();
  readonly restoreCalls: Array<{ id: number; quantity: number }> = [];
  private historyId = 0;
  private tail: Promise<unknown> = Promise.resolve();

  constructor(input: {
    orders: Order[];
    items?: OrderItemRow[];
    products?: Product[];
  }) {
    this.orders = input.orders;
    this.items = input.items ?? [];
    for (const order of this.orders) {
      const orderItems = this.items.filter((item) => item.orderId === order.id);
      order.items = orderItems;
    }
    for (const product of input.products ?? []) {
      this.products.set(product.id, product);
    }
  }

  readonly dataSource = {
    transaction: <T>(callback: (manager: EntityManager) => Promise<T>) => {
      const run = this.tail.then(() => callback(this.manager()));
      this.tail = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
    getRepository: (entity: unknown) => this.repositoryFor(entity),
  } as unknown as DataSource;

  private manager(): EntityManager {
    return {
      getRepository: (entity: unknown) => this.repositoryFor(entity),
    } as unknown as EntityManager;
  }

  private repositoryFor(entity: unknown): unknown {
    if (entity === Order) return this.orderRepository();
    if (entity === OrderItem) return this.orderItemRepository();
    if (entity === OrderStatusHistory) return this.historyRepository();
    if (entity === Product) return this.productRepository();
    throw new Error('Unexpected repository request');
  }

  private orderRepository() {
    return {
      findOne: async (options?: {
        where?: unknown;
        relations?: { items?: boolean; statusHistory?: boolean };
      }) => {
        const match = this.orders.find((order) =>
          matchesWhere(
            order as unknown as Record<string, unknown>,
            options?.where,
          ),
        );
        return match ? this.decorate(match, options?.relations) : null;
      },
      findAndCount: async (options: {
        where?: unknown;
        skip?: number;
        take?: number;
        relations?: { items?: boolean; statusHistory?: boolean };
      }) => {
        const filtered = this.sorted(
          this.orders.filter((order) =>
            matchesWhere(
              order as unknown as Record<string, unknown>,
              options.where,
            ),
          ),
        );
        const start = options.skip ?? 0;
        const end = start + (options.take ?? filtered.length);
        return [
          filtered
            .slice(start, end)
            .map((order) => this.decorate(order, options.relations)),
          filtered.length,
        ];
      },
      find: async (options: { take?: number } = {}) => {
        return this.sorted(this.orders).slice(0, options.take ?? undefined);
      },
      count: async (options?: { where?: unknown }) => {
        return this.orders.filter((order) =>
          matchesWhere(
            order as unknown as Record<string, unknown>,
            options?.where,
          ),
        ).length;
      },
      save: async (order: Order) => {
        order.updatedAt = new Date();
        if (!this.orders.includes(order)) {
          this.orders.push(order);
        }
        return order;
      },
      createQueryBuilder: () => {
        const builder = {
          select: () => builder,
          where: () => builder,
          andWhere: () => builder,
          getRawOne: async () => {
            const revenue = this.orders
              .filter(
                (order) =>
                  order.paymentStatus === 'paid' &&
                  order.orderStatus !== 'cancelled',
              )
              .reduce((total, order) => total + Number(order.totalAmount), 0);
            return { revenue: revenue.toFixed(2) };
          },
        };
        return builder;
      },
    };
  }

  private orderItemRepository() {
    return {
      find: async (options: {
        where?: unknown;
        order?: { id?: 'ASC' | 'DESC' };
      } = {}) => {
        const filtered = this.items.filter((item) =>
          matchesWhere(
            item as unknown as Record<string, unknown>,
            options.where,
          ),
        );
        return [...filtered].sort((left, right) =>
          options.order?.id === 'DESC' ? right.id - left.id : left.id - right.id,
        );
      },
    };
  }

  private historyRepository() {
    return {
      create: (value: HistoryEntry) => value,
      save: async (value: HistoryEntry) => {
        const createdAt =
          value.createdAt instanceof Date ? value.createdAt : new Date();
        const entry = {
          id: ++this.historyId,
          orderId: value.orderId!,
          category: value.category!,
          fromStatus: value.fromStatus ?? null,
          toStatus: value.toStatus!,
          note: value.note ?? null,
          actorType: value.actorType!,
          actorId: value.actorId ?? null,
          createdAt,
        } as OrderStatusHistory;
        this.history.push(entry);
        return entry;
      },
    };
  }

  private productRepository() {
    return {
      createQueryBuilder: () => {
        let parameters: { id: number; quantity: number } | null = null;
        const builder = {
          update: () => builder,
          set: () => builder,
          where: () => builder,
          setParameters: (value: { id: number; quantity: number }) => {
            parameters = value;
            return builder;
          },
          execute: async () => {
            if (!parameters) throw new Error('Missing restock parameters');
            this.restoreCalls.push(parameters);
            const product = this.products.get(parameters.id);
            if (product) {
              product.stockQuantity += parameters.quantity;
            }
            return { affected: 1 };
          },
        };
        return builder;
      },
    };
  }

  private decorate(
    order: Order,
    relations?: { items?: boolean; statusHistory?: boolean },
  ): Order {
    if (relations?.items) {
      order.items = this.items
        .filter((item) => item.orderId === order.id)
        .sort((left, right) => left.id - right.id);
    }
    if (relations?.statusHistory) {
      order.statusHistory = this.history
        .filter((entry) => entry.orderId === order.id)
        .sort(
          (left, right) =>
            left.createdAt.getTime() - right.createdAt.getTime() ||
            left.id - right.id,
        );
    }
    return order;
  }

  private sorted(orders: Order[]): Order[] {
    return [...orders].sort(
      (left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() ||
        right.id - left.id,
    );
  }
}

function makeService(store: FakeStore): OrderManagementService {
  return new OrderManagementService(store.dataSource);
}

describe('OrderManagementService customer history', () => {
  it('paginates a customer order list and hides other customers', async () => {
    const older = makeOrder({
      id: 1,
      createdAt: new Date('2026-05-01T10:00:00Z'),
    });
    const newer = makeOrder({
      id: 2,
      createdAt: new Date('2026-05-02T10:00:00Z'),
      orderStatus: 'confirmed',
    });
    const other = makeOrder({ id: 3, customerId: 99 });
    const store = new FakeStore({
      orders: [older, newer, other],
      items: [makeItem(1), makeItem(2), makeItem(3)],
    });
    const service = makeService(store);

    const firstPage = await service.listCustomerOrders(42, {
      page: 1,
      limit: 1,
    });

    expect(firstPage.total).toBe(2);
    expect(firstPage.page).toBe(1);
    expect(firstPage.limit).toBe(1);
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.items[0].orderReference).toBe(newer.orderReference);
    expect(firstPage.items[0].itemCount).toBe(2);
    expect(firstPage.items[0].canCancel).toBe(true);

    const secondPage = await service.listCustomerOrders(42, {
      page: 2,
      limit: 1,
    });
    expect(secondPage.items[0].orderReference).toBe(older.orderReference);
  });

  it('filters the list by fulfilment status', async () => {
    const pending = makeOrder({ id: 1 });
    const confirmed = makeOrder({ id: 2, orderStatus: 'confirmed' });
    const store = new FakeStore({ orders: [pending, confirmed] });
    const service = makeService(store);

    const result = await service.listCustomerOrders(42, {
      page: 1,
      limit: 10,
      status: 'confirmed',
    });

    expect(result.total).toBe(1);
    expect(result.items[0].orderReference).toBe(confirmed.orderReference);
  });

  it('returns a customer order with its timeline', async () => {
    const order = makeOrder();
    const store = new FakeStore({ orders: [order], items: [makeItem(order.id)] });

    const service = makeService(store);
    store.history.push({
      id: 1,
      orderId: order.id,
      category: 'fulfilment',
      fromStatus: null,
      toStatus: 'pending',
      note: 'Order created',
      actorType: 'customer',
      actorId: 42,
      createdAt: new Date('2026-05-01T10:00:00Z'),
    } as OrderStatusHistory);

    const detail = await service.getCustomerOrder(42, order.orderReference);

    expect(detail.orderReference).toBe(order.orderReference);
    expect(detail.items).toHaveLength(1);
    expect(detail.history).toHaveLength(1);
    expect(detail.history[0].toStatus).toBe('pending');
    expect(detail.delivery.city).toBe('Jaipur');
  });

  it('treats another customer’s order as not found', async () => {
    const other = makeOrder({ id: 1, customerId: 99 });
    const store = new FakeStore({ orders: [other] });
    const service = makeService(store);

    await expect(
      service.getCustomerOrder(42, other.orderReference),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('OrderManagementService customer cancellation', () => {
  it('cancels an unpaid order, restores stock and records history once', async () => {
    const order = makeOrder({ id: 1 });
    const product = makeProduct(5);
    const store = new FakeStore({
      orders: [order],
      items: [makeItem(order.id)],
      products: [product],
    });
    const service = makeService(store);

    const result = await service.cancelCustomerOrder(
      42,
      order.orderReference,
      { reason: 'Changed my mind' },
    );

    expect(result.orderStatus).toBe('cancelled');
    expect(result.stockRestored).toBe(true);
    expect(result.refundDue).toBe(false);
    expect(product.stockQuantity).toBe(7);
    expect(store.restoreCalls).toEqual([{ id: 1, quantity: 2 }]);
    expect(order.cancelledAt).toBeInstanceOf(Date);
    expect(order.stockRestoredAt).toBeInstanceOf(Date);
    expect(store.history.at(-1)).toMatchObject({
      category: 'fulfilment',
      fromStatus: 'pending',
      toStatus: 'cancelled',
      actorType: 'customer',
      actorId: 42,
      note: 'Changed my mind',
    });
  });

  it('rejects a duplicate cancellation without restocking twice', async () => {
    const order = makeOrder({ id: 1 });
    const product = makeProduct(5);
    const store = new FakeStore({
      orders: [order],
      items: [makeItem(order.id)],
      products: [product],
    });
    const service = makeService(store);

    await service.cancelCustomerOrder(42, order.orderReference, {});
    await expect(
      service.cancelCustomerOrder(42, order.orderReference, {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(product.stockQuantity).toBe(7);
    expect(store.restoreCalls).toHaveLength(1);
  });

  it('does not let a customer cancel a paid order', async () => {
    const order = makeOrder({
      id: 1,
      paymentStatus: 'paid',
      paidAt: new Date(),
      paymentReference: 'pay_123',
    });
    const product = makeProduct(5);
    const store = new FakeStore({
      orders: [order],
      items: [makeItem(order.id)],
      products: [product],
    });
    const service = makeService(store);

    await expect(
      service.cancelCustomerOrder(42, order.orderReference, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(order.orderStatus).toBe('pending');
    expect(product.stockQuantity).toBe(5);
    expect(store.restoreCalls).toHaveLength(0);
  });

  it('serialises concurrent cancellation attempts and restocks once', async () => {
    const order = makeOrder({ id: 1 });
    const product = makeProduct(5);
    const store = new FakeStore({
      orders: [order],
      items: [makeItem(order.id)],
      products: [product],
    });
    const service = makeService(store);

    const results = await Promise.allSettled([
      service.cancelCustomerOrder(42, order.orderReference, {}),
      service.cancelCustomerOrder(42, order.orderReference, {}),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(product.stockQuantity).toBe(7);
    expect(store.restoreCalls).toHaveLength(1);
  });
});

describe('OrderManagementService admin management', () => {
  it('paginates and filters the admin order list', async () => {
    const orders = [
      makeOrder({ id: 1, orderStatus: 'pending' }),
      makeOrder({ id: 2, orderStatus: 'confirmed' }),
      makeOrder({
        id: 3,
        orderStatus: 'delivered',
        paymentStatus: 'paid',
        paidAt: new Date(),
        paymentReference: 'pay_3',
      }),
    ];
    const store = new FakeStore({
      orders,
      items: [makeItem(1), makeItem(2), makeItem(3)],
    });
    const service = makeService(store);

    const page = await service.listAdminOrders({ page: 1, limit: 2 });
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(2);

    const filtered = await service.listAdminOrders({
      page: 1,
      limit: 10,
      status: 'delivered',
      paymentStatus: 'paid',
    });
    expect(filtered.total).toBe(1);
    expect(filtered.items[0].orderReference).toBe(orders[2].orderReference);
    expect(filtered.items[0].canCancel).toBe(false);
  });

  it('searches by customer name and reference', async () => {
    const jane = makeOrder({ id: 1, customerName: 'Jane Doe' });
    const arjun = makeOrder({
      id: 2,
      customerName: 'Arjun Rao',
      customerEmail: 'arjun@example.com',
      recipientName: 'Meera Rao',
    });
    const store = new FakeStore({ orders: [jane, arjun] });
    const service = makeService(store);

    const byName = await service.listAdminOrders({
      page: 1,
      limit: 10,
      search: 'arjun',
    });
    expect(byName.total).toBe(1);
    expect(byName.items[0].customerName).toBe('Arjun Rao');

    const byReference = await service.listAdminOrders({
      page: 1,
      limit: 10,
      search: jane.orderReference,
    });
    expect(byReference.total).toBe(1);
    expect(byReference.items[0].orderReference).toBe(jane.orderReference);
  });

  it('applies valid status transitions and rejects invalid ones', async () => {
    const order = makeOrder({ id: 1, orderStatus: 'pending' });
    const store = new FakeStore({ orders: [order] });
    const service = makeService(store);

    const updated = await service.updateAdminOrderStatus(
      7,
      order.orderReference,
      { status: 'confirmed', note: 'Payment arranged' },
    );

    expect(updated.orderStatus).toBe('confirmed');
    expect(order.orderStatus).toBe('confirmed');
    expect(store.history.at(-1)).toMatchObject({
      category: 'fulfilment',
      fromStatus: 'pending',
      toStatus: 'confirmed',
      actorType: 'admin',
      actorId: 7,
      note: 'Payment arranged',
    });

    await expect(
      service.updateAdminOrderStatus(7, order.orderReference, {
        status: 'shipped',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.updateAdminOrderStatus(7, order.orderReference, {
        status: 'confirmed',
      }),
    ).rejects.toThrow(/already marked/i);

    await expect(
      service.updateAdminOrderStatus(7, order.orderReference, {
        status: 'cancelled',
      }),
    ).rejects.toThrow(/cancellation endpoint/i);
  });

  it('cancels a paid order without faking a refund', async () => {
    const order = makeOrder({
      id: 1,
      orderStatus: 'processing',
      paymentStatus: 'paid',
      paidAt: new Date(),
      paymentReference: 'pay_123',
    });
    const product = makeProduct(5);
    const store = new FakeStore({
      orders: [order],
      items: [makeItem(order.id)],
      products: [product],
    });
    const service = makeService(store);

    const result = await service.cancelAdminOrder(7, order.orderReference, {
      reason: 'Customer called',
    });

    expect(result.orderStatus).toBe('cancelled');
    expect(result.stockRestored).toBe(true);
    expect(result.refundDue).toBe(true);
    expect(result.paymentStatus).toBe('paid');
    expect(order.paymentStatus).toBe('paid');
    expect(order.paymentReference).toBe('pay_123');
    expect(product.stockQuantity).toBe(7);
    expect(store.history.at(-1)).toMatchObject({
      actorType: 'admin',
      actorId: 7,
      fromStatus: 'processing',
      toStatus: 'cancelled',
      note: 'Customer called',
    });
  });

  it('refuses to cancel a shipped order', async () => {
    const order = makeOrder({ id: 1, orderStatus: 'shipped' });
    const store = new FakeStore({ orders: [order] });
    const service = makeService(store);

    await expect(
      service.cancelAdminOrder(7, order.orderReference, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(order.orderStatus).toBe('shipped');
  });
});

describe('OrderManagementService payment events', () => {
  it('marks an order paid only from a verified event', async () => {
    const order = makeOrder({ id: 1 });
    const store = new FakeStore({ orders: [order] });
    const service = makeService(store);

    const result = await service.applyVerifiedPaymentEvent({
      verified: true,
      provider: 'test-provider',
      eventId: 'evt_1',
      orderReference: order.orderReference,
      providerReference: 'pay_123',
      amount: '58.00',
      currency: 'INR',
      paidAt: new Date('2026-05-02T09:00:00Z'),
    });

    expect(result.paymentStatus).toBe('paid');
    expect(order.paymentStatus).toBe('paid');
    expect(order.paymentReference).toBe('pay_123');
    expect(order.paidAt).toBeInstanceOf(Date);
    expect(store.history.at(-1)).toMatchObject({
      category: 'payment',
      fromStatus: 'unpaid',
      toStatus: 'paid',
      actorType: 'system',
    });
  });

  it('rejects unverified and mismatched payment events', async () => {
    const order = makeOrder({ id: 1 });
    const store = new FakeStore({ orders: [order] });
    const service = makeService(store);

    await expect(
      service.applyVerifiedPaymentEvent({
        verified: false,
        provider: 'test-provider',
        eventId: 'evt_1',
        orderReference: order.orderReference,
        providerReference: 'pay_123',
        amount: '58.00',
        currency: 'INR',
        paidAt: new Date(),
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.applyVerifiedPaymentEvent({
        verified: true,
        provider: 'test-provider',
        eventId: 'evt_2',
        orderReference: order.orderReference,
        providerReference: 'pay_123',
        amount: '1.00',
        currency: 'INR',
        paidAt: new Date(),
      }),
    ).rejects.toThrow(/does not match/i);

    expect(order.paymentStatus).toBe('unpaid');
  });

  it('is idempotent for the same provider reference', async () => {
    const order = makeOrder({ id: 1 });
    const store = new FakeStore({ orders: [order] });
    const service = makeService(store);
    const event = {
      verified: true as const,
      provider: 'test-provider',
      eventId: 'evt_1',
      orderReference: order.orderReference,
      providerReference: 'pay_123',
      amount: '58.00',
      currency: 'INR' as const,
      paidAt: new Date(),
    };

    await service.applyVerifiedPaymentEvent(event);
    await service.applyVerifiedPaymentEvent({ ...event, eventId: 'evt_1_retry' });

    expect(
      store.history.filter((entry) => entry.category === 'payment'),
    ).toHaveLength(1);
  });
});
