import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import type { CookieOptions, Request } from 'express';
import { DataSource, EntityManager } from 'typeorm';
import { getSessionCookieSameSite } from '../config/auth-configuration';
import { SessionService } from '../auth/session.service';
import { POSTGRES_INTEGER_MAX } from '../orders/dto/create-order.dto';
import { addMoney, multiplyMoney } from '../orders/utils/money';
import { Product } from '../products/entities/product.entity';
import {
  GUEST_CART_COOKIE_NAME,
  GUEST_CART_TTL_DAYS,
  STOCK_ATTENTION_MESSAGE,
  UNAVAILABLE_PRODUCT_MESSAGE,
} from './cart.constants';
import {
  CartCookieAction,
  CartCountResponse,
  CartItemResponse,
  CartResponse,
} from './dto/cart-response';
import { CartItem } from './entities/cart-item.entity';
import { Cart } from './entities/cart.entity';

type CartOwner =
  | { type: 'customer'; customerId: number }
  | { type: 'guest'; token: string | undefined };

type ResolvedCart = {
  cart: Cart | null;
  cookie: CartCookieAction;
};

const EMPTY_CART: CartResponse = {
  items: [],
  subtotal: '0.00',
};

@Injectable()
export class CartsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  getGuestCartCookieOptions(): CookieOptions {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      path: '/',
      maxAge: GUEST_CART_TTL_DAYS * 24 * 60 * 60 * 1000,
      secure: isProduction,
      sameSite: getSessionCookieSameSite(this.configService),
    };
  }

  getGuestCartClearCookieOptions(): CookieOptions {
    const { maxAge: _maxAge, ...options } = this.getGuestCartCookieOptions();
    return options;
  }

  async getCart(request: Request): Promise<{
    cart: CartResponse;
    cookie: CartCookieAction;
  }> {
    const owner = await this.resolveOwner(request);

    return this.dataSource.transaction(async (manager) => {
      await this.deleteExpiredGuestCarts(manager);
      const resolved = await this.findCart(manager, owner);
      if (!resolved.cart) {
        return { cart: EMPTY_CART, cookie: resolved.cookie };
      }

      return {
        cart: this.toCartResponse(resolved.cart),
        cookie: resolved.cookie,
      };
    });
  }

  async getCount(request: Request): Promise<{
    count: CartCountResponse;
    cookie: CartCookieAction;
  }> {
    const result = await this.getCart(request);
    const count = result.cart.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    return {
      count: { count },
      cookie: result.cookie,
    };
  }

  async addItem(
    request: Request,
    productId: number,
    quantity: number,
  ): Promise<{ cart: CartResponse; cookie: CartCookieAction }> {
    return this.dataSource.transaction(async (manager) => {
      await this.deleteExpiredGuestCarts(manager);
      const owner = await this.resolveOwner(request);
      const product = await this.findPurchasableProduct(manager, productId);
      const resolved = await this.findOrCreateCart(manager, owner);
      const cart = resolved.cart;
      if (!cart) {
        throw new NotFoundException('Cart was not found');
      }

      const items = cart.items ?? [];
      const existing = items.find((item) => item.productId === productId);
      const nextQuantity = (existing?.quantity ?? 0) + quantity;
      if (nextQuantity > POSTGRES_INTEGER_MAX) {
        throw new BadRequestException(
          `quantity must not be greater than ${POSTGRES_INTEGER_MAX}`,
        );
      }

      if (existing) {
        existing.quantity = nextQuantity;
        existing.seenUnitPrice = product.price;
        await manager.getRepository(CartItem).save(existing);
      } else {
        const created = manager.getRepository(CartItem).create({
          cartId: cart.id,
          productId: product.id,
          quantity,
          seenUnitPrice: product.price,
        });
        await manager.getRepository(CartItem).save(created);
      }

      const reloaded = await this.loadCart(manager, cart.id);
      return {
        cart: this.toCartResponse(reloaded),
        cookie: resolved.cookie,
      };
    });
  }

  async updateItem(
    request: Request,
    productId: number,
    quantity: number,
  ): Promise<{ cart: CartResponse; cookie: CartCookieAction }> {
    return this.dataSource.transaction(async (manager) => {
      await this.deleteExpiredGuestCarts(manager);
      const owner = await this.resolveOwner(request);
      const product = await manager.getRepository(Product).findOne({
        where: { id: productId },
      });
      if (!product) {
        throw new NotFoundException(
          `Product with id ${productId} was not found`,
        );
      }

      const resolved = await this.findCart(manager, owner);
      const item = resolved.cart?.items?.find(
        (line) => line.productId === productId,
      );
      if (!resolved.cart || !item) {
        throw new NotFoundException('Cart item was not found');
      }

      item.quantity = quantity;
      item.seenUnitPrice = product.price;
      await manager.getRepository(CartItem).save(item);

      const reloaded = await this.loadCart(manager, resolved.cart.id);
      return {
        cart: this.toCartResponse(reloaded),
        cookie: resolved.cookie,
      };
    });
  }

  async removeItem(
    request: Request,
    productId: number,
  ): Promise<{ cart: CartResponse; cookie: CartCookieAction }> {
    return this.dataSource.transaction(async (manager) => {
      await this.deleteExpiredGuestCarts(manager);
      const owner = await this.resolveOwner(request);
      const resolved = await this.findCart(manager, owner);
      const item = resolved.cart?.items?.find(
        (line) => line.productId === productId,
      );
      if (!resolved.cart || !item) {
        throw new NotFoundException('Cart item was not found');
      }

      await manager.getRepository(CartItem).delete({ id: item.id });
      const reloaded = await this.loadCart(manager, resolved.cart.id);
      return {
        cart: this.toCartResponse(reloaded),
        cookie: resolved.cookie,
      };
    });
  }

  async clearCart(request: Request): Promise<{
    cart: CartResponse;
    cookie: CartCookieAction;
  }> {
    return this.dataSource.transaction(async (manager) => {
      await this.deleteExpiredGuestCarts(manager);
      const owner = await this.resolveOwner(request);
      const resolved = await this.findCart(manager, owner);
      if (!resolved.cart) {
        return { cart: EMPTY_CART, cookie: resolved.cookie };
      }

      await manager.getRepository(CartItem).delete({ cartId: resolved.cart.id });
      const reloaded = await this.loadCart(manager, resolved.cart.id);
      return {
        cart: this.toCartResponse(reloaded),
        cookie: resolved.cookie,
      };
    });
  }

  private async resolveOwner(request: Request): Promise<CartOwner> {
    const sessionToken = this.sessionService.readSessionTokenFromCookie(
      request.cookies,
    );
    const customer =
      await this.sessionService.findCustomerBySessionToken(sessionToken);

    if (customer) {
      return { type: 'customer', customerId: customer.id };
    }

    return {
      type: 'guest',
      token: this.readGuestCartToken(request.cookies),
    };
  }

  private readGuestCartToken(
    cookies: Request['cookies'],
  ): string | undefined {
    const value = cookies?.[GUEST_CART_COOKIE_NAME];
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private async deleteExpiredGuestCarts(manager: EntityManager): Promise<void> {
    await manager
      .getRepository(Cart)
      .createQueryBuilder()
      .delete()
      .where('expires_at IS NOT NULL')
      .andWhere('expires_at <= :now', { now: new Date() })
      .execute();
  }

  private async findCart(
    manager: EntityManager,
    owner: CartOwner,
  ): Promise<ResolvedCart> {
    if (owner.type === 'customer') {
      const cart = await this.lockCart(manager, { customerId: owner.customerId });
      if (!cart) {
        return { cart: null, cookie: { type: 'none' } };
      }

      await this.attachItems(manager, cart);
      return { cart, cookie: { type: 'none' } };
    }

    if (!owner.token) {
      return { cart: null, cookie: { type: 'none' } };
    }

    const tokenHash = this.sessionService.hashSessionToken(owner.token);
    const cart = await this.lockCart(manager, { guestTokenHash: tokenHash });
    if (!cart) {
      return { cart: null, cookie: { type: 'clear' } };
    }

    const now = new Date();
    cart.lastActivityAt = now;
    cart.expiresAt = this.expiresAtFrom(now);
    await manager.getRepository(Cart).save(cart);
    await this.attachItems(manager, cart);

    return { cart, cookie: { type: 'set', token: owner.token } };
  }

  private async findOrCreateCart(
    manager: EntityManager,
    owner: CartOwner,
  ): Promise<ResolvedCart> {
    const existing = await this.findCart(manager, owner);
    if (existing.cart) {
      return existing;
    }

    const now = new Date();

    if (owner.type === 'guest') {
      const guestToken = randomBytes(32).toString('base64url');
      const guestTokenHash = this.sessionService.hashSessionToken(guestToken);
      await manager.query(
        `
          INSERT INTO carts (
            customer_id,
            guest_token_hash,
            last_activity_at,
            expires_at
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `,
        [null, guestTokenHash, now, this.expiresAtFrom(now)],
      );

      const cart = await this.lockCart(manager, { guestTokenHash });
      if (cart) {
        await this.attachItems(manager, cart);
      }

      return {
        cart,
        cookie: { type: 'set', token: guestToken },
      };
    }

    await manager.query(
      `
        INSERT INTO carts (
          customer_id,
          guest_token_hash,
          last_activity_at,
          expires_at
        )
        VALUES ($1, NULL, $2, NULL)
        ON CONFLICT DO NOTHING
      `,
      [owner.customerId, now],
    );

    const cart = await this.lockCart(manager, { customerId: owner.customerId });
    if (cart) {
      await this.attachItems(manager, cart);
    }

    return { cart, cookie: { type: 'none' } };
  }

  private async lockCart(
    manager: EntityManager,
    where: { customerId: number } | { guestTokenHash: string },
  ): Promise<Cart | null> {
    return manager.getRepository(Cart).findOne({
      where,
      lock: { mode: 'pessimistic_write' },
    });
  }

  private async attachItems(manager: EntityManager, cart: Cart): Promise<void> {
    cart.items = await manager.getRepository(CartItem).find({
      where: { cartId: cart.id },
      relations: { product: true },
    });
  }

  private async findPurchasableProduct(
    manager: EntityManager,
    productId: number,
  ): Promise<Product> {
    const product = await manager.getRepository(Product).findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${productId} was not found`);
    }

    if (!product.isActive) {
      throw new BadRequestException(
        `Product "${product.name}" is not available for purchase`,
      );
    }

    return product;
  }

  private async loadCart(manager: EntityManager, cartId: number): Promise<Cart> {
    const cart = await manager.getRepository(Cart).findOne({
      where: { id: cartId },
      relations: { items: { product: true } },
    });

    if (!cart) {
      throw new NotFoundException('Cart was not found');
    }

    return cart;
  }

  private expiresAtFrom(now: Date): Date {
    return new Date(now.getTime() + GUEST_CART_TTL_DAYS * 24 * 60 * 60 * 1000);
  }

  private toCartResponse(cart: Cart): CartResponse {
    const items = [...(cart.items ?? [])]
      .sort((left, right) => left.id - right.id)
      .map((item) => this.toItemResponse(item));
    const subtotal = addMoney(
      ...items.filter((item) => item.isActive).map((item) => item.lineTotal),
    );

    return { items, subtotal };
  }

  private toItemResponse(item: CartItem): CartItemResponse {
    const product = item.product;
    const unitPrice = product.price;
    const lineTotal = multiplyMoney(unitPrice, item.quantity);
    const priceChanged = !this.sameMoney(unitPrice, item.seenUnitPrice);
    const unavailable = !product.isActive;
    const insufficientStock =
      product.stockQuantity <= 0 || item.quantity > product.stockQuantity;

    let attentionMessage: string | null = null;
    if (unavailable) {
      attentionMessage = UNAVAILABLE_PRODUCT_MESSAGE;
    } else if (insufficientStock) {
      attentionMessage = STOCK_ATTENTION_MESSAGE;
    }

    return {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: product.imageUrl,
      unitPrice,
      seenUnitPrice: item.seenUnitPrice,
      priceChanged,
      quantity: item.quantity,
      stockQuantity: product.stockQuantity,
      isActive: product.isActive,
      lineTotal,
      requiresAttention: attentionMessage !== null,
      attentionMessage,
    };
  }

  private sameMoney(left: string, right: string): boolean {
    return multiplyMoney(left, 1) === multiplyMoney(right, 1);
  }
}
