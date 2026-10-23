import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createGuestOrder(createOrderDto);
  }

  @Get(':orderReference')
  findOne(@Param('orderReference') orderReference: string) {
    return this.ordersService.findByOrderReference(orderReference);
  }
}
