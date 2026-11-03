import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Product } from '../products/entities/product.entity';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';
import { CartItem } from './entities/cart-item.entity';
import { Cart } from './entities/cart.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, Product]),
    forwardRef(() => AuthModule),
  ],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}
