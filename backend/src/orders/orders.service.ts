import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, In } from 'typeorm';
import { Product } from '../products/entities/product.entity';
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

type MergedLineItem = {
  productId: number;
  quantity: number;
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

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

      const totalAmount = addMoney(
        ...lineSnapshots.map((line) => line.lineTotal),
      );

      const order = orderRepository.create({
        orderReference: randomUUID(),
        customerName: dto.customerName.trim(),
        customerEmail: dto.customerEmail.trim(),
        deliveryLine1: dto.deliveryLine1.trim(),
        deliveryLine2: dto.deliveryLine2?.trim() || null,
        deliveryCity: dto.deliveryCity.trim(),
        deliveryPostcode: dto.deliveryPostcode.trim(),
        deliveryCountry: dto.deliveryCountry.trim(),
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
