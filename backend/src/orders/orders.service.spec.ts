import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { DataSource, EntityManager } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { Cart } from '../carts/entities/cart.entity';
import { CartsService } from '../carts/carts.service';
import { Product } from '../products/entities/product.entity';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';

const baseOrderFields = {
  id: 1,
  orderReference: '11111111-1111-4111-8111-111111111111',
  customerId: null,
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
  orderStatus: 'pending' as const,
  paymentStatus: 'unpaid' as const,
  idempotencyKey: null,
  confirmationTokenHash: 'a'.repeat(64),
  createdAt: new Date('2026-02-01T10:00:00Z'),
  updatedAt: new Date('2026-02-01T10:00:00Z'),
};

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Kraft Gift Box',
    slug: 'kraft-gift-box',
    description: 'A sturdy kraft gift box.',
    price: '4.50',
    stockQuantity: 5,
    imageUrl: null,
    category: 'gift boxes',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeCartItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    cartId: 7,
    productId: 1,
    quantity: 2,
    seenUnitPrice: '3.00',
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    ...baseOrderFields,
    customer: null,
    items: [
      {
        id: 1,
        orderId: 1,
        productId: 1,
        productName: 'Kraft Gift Box',
        productSlug: 'kraft-gift-box',
        unitPrice: '4.50',
        quantity: 2,
        lineTotal: '9.00',
        createdAt: new Date('2026-02-01T10:00:00Z'),
      } as OrderItem,
    ],
    ...overrides,
  } as Order;
}

function makeQueryBuilder(affected = 1) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.update = vi.fn(() => builder);
  builder.set = vi.fn(() => builder);
  builder.where = vi.fn(() => builder);
  builder.andWhere = vi.fn(() => builder);
  builder.setParameters = vi.fn(() => builder);
  builder.execute = vi.fn(async () => ({ affected }));
  return builder;
}

function makeManager(options: {
  products: Product[];
  affected?: number;
  existingOrder?: Order | null;
}) {
  let itemId = 0;
  const productRepository = {
    find: vi.fn().mockResolvedValue(options.products),
    createQueryBuilder: vi
      .fn()
      .mockImplementation(() => makeQueryBuilder(options.affected ?? 1)),
  };
  const orderRepository = {
    findOne: vi.fn().mockResolvedValue(options.existingOrder ?? null),
    create: vi.fn((value: Partial<Order>) => ({ ...value })),
    save: vi.fn(async (order: Partial<Order>) => ({
      ...order,
      id: 1,
      createdAt: new Date('2026-02-01T10:00:00Z'),
      updatedAt: new Date('2026-02-01T10:00:00Z'),
    })),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const orderItemRepository = {
    create: vi.fn((value: Partial<OrderItem>) => value),
    save: vi.fn(async (items: Partial<OrderItem>[]) =>
      items.map((item) => ({
        ...item,
        id: ++itemId,
        createdAt: new Date('2026-02-01T10:00:00Z'),
      })),
    ),
  };
  const historyRepository = {
    create: vi.fn((value: Partial<OrderStatusHistory>) => value),
    save: vi.fn(async (entries: Partial<OrderStatusHistory>[]) => entries),
  };

  const manager = {
    getRepository: vi.fn((entity: unknown) => {
      if (entity === Product) return productRepository;
      if (entity === Order) return orderRepository;
      if (entity === OrderItem) return orderItemRepository;
      if (entity === OrderStatusHistory) return historyRepository;
      throw new Error('Unexpected repository request');
    }),
  };

  return {
    manager: manager as unknown as EntityManager,
    productRepository,
    orderRepository,
    orderItemRepository,
    historyRepository,
  };
}

function makeCartsService(cart: Partial<Cart> | null, customerId: number | null = null) {
  const loadCheckoutCart = vi.fn().mockResolvedValue({
    cart: cart as Cart | null,
    customerId,
    cookie: { type: 'set', token: 'guest-token' },
  });
  const clearCheckoutCart = vi.fn().mockResolvedValue(undefined);

  return {
    cartsService: { loadCheckoutCart, clearCheckoutCart } as unknown as CartsService,
    loadCheckoutCart,
    clearCheckoutCart,
  };
}

function makeDataSource(manager: EntityManager, existingOrder: Order | null = null) {
  const orderRepository = {
    findOne: vi.fn().mockResolvedValue(existingOrder),
    update: vi.fn(async () => ({ affected: 1 })),
  };

  const dataSource = {
    transaction: vi.fn(async (callback: (manager: EntityManager) => unknown) =>
      callback(manager),
    ),
    getRepository: vi.fn(() => orderRepository),
    manager: { getRepository: vi.fn(() => orderRepository) },
  };

  return {
    dataSource: dataSource as unknown as DataSource,
    orderRepository,
  };
}

const guestRequest = { cookies: {} } as unknown as Request;

function makeDto(overrides: Partial<CreateCheckoutDto> = {}): CreateCheckoutDto {
  return {
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    deliveryLine1: '12 Market Road',
    deliveryCity: 'Jaipur',
    deliveryPostcode: '302001',
    deliveryCountry: 'India',
    giftMessage: 'Happy birthday',
    ...overrides,
  };
}

function makeCart(overrides: Record<string, unknown> = {}): Cart {
  return {
    id: 7,
    customerId: null,
    guestTokenHash: 'hash',
    lastActivityAt: new Date(),
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [makeCartItem()],
    ...overrides,
  } as unknown as Cart;
}

describe('OrdersService.createCheckoutOrder', () => {
  it('builds the order from the cart with database prices and totals', async () => {
    const product = makeProduct();
    const { manager, orderRepository, orderItemRepository } = makeManager({
      products: [product],
    });
    const carts = makeCartsService(makeCart());
    const { dataSource } = makeDataSource(manager);
    const service = new OrdersService(dataSource, carts.cartsService);

    const result = await service.createCheckoutOrder(
      guestRequest,
      makeDto({ idempotencyKey: 'checkout-key-123' }),
    );

    const savedOrder = orderRepository.save.mock.calls[0][0] as Order;
    // Cart's seen price (3.00) is ignored in favour of the database price (4.50).
    expect(savedOrder.subtotalAmount).toBe('9.00');
    expect(savedOrder.shippingAmount).toBe('49.00');
    expect(savedOrder.totalAmount).toBe('58.00');
    expect(savedOrder.customerId).toBeNull();
    expect(savedOrder.recipientName).toBe('Jane Doe');
    expect(savedOrder.giftMessage).toBe('Happy birthday');
    expect(savedOrder.idempotencyKey).toBe('checkout-key-123');
    expect(savedOrder.confirmationTokenHash).toMatch(/^[a-f0-9]{64}$/);

    const savedItems = orderItemRepository.save.mock.calls[0][0] as OrderItem[];
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0]).toMatchObject({
      productId: 1,
      productName: 'Kraft Gift Box',
      quantity: 2,
      unitPrice: '4.50',
      lineTotal: '9.00',
    });

    expect(carts.clearCheckoutCart).toHaveBeenCalledWith(manager, 7);
    expect(result.cookie).toEqual({ type: 'clear' });
    expect(result.order.totalAmount).toBe('58.00');
    expect(result.order.currency).toBe('INR');
    expect(result.order.confirmationToken.length).toBeGreaterThanOrEqual(40);
    expect(result.order.items).toHaveLength(1);
    expect(result.order.orderReference).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('associates a signed-in customer with the order', async () => {
    const { manager, orderRepository } = makeManager({
      products: [makeProduct()],
    });
    const carts = makeCartsService(makeCart(), 42);
    const { dataSource } = makeDataSource(manager);
    const service = new OrdersService(dataSource, carts.cartsService);

    const result = await service.createCheckoutOrder(guestRequest, makeDto());

    const savedOrder = orderRepository.save.mock.calls[0][0] as Order;
    expect(savedOrder.customerId).toBe(42);
    expect(result.cookie).toEqual({ type: 'none' });
  });

  it('rejects an empty cart without creating an order', async () => {
    const { manager, orderRepository } = makeManager({ products: [] });
    const carts = makeCartsService(null);
    const { dataSource } = makeDataSource(manager);
    const service = new OrdersService(dataSource, carts.cartsService);

    await expect(
      service.createCheckoutOrder(guestRequest, makeDto()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(orderRepository.save).not.toHaveBeenCalled();
    expect(carts.clearCheckoutCart).not.toHaveBeenCalled();
  });

  it('rejects an out-of-stock cart and reserves nothing', async () => {
    const product = makeProduct({ stockQuantity: 0 });
    const { manager, orderRepository, productRepository } = makeManager({
      products: [product],
    });
    const carts = makeCartsService(makeCart());
    const { dataSource } = makeDataSource(manager);
    const service = new OrdersService(dataSource, carts.cartsService);

    await expect(
      service.createCheckoutOrder(guestRequest, makeDto()),
    ).rejects.toThrow(/out of stock/i);
    expect(productRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('rejects inactive products', async () => {
    const product = makeProduct({ isActive: false });
    const { manager, orderRepository } = makeManager({ products: [product] });
    const carts = makeCartsService(makeCart());
    const { dataSource } = makeDataSource(manager);
    const service = new OrdersService(dataSource, carts.cartsService);

    await expect(
      service.createCheckoutOrder(guestRequest, makeDto()),
    ).rejects.toThrow(/no longer available/i);
    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a checkout when the stock update no longer matches', async () => {
    const { manager, orderRepository } = makeManager({
      products: [makeProduct()],
      affected: 0,
    });
    const carts = makeCartsService(makeCart());
    const { dataSource } = makeDataSource(manager);
    const service = new OrdersService(dataSource, carts.cartsService);

    await expect(
      service.createCheckoutOrder(guestRequest, makeDto()),
    ).rejects.toThrow(/insufficient stock/i);
    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('returns the existing order for a replayed idempotency key without re-running checkout', async () => {
    const existing = makeOrder({ idempotencyKey: 'replayed-key-123' });
    const carts = makeCartsService(makeCart());
    const { manager } = makeManager({ products: [] });
    const { dataSource, orderRepository } = makeDataSource(manager, existing);
    const service = new OrdersService(dataSource, carts.cartsService);

    const result = await service.createCheckoutOrder(
      guestRequest,
      makeDto({ idempotencyKey: 'replayed-key-123' }),
    );

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(carts.loadCheckoutCart).not.toHaveBeenCalled();
    expect(orderRepository.update).toHaveBeenCalledWith(
      { id: existing.id },
      { confirmationTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) },
    );
    expect(result.order.orderReference).toBe(existing.orderReference);
    expect(result.order.totalAmount).toBe('58.00');
    expect(result.cookie).toEqual({ type: 'none' });
  });
});

describe('OrdersService.findOrderConfirmation', () => {
  it('returns full details only with the matching confirmation token', async () => {
    const existing = makeOrder();
    const { manager } = makeManager({ products: [] });
    const { dataSource, orderRepository } = makeDataSource(manager, existing);
    const carts = makeCartsService(null);
    const service = new OrdersService(dataSource, carts.cartsService);

    const confirmation = await service.findOrderConfirmation(
      existing.orderReference,
      'valid-token',
    );

    expect(orderRepository.findOne).toHaveBeenCalledWith({
      where: {
        orderReference: existing.orderReference,
        confirmationTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
      relations: { items: true },
    });
    expect(confirmation.delivery.city).toBe('Jaipur');
    expect(confirmation.customerEmail).toBe('jane@example.com');
    expect('confirmationToken' in confirmation).toBe(false);
  });

  it('hides orders when the token is missing', async () => {
    const { manager } = makeManager({ products: [] });
    const { dataSource } = makeDataSource(manager);
    const carts = makeCartsService(null);
    const service = new OrdersService(dataSource, carts.cartsService);

    await expect(
      service.findOrderConfirmation('some-reference', undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('hides orders when the token does not match', async () => {
    const { manager } = makeManager({ products: [] });
    const { dataSource } = makeDataSource(manager, null);
    const carts = makeCartsService(null);
    const service = new OrdersService(dataSource, carts.cartsService);

    await expect(
      service.findOrderConfirmation('some-reference', 'wrong-token'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
