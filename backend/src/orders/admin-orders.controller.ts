import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentCustomer } from '../auth/decorators/current-customer.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import type { Customer } from '../customers/entities/customer.entity';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ListAdminOrdersQueryDto } from './dto/list-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderManagementService } from './order-management.service';

@Controller('admin/orders')
@UseGuards(AdminGuard)
export class AdminOrdersController {
  constructor(
    private readonly orderManagementService: OrderManagementService,
  ) {}

  @Get()
  list(@Query() query: ListAdminOrdersQueryDto) {
    return this.orderManagementService.listAdminOrders(query);
  }

  // Declared before the parameterised detail route so "stats" is not treated
  // as an order reference.
  @Get('stats')
  stats() {
    return this.orderManagementService.getAdminStats();
  }

  @Get(':orderReference')
  detail(@Param('orderReference') orderReference: string) {
    return this.orderManagementService.getAdminOrder(orderReference);
  }

  @Patch(':orderReference/status')
  @UseGuards(CsrfGuard)
  updateStatus(
    @CurrentCustomer() customer: Customer,
    @Param('orderReference') orderReference: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderManagementService.updateAdminOrderStatus(
      customer.id,
      orderReference,
      dto,
    );
  }

  @Post(':orderReference/cancel')
  @UseGuards(CsrfGuard)
  cancel(
    @CurrentCustomer() customer: Customer,
    @Param('orderReference') orderReference: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orderManagementService.cancelAdminOrder(
      customer.id,
      orderReference,
      dto,
    );
  }
}
