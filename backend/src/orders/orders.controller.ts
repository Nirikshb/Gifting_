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
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { GUEST_CART_COOKIE_NAME } from '../carts/cart.constants';
import { CartsService } from '../carts/carts.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
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
