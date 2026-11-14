import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { ProductImage } from './entities/product-image.entity';
import { Product } from './entities/product.entity';
import { StockAdjustment } from './entities/stock-adjustment.entity';
import { ProductImagesController } from './product-images.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, StockAdjustment]),
    AuthModule,
  ],
  controllers: [
    ProductsController,
    AdminProductsController,
    ProductImagesController,
  ],
  providers: [ProductsService, AdminProductsService],
})
export class ProductsModule {}
