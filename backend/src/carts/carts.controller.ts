import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { GUEST_CART_COOKIE_NAME } from './cart.constants';
import { CartsService } from './carts.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartCookieAction } from './dto/cart-response';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get('count')
  async getCount(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.cartsService.getCount(request);
    this.applyCookie(response, result.cookie);
    return result.count;
  }

  @Get()
  async getCart(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.cartsService.getCart(request);
    this.applyCookie(response, result.cookie);
    return result.cart;
  }

  @Post('items')
  @UseGuards(CsrfGuard)
  async addItem(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: AddCartItemDto,
  ) {
    const result = await this.cartsService.addItem(
      request,
      body.productId,
      body.quantity ?? 1,
    );
    this.applyCookie(response, result.cookie);
    return result.cart;
  }

  @Patch('items/:productId')
  @UseGuards(CsrfGuard)
  async updateItem(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: UpdateCartItemDto,
  ) {
    const result = await this.cartsService.updateItem(
      request,
      productId,
      body.quantity,
    );
    this.applyCookie(response, result.cookie);
    return result.cart;
  }

  @Delete('items/:productId')
  @UseGuards(CsrfGuard)
  async removeItem(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const result = await this.cartsService.removeItem(request, productId);
    this.applyCookie(response, result.cookie);
    return result.cart;
  }

  @Delete()
  @UseGuards(CsrfGuard)
  async clearCart(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.cartsService.clearCart(request);
    this.applyCookie(response, result.cookie);
    return result.cart;
  }

  private applyCookie(response: Response, action: CartCookieAction): void {
    if (action.type === 'set') {
      response.cookie(
        GUEST_CART_COOKIE_NAME,
        action.token,
        this.cartsService.getGuestCartCookieOptions(),
      );
      return;
    }

    if (action.type === 'clear') {
      response.clearCookie(
        GUEST_CART_COOKIE_NAME,
        this.cartsService.getGuestCartClearCookieOptions(),
      );
    }
  }
}
