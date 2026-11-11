import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';
import { CartsService } from '../carts/carts.service';
import type { CartCookieAction } from '../carts/types/cart-cookie-action';
import { Product } from '../products/entities/product.entity';
import {
  CheckoutOrderLineResponse,
  CheckoutOrderResponse,
  OrderConfirmationResponse,
} from './dto/checkout-response.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import {
  CreateOrderDto,
  POSTGRES_INTEGER_MAX,
} from './dto/create-order.dto';
import {
  CreatedOrderResponse,
  OrderDetailsResponse,
} from './dto/create-order-response.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { addMoney, multiplyMoney } from './utils/money';
import {
  createOrderConfirmationToken,
  hashOrderConfirmationToken,
} from './utils/order-confirmation-token';
import { calculateShippingAmount } from './utils/shipping';

type MergedLineItem = {
  productId: number;
  quantity: number;
};

const ORDER_IDEMPOTENCY_UNIQUE_CONSTRAINT = 'orders_idempotency_key_unique';

@Injectable()
export class OrdersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cartsService: CartsService,
  ) {}

  /**
   * Cart-backed guest/customer checkout. The cart is the only source of line
   * items; prices, stock and totals are resolved from the database inside a
   * transaction. Frontend-supplied product ids, prices and totals are ignored.
   */
  async createCheckoutOrder(
    request: Request,
    dto: CreateCheckoutDto,
  ): Promise<{ order: CheckoutOrderResponse; cookie: CartCookieAction }> {
    const idempotencyKey = this.normalizeOptional(dto.idempotencyKey);

    if (idempotencyKey) {
      const existing = await this.findOrderByIdempotencyKey(idempotencyKey);
      if (existing) {
        return {
          order: await this.withRotatedConfirmationToken(existing),
          cookie: { type: 'none' },
        };
      }
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const checkout = await this.cartsService.loadCheckoutCart(
          manager,
          request,
        );
        const cart = checkout.cart;

        if (!cart || (cart.items?.length ?? 0) === 0) {
          throw new BadRequestException('Your cart is empty.');
        }

        // A retry that lost its first response reuses the idempotency key.
        if (idempotencyKey) {
          const existing = await manager.getRepository(Order).findOne({
            where: { idempotencyKey },
            relations: { items: true },
          });
          if (existing) {
            return {
              order: await this.withRotatedConfirmationToken(existing, manager),
              cookie: { type: 'none' },
            };
          }
        }

        const cartItems = [...cart.items].sort((left, right) => left.id - right.id);
        const productIds = [
          ...new Set(cartItems.map((item) => item.productId)),
        ].sort((left, right) => left - right);

        const productRepository = manager.getRepository(Product);
        const products = await productRepository.find({
          where: { id: In(productIds) },
          order: { id: 'ASC' },
          lock: { mode: 'pessimistic_write' },
        });
        const productById = new Map(products.map((product) => [product.id, product]));

        const lineSnapshots: CheckoutOrderLineResponse[] = [];
        for (const cartItem of cartItems) {
          const product = productById.get(cartItem.productId);
          if (!product) {
            throw new NotFoundException(
              `Product with id ${cartItem.productId} was not found`,
            );
          }

          if (!product.isActive) {
            throw new BadRequestException(
              `"${product.name}" is no longer available. Please remove it from your bag.`,
            );
          }

          if (product.stockQuantity < cartItem.quantity) {
            throw new BadRequestException(
              product.stockQuantity <= 0
                ? `"${product.name}" is out of stock. Please remove it from your bag.`
                : `Only ${product.stockQuantity} left of "${product.name}". Please update your quantity.`,
            );
          }

          lineSnapshots.push({
            productName: product.name,
            productSlug: product.slug,
            quantity: cartItem.quantity,
            unitPrice: product.price,
            lineTotal: multiplyMoney(product.price, cartItem.quantity),
          });
        }

        // Payments are not integrated yet, so stock is reserved at order
        // creation. Cancelling an unpaid order must restore stock in future.
        for (const cartItem of cartItems) {
          const product = productById.get(cartItem.productId)!;
          const updateResult = await productRepository
            .createQueryBuilder()
            .update(Product)
            .set({ stockQuantity: () => 'stock_quantity - :quantity' })
            .where('id = :id')
            .andWhere('is_active = TRUE')
            .andWhere('stock_quantity >= :quantity')
            .setParameters({
              id: cartItem.productId,
              quantity: cartItem.quantity,
            })
            .execute();

          if (updateResult.affected !== 1) {
            throw new BadRequestException(
              `Insufficient stock for product "${product.name}"`,
            );
          }
        }

        const subtotal = addMoney(
          ...lineSnapshots.map((line) => line.lineTotal),
        );
        const shipping = calculateShippingAmount(subtotal);
        const totalAmount = addMoney(subtotal, shipping);
        const customerName = dto.customerName.trim();
        const confirmationToken = createOrderConfirmationToken();

        const orderRepository = manager.getRepository(Order);
        const order = orderRepository.create({
          orderReference: randomUUID(),
          customerId: checkout.customerId,
          customerName,
          customerEmail: dto.customerEmail.trim(),
          recipientName: this.normalizeOptional(dto.recipientName) ?? customerName,
          deliveryLine1: dto.deliveryLine1.trim(),
          deliveryLine2: this.normalizeOptional(dto.deliveryLine2),
          deliveryCity: dto.deliveryCity.trim(),
          deliveryPostcode: dto.deliveryPostcode.trim(),
          deliveryCountry: dto.deliveryCountry.trim(),
          giftMessage: this.normalizeOptional(dto.giftMessage),
          subtotalAmount: subtotal,
          shippingAmount: shipping,
          totalAmount,
          orderStatus: 'pending',
          paymentStatus: 'unpaid',
          idempotencyKey,
          confirmationTokenHash: hashOrderConfirmationToken(confirmationToken),
        });

        const savedOrder = await orderRepository.save(order);

        const orderItemRepository = manager.getRepository(OrderItem);
        const orderItems = lineSnapshots.map((line, index) =>
          orderItemRepository.create({
            orderId: savedOrder.id,
            productId: cartItems[index].productId,
            productName: line.productName,
            productSlug: line.productSlug,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            lineTotal: line.lineTotal,
          }),
        );
        savedOrder.items = await orderItemRepository.save(orderItems);

        await this.cartsService.clearCheckoutCart(manager, cart.id);

        return {
          order: this.toCheckoutResponse(savedOrder, confirmationToken),
          cookie:
            checkout.customerId === null
              ? { type: 'clear' as const }
              : { type: 'none' as const },
        };
      });
    } catch (error) {
      if (idempotencyKey && this.isIdempotencyUniqueViolation(error)) {
        const existing = await this.findOrderByIdempotencyKey(idempotencyKey);
        if (existing) {
          return {
            order: await this.withRotatedConfirmationToken(existing),
            cookie: { type: 'none' },
          };
        }
      }

      throw error;
    }
  }

  /**
   * Returns full order details only when the caller holds the confirmation
   * token issued at checkout. The public `GET /orders/:reference` endpoint
   * intentionally stays limited.
   */
  async findOrderConfirmation(
    orderReference: string,
    token: string | undefined,
  ): Promise<OrderConfirmationResponse> {
    const normalizedToken = token?.trim();
    if (!normalizedToken) {
      throw new NotFoundException('Order not found');
    }

    const order = await this.dataSource.getRepository(Order).findOne({
      where: {
        orderReference,
        confirmationTokenHash: hashOrderConfirmationToken(normalizedToken),
      },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const { confirmationToken: _token, ...confirmation } =
      this.toCheckoutResponse(order, normalizedToken);
    return confirmation;
  }

  async createGuestOrder(dto: CreateOrderDto): Promise<CreatedOrderResponse> {
    const mergedItems = this.mergeLineItems(dto.items);
    if (mergedItems.some((item) => item.quantity > POSTGRES_INTEGER_MAX)) {
      throw new BadRequestException(
        `quantity must not be greater than ${POSTGRES_INTEGER_MAX}`,
      );
    }
    const productIds = mergedItems.map((item) => item.productId);

    return this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);
      const orderRepository = manager.getRepository(Order);
      const orderItemRepository = manager.getRepository(OrderItem);

      const products = await productRepository.find({
        where: { id: In(productIds) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });

      const productById = new Map(products.map((product) => [product.id, product]));
      const lineSnapshots: CreatedOrderResponse['items'] = [];

      for (const line of mergedItems) {
        const product = productById.get(line.productId);
        if (!product) {
          throw new NotFoundException(
            `Product with id ${line.productId} was not found`,
          );
        }

        if (!product.isActive) {
          throw new BadRequestException(
            `Product "${product.name}" is not available for purchase`,
          );
        }

        if (product.stockQuantity < line.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product "${product.name}"`,
          );
        }

        const lineTotal = multiplyMoney(product.price, line.quantity);
        lineSnapshots.push({
          productName: product.name,
          productSlug: product.slug,
          quantity: line.quantity,
          unitPrice: product.price,
          lineTotal,
        });
      }

      for (const line of mergedItems) {
        const product = productById.get(line.productId)!;
        const updateResult = await productRepository
          .createQueryBuilder()
          .update(Product)
          .set({
            stockQuantity: () => 'stock_quantity - :quantity',
          })
          .where('id = :id')
          .andWhere('is_active = TRUE')
          .andWhere('stock_quantity >= :quantity')
          .setParameters({
            id: line.productId,
            quantity: line.quantity,
          })
          .execute();

        if (updateResult.affected !== 1) {
          throw new BadRequestException(
            `Insufficient stock for product "${product.name}"`,
          );
        }
      }

      const subtotal = addMoney(
        ...lineSnapshots.map((line) => line.lineTotal),
      );
      const shipping = calculateShippingAmount(subtotal);
      const totalAmount = addMoney(subtotal, shipping);

      const order = orderRepository.create({
        orderReference: randomUUID(),
        customerName: dto.customerName.trim(),
        customerEmail: dto.customerEmail.trim(),
        deliveryLine1: dto.deliveryLine1.trim(),
        deliveryLine2: dto.deliveryLine2?.trim() || null,
        deliveryCity: dto.deliveryCity.trim(),
        deliveryPostcode: dto.deliveryPostcode.trim(),
        deliveryCountry: dto.deliveryCountry.trim(),
        subtotalAmount: subtotal,
        shippingAmount: shipping,
        totalAmount,
        orderStatus: 'pending',
        paymentStatus: 'unpaid',
      });

      const savedOrder = await orderRepository.save(order);

      const orderItems = lineSnapshots.map((line, index) => {
        const sourceLine = mergedItems[index];
        const product = productById.get(sourceLine.productId)!;

        return orderItemRepository.create({
          orderId: savedOrder.id,
          productId: product.id,
          productName: line.productName,
          productSlug: line.productSlug,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
        });
      });

      await orderItemRepository.save(orderItems);

      return {
        orderReference: savedOrder.orderReference,
        orderStatus: savedOrder.orderStatus,
        paymentStatus: savedOrder.paymentStatus,
        totalAmount: savedOrder.totalAmount,
        items: lineSnapshots,
      };
    });
  }

  async findByOrderReference(
    orderReference: string,
  ): Promise<OrderDetailsResponse> {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { orderReference },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const items = [...order.items].sort((left, right) => left.id - right.id);

    return {
      orderReference: order.orderReference,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    };
  }

  private async findOrderByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<Order | null> {
    return this.dataSource.getRepository(Order).findOne({
      where: { idempotencyKey },
      relations: { items: true },
    });
  }

  /**
   * Issues a fresh confirmation token for a retried checkout. The previous
   * token stops working; retries exist because the first response was lost.
   */
  private async withRotatedConfirmationToken(
    order: Order,
    manager?: EntityManager,
  ): Promise<CheckoutOrderResponse> {
    const token = createOrderConfirmationToken();
    const repository = (manager ?? this.dataSource.manager).getRepository(Order);
    await repository.update(
      { id: order.id },
      { confirmationTokenHash: hashOrderConfirmationToken(token) },
    );

    return this.toCheckoutResponse(order, token);
  }

  private toCheckoutResponse(
    order: Order,
    confirmationToken: string,
  ): CheckoutOrderResponse {
    const items = [...order.items]
      .sort((left, right) => left.id - right.id)
      .map((item) => ({
        productName: item.productName,
        productSlug: item.productSlug,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      }));

    return {
      orderReference: order.orderReference,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotalAmount,
      shipping: order.shippingAmount,
      totalAmount: order.totalAmount,
      currency: 'INR',
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      recipientName: order.recipientName,
      delivery: {
        line1: order.deliveryLine1,
        line2: order.deliveryLine2,
        city: order.deliveryCity,
        postcode: order.deliveryPostcode,
        country: order.deliveryCountry,
      },
      giftMessage: order.giftMessage,
      createdAt: order.createdAt,
      items,
      confirmationToken,
    };
  }

  private normalizeOptional(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private isIdempotencyUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };

    return (
      driverError?.code === '23505' &&
      driverError.constraint === ORDER_IDEMPOTENCY_UNIQUE_CONSTRAINT
    );
  }

  private mergeLineItems(
    items: CreateOrderDto['items'],
  ): MergedLineItem[] {
    const quantitiesByProductId = new Map<number, number>();

    for (const item of items) {
      const current = quantitiesByProductId.get(item.productId) ?? 0;
      quantitiesByProductId.set(item.productId, current + item.quantity);
    }

    return [...quantitiesByProductId.entries()]
      .map(([productId, quantity]) => ({ productId, quantity }))
      .sort((left, right) => left.productId - right.productId);
  }
}
