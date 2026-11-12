import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentCustomer } from '../auth/decorators/current-customer.decorator';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { SessionGuard } from '../auth/guards/session.guard';
import { GUEST_CART_COOKIE_NAME } from '../carts/cart.constants';
import { CartsService } from '../carts/carts.service';
import type { Customer } from '../customers/entities/customer.entity';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { OrderManagementService } from './order-management.service';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderManagementService: OrderManagementService,
    private readonly cartsService: CartsService,
  ) {}

  @Post('checkout')
  @UseGuards(CsrfGuard)
  async checkout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() createCheckoutDto: CreateCheckoutDto,
  ) {
    const result = await this.ordersService.createCheckoutOrder(
      request,
      createCheckoutDto,
    );

    if (result.cookie.type === 'clear') {
      response.clearCookie(
        GUEST_CART_COOKIE_NAME,
        this.cartsService.getGuestCartClearCookieOptions(),
      );
    }

    return result.order;
  }

  // Static "mine" routes are declared before ":orderReference" so the
  // parameterised confirmation/detail routes cannot swallow them.
  @Get('mine')
  @UseGuards(SessionGuard)
  listMine(
    @CurrentCustomer() customer: Customer,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.orderManagementService.listCustomerOrders(
      customer.id,
      query,
    );
  }

  @Get('mine/:orderReference')
  @UseGuards(SessionGuard)
  findMine(
    @CurrentCustomer() customer: Customer,
    @Param('orderReference') orderReference: string,
  ) {
    return this.orderManagementService.getCustomerOrder(
      customer.id,
      orderReference,
    );
  }

  @Post('mine/:orderReference/cancel')
  @UseGuards(SessionGuard, CsrfGuard)
  cancelMine(
    @CurrentCustomer() customer: Customer,
    @Param('orderReference') orderReference: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orderManagementService.cancelCustomerOrder(
      customer.id,
      orderReference,
      dto,
    );
  }

  @Get(':orderReference/confirmation')
  findConfirmation(
    @Param('orderReference') orderReference: string,
    @Query('token') token?: string,
  ) {
    return this.ordersService.findOrderConfirmation(orderReference, token);
  }

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createGuestOrder(createOrderDto);
  }

  @Get(':orderReference')
  findOne(@Param('orderReference') orderReference: string) {
    return this.ordersService.findByOrderReference(orderReference);
  }
}
