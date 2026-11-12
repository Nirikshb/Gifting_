import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CartsModule } from '../carts/carts.module';
import { Product } from '../products/entities/product.entity';
import { AdminOrdersController } from './admin-orders.controller';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Order } from './entities/order.entity';
import { OrderManagementService } from './order-management.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import {
  PAYMENT_GATEWAY,
  UnconfiguredPaymentGateway,
} from './payments/payment-gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderStatusHistory,
      Product,
    ]),
    CartsModule,
    AuthModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [
    OrdersService,
    OrderManagementService,
    {
      provide: PAYMENT_GATEWAY,
      useClass: UnconfiguredPaymentGateway,
    },
  ],
})
export class OrdersModule {}
