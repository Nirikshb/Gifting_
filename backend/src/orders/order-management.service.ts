import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  ILike,
  In,
} from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Order, type OrderStatus } from './entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { CancelOrderDto } from './dto/cancel-order.dto';
import {
  ListAdminOrdersQueryDto,
  ListOrdersQueryDto,
} from './dto/list-orders-query.dto';
import {
  AdminOrderDetailResponse,
  AdminOrderStatsResponse,
  AdminOrderSummaryResponse,
  CancelOrderResponse,
  CustomerOrderDetailResponse,
  CustomerOrderSummaryResponse,
  OrderStatusUpdateResponse,
  OrderSummaryLineResponse,
} from './dto/order-management-response.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { VerifiedPaymentEvent } from './payments/payment-gateway';
import {
  adminCanCancelOrder,
  allowedOrderStatusTransitions,
  assertOrderStatusTransition,
  customerCanCancelOrder,
} from './utils/order-lifecycle';

type HistoryActor = {
  type: 'customer' | 'admin' | 'system';
  id: number | null;
};

type HistoryInput = {
  category: 'fulfilment' | 'payment';
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  actor: HistoryActor;
};

const NOT_FOUND_MESSAGE = 'Order not found';
const ALREADY_CANCELLED_MESSAGE = 'Order is already cancelled.';

@Injectable()
export class OrderManagementService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listCustomerOrders(
    customerId: number,
    query: ListOrdersQueryDto,
  ): Promise<PaginatedResult<CustomerOrderSummaryResponse>> {
    const where: FindOptionsWhere<Order> = { customerId };
    if (query.status) {
      where.orderStatus = query.status;
    }

    const [orders, total] = await this.dataSource
      .getRepository(Order)
      .findAndCount({
        where,
        relations: { items: true },
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      });

    return {
      items: orders.map((order) => this.toCustomerSummary(order)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getCustomerOrder(
    customerId: number,
    orderReference: string,
  ): Promise<CustomerOrderDetailResponse> {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { orderReference, customerId },
      relations: { items: true, statusHistory: true },
    });

    // A missing order and another customer's order are intentionally
    // indistinguishable, so references cannot be probed.
    if (!order) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return this.toCustomerDetail(order);
  }

  async cancelCustomerOrder(
    customerId: number,
    orderReference: string,
    dto: CancelOrderDto,
  ): Promise<CancelOrderResponse> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrder(manager, {
        orderReference,
        customerId,
      });

      if (!order) {
        throw new NotFoundException(NOT_FOUND_MESSAGE);
      }

      if (order.orderStatus === 'cancelled') {
        throw new BadRequestException(ALREADY_CANCELLED_MESSAGE);
      }

      if (!customerCanCancelOrder(order.orderStatus, order.paymentStatus)) {
        throw new BadRequestException(
          order.paymentStatus === 'paid'
            ? 'This order has already been paid. Please contact us to cancel it.'
            : 'This order can no longer be cancelled online.',
        );
      }

      return this.cancelLockedOrder(manager, order, dto.reason ?? null, {
        type: 'customer',
        id: customerId,
      });
    });
  }

  async listAdminOrders(
    query: ListAdminOrdersQueryDto,
  ): Promise<PaginatedResult<AdminOrderSummaryResponse>> {
    const base: FindOptionsWhere<Order> = {};
    if (query.status) {
      base.orderStatus = query.status;
    }
    if (query.paymentStatus) {
      base.paymentStatus = query.paymentStatus;
    }

    const search = query.search?.trim();
    const where: FindOptionsWhere<Order> | FindOptionsWhere<Order>[] = search
      ? [
          { ...base, orderReference: ILike(`%${search}%`) },
          { ...base, customerName: ILike(`%${search}%`) },
          { ...base, customerEmail: ILike(`%${search}%`) },
          { ...base, recipientName: ILike(`%${search}%`) },
        ]
      : base;

    const [orders, total] = await this.dataSource
      .getRepository(Order)
      .findAndCount({
        where,
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      });

    const itemsByOrderId = await this.loadItemsForOrders(
      orders.map((order) => order.id),
    );

    return {
      items: orders.map((order) =>
        this.toAdminSummary(order, itemsByOrderId.get(order.id) ?? []),
      ),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getAdminOrder(
    orderReference: string,
  ): Promise<AdminOrderDetailResponse> {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { orderReference },
      relations: { items: true, statusHistory: true },
    });

    if (!order) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return this.toAdminDetail(order);
  }

  async getAdminStats(): Promise<AdminOrderStatsResponse> {
    const repository = this.dataSource.getRepository(Order);

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      unpaidOrders,
      paidOrders,
    ] = await Promise.all([
      repository.count(),
      repository.count({ where: { orderStatus: 'pending' } }),
      repository.count({ where: { orderStatus: 'confirmed' } }),
      repository.count({ where: { orderStatus: 'processing' } }),
      repository.count({ where: { orderStatus: 'shipped' } }),
      repository.count({ where: { orderStatus: 'delivered' } }),
      repository.count({ where: { orderStatus: 'cancelled' } }),
      repository.count({ where: { paymentStatus: 'unpaid' } }),
      repository.count({ where: { paymentStatus: 'paid' } }),
    ]);

    const revenueRow = await repository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
      .where('order.paymentStatus = :paid', { paid: 'paid' })
      .andWhere('order.orderStatus != :cancelled', { cancelled: 'cancelled' })
      .getRawOne<{ revenue: string }>();

    const recentOrders = await repository.find({
      order: { createdAt: 'DESC', id: 'DESC' },
      take: 5,
    });
    const recentItems = await this.loadItemsForOrders(
      recentOrders.map((order) => order.id),
    );

    return {
      totalOrders,
      pendingOrders,
      activeOrders:
        confirmedOrders + processingOrders + shippedOrders,
      deliveredOrders,
      cancelledOrders,
      unpaidOrders,
      paidOrders,
      revenue: this.formatMoney(revenueRow?.revenue ?? '0'),
      recentOrders: recentOrders.map((order) =>
        this.toAdminSummary(order, recentItems.get(order.id) ?? []),
      ),
    };
  }

  async updateAdminOrderStatus(
    adminId: number,
    orderReference: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderStatusUpdateResponse> {
    const order = await this.dataSource.transaction(async (manager) => {
      const locked = await this.lockOrder(manager, { orderReference });

      if (!locked) {
        throw new NotFoundException(NOT_FOUND_MESSAGE);
      }

      if (dto.status === 'cancelled') {
        throw new BadRequestException(
          'Use the cancellation endpoint to cancel an order.',
        );
      }

      assertOrderStatusTransition(locked.orderStatus, dto.status);

      const fromStatus = locked.orderStatus;
      locked.orderStatus = dto.status;
      await manager.getRepository(Order).save(locked);

      await this.recordHistory(manager, locked.id, {
        category: 'fulfilment',
        fromStatus,
        toStatus: dto.status,
        note: dto.note ?? null,
        actor: { type: 'admin', id: adminId },
      });

      return locked;
    });

    return {
      orderReference: order.orderReference,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      updatedAt: order.updatedAt,
    };
  }

  async cancelAdminOrder(
    adminId: number,
    orderReference: string,
    dto: CancelOrderDto,
  ): Promise<CancelOrderResponse> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.lockOrder(manager, { orderReference });

      if (!order) {
        throw new NotFoundException(NOT_FOUND_MESSAGE);
      }

      if (order.orderStatus === 'cancelled') {
        throw new BadRequestException(ALREADY_CANCELLED_MESSAGE);
      }

      if (!adminCanCancelOrder(order.orderStatus)) {
        throw new BadRequestException(
          `An order that is already ${order.orderStatus} cannot be cancelled.`,
        );
      }

      return this.cancelLockedOrder(manager, order, dto.reason ?? null, {
        type: 'admin',
        id: adminId,
      });
    });
  }

  /**
   * Internal entry point for a verified payment provider event.
   *
   * There is deliberately no HTTP controller wired to this method. A future
   * Razorpay adapter verifies the webhook signature, builds a
   * VerifiedPaymentEvent and calls this method. No request body can mark an
   * order paid directly.
   */
  async applyVerifiedPaymentEvent(
    event: VerifiedPaymentEvent,
  ): Promise<OrderStatusUpdateResponse> {
    if (event.verified !== true) {
      throw new BadRequestException('Payment event is not verified.');
    }

    if (event.currency !== 'INR') {
      throw new BadRequestException('Unsupported payment currency.');
    }

    if (!event.providerReference?.trim()) {
      throw new BadRequestException('Payment reference is required.');
    }

    if (!Number.isFinite(Number(event.amount))) {
      throw new BadRequestException('Payment amount is invalid.');
    }

    const order = await this.dataSource.transaction(async (manager) => {
      const locked = await this.lockOrder(manager, {
        orderReference: event.orderReference,
      });

      if (!locked) {
        throw new NotFoundException(NOT_FOUND_MESSAGE);
      }

      if (locked.orderStatus === 'cancelled') {
        throw new BadRequestException(
          'Cannot apply a payment to a cancelled order.',
        );
      }

      if (locked.paymentStatus === 'paid') {
        if (locked.paymentReference === event.providerReference) {
          return locked;
        }

        throw new BadRequestException(
          'Order is already paid with a different payment reference.',
        );
      }

      if (locked.paymentStatus === 'refunded') {
        throw new BadRequestException(
          'Cannot apply a payment to a refunded order.',
        );
      }

      if (!this.moneyEquals(locked.totalAmount, event.amount)) {
        throw new BadRequestException(
          'Payment amount does not match the order total.',
        );
      }

      const fromStatus = locked.paymentStatus;
      locked.paymentStatus = 'paid';
      locked.paidAt = event.paidAt;
      locked.paymentReference = event.providerReference;
      await manager.getRepository(Order).save(locked);

      await this.recordHistory(manager, locked.id, {
        category: 'payment',
        fromStatus,
        toStatus: 'paid',
        note: `Verified ${event.provider} payment ${event.providerReference}`,
        actor: { type: 'system', id: null },
      });

      return locked;
    });

    return {
      orderReference: order.orderReference,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      updatedAt: order.updatedAt,
    };
  }

  private async lockOrder(
    manager: EntityManager,
    where: FindOptionsWhere<Order>,
  ): Promise<Order | null> {
    return manager.getRepository(Order).findOne({
      where,
      lock: { mode: 'pessimistic_write' },
    });
  }

  /**
   * Caller must hold a pessimistic write lock on the order. Restocking is
   * guarded by `stockRestoredAt` so it happens exactly once.
   */
  private async cancelLockedOrder(
    manager: EntityManager,
    order: Order,
    note: string | null,
    actor: HistoryActor,
  ): Promise<CancelOrderResponse> {
    const fromStatus = order.orderStatus;
    const now = new Date();
    let stockRestored = false;

    if (!order.stockRestoredAt) {
      const items = await manager.getRepository(OrderItem).find({
        where: { orderId: order.id },
        order: { id: 'ASC' },
      });

      const productRepository = manager.getRepository(Product);
      for (const item of items) {
        if (item.productId === null) {
          // The product was deleted after the order was placed; there is no
          // row left to restock.
          continue;
        }

        await productRepository
          .createQueryBuilder()
          .update(Product)
          .set({ stockQuantity: () => 'stock_quantity + :quantity' })
          .where('id = :id')
          .setParameters({ id: item.productId, quantity: item.quantity })
          .execute();
      }

      order.stockRestoredAt = now;
      stockRestored = true;
    }

    order.orderStatus = 'cancelled';
    order.cancelledAt = now;
    await manager.getRepository(Order).save(order);

    await this.recordHistory(manager, order.id, {
      category: 'fulfilment',
      fromStatus,
      toStatus: 'cancelled',
      note,
      actor,
    });

    return {
      orderReference: order.orderReference,
      orderStatus: 'cancelled',
      paymentStatus: order.paymentStatus,
      cancelledAt: now,
      stockRestored,
      refundDue: order.paymentStatus === 'paid',
    };
  }

  private async recordHistory(
    manager: EntityManager,
    orderId: number,
    input: HistoryInput,
  ): Promise<void> {
    const repository = manager.getRepository(OrderStatusHistory);
    await repository.save(
      repository.create({
        orderId,
        category: input.category,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        note: input.note,
        actorType: input.actor.type,
        actorId: input.actor.id,
      }),
    );
  }

  private async loadItemsForOrders(
    orderIds: number[],
  ): Promise<Map<number, OrderItem[]>> {
    const grouped = new Map<number, OrderItem[]>();
    if (orderIds.length === 0) {
      return grouped;
    }

    const items = await this.dataSource.getRepository(OrderItem).find({
      where: { orderId: In(orderIds) },
      order: { id: 'ASC' },
    });

    for (const item of items) {
      const group = grouped.get(item.orderId) ?? [];
      group.push(item);
      grouped.set(item.orderId, group);
    }

    return grouped;
  }

  private toCustomerSummary(order: Order): CustomerOrderSummaryResponse {
    const items = [...(order.items ?? [])].sort(
      (left, right) => left.id - right.id,
    );

    return {
      orderReference: order.orderReference,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      currency: 'INR',
      createdAt: order.createdAt,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      itemsPreview: items
        .slice(0, 3)
        .map((item) => this.toSummaryLine(item)),
      canCancel: customerCanCancelOrder(
        order.orderStatus,
        order.paymentStatus,
      ),
    };
  }

  private toAdminSummary(
    order: Order,
    items: OrderItem[],
  ): AdminOrderSummaryResponse {
    const sorted = [...items].sort((left, right) => left.id - right.id);

    return {
      ...this.toCustomerSummary({ ...order, items: sorted }),
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      recipientName: order.recipientName,
      paidAt: order.paidAt ?? null,
      paymentReference: order.paymentReference ?? null,
      canCancel: adminCanCancelOrder(order.orderStatus),
    };
  }

  private toSummaryLine(item: OrderItem): OrderSummaryLineResponse {
    return {
      productName: item.productName,
      productSlug: item.productSlug,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    };
  }

  private toCustomerDetail(order: Order): CustomerOrderDetailResponse {
    const items = [...(order.items ?? [])].sort(
      (left, right) => left.id - right.id,
    );
    const history = [...(order.statusHistory ?? [])].sort(
      (left, right) =>
        left.createdAt.getTime() - right.createdAt.getTime() ||
        left.id - right.id,
    );

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
      paidAt: order.paidAt ?? null,
      cancelledAt: order.cancelledAt ?? null,
      canCancel: customerCanCancelOrder(
        order.orderStatus,
        order.paymentStatus,
      ),
      items: items.map((item) => ({
        productName: item.productName,
        productSlug: item.productSlug,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      history: history.map((entry) => ({
        id: entry.id,
        category: entry.category,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        note: entry.note,
        actorType: entry.actorType,
        createdAt: entry.createdAt,
      })),
    };
  }

  private toAdminDetail(order: Order): AdminOrderDetailResponse {
    const detail = this.toCustomerDetail(order);
    const allowed = allowedOrderStatusTransitions(order.orderStatus).filter(
      (status): status is OrderStatus => status !== 'cancelled',
    );

    return {
      ...detail,
      customerId: order.customerId,
      paymentReference: order.paymentReference ?? null,
      stockRestoredAt: order.stockRestoredAt ?? null,
      updatedAt: order.updatedAt,
      allowedTransitions: [...allowed],
    };
  }

  private moneyEquals(left: string, right: string): boolean {
    const leftAmount = Number(left);
    const rightAmount = Number(right);
    return (
      Number.isFinite(leftAmount) &&
      Number.isFinite(rightAmount) &&
      Math.round(leftAmount * 100) === Math.round(rightAmount * 100)
    );
  }

  private formatMoney(value: string | number): string {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
  }
}
