import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentCustomer } from '../auth/decorators/current-customer.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import type { Customer } from '../customers/entities/customer.entity';
import {
  AdminProductsService,
  UploadedProductImage,
} from './admin-products.service';
import { DEFAULT_MAX_UPLOAD_BYTES } from '../config/product-configuration';
import { CreateProductDto } from './dto/create-product.dto';
import { ListAdminProductsQueryDto } from './dto/list-admin-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

/**
 * Studio product and inventory management. Every route requires an
 * administrator session; writes additionally require the CSRF token and the
 * configured origin.
 */
@Controller('admin/products')
@UseGuards(AdminGuard)
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get()
  list(@Query() query: ListAdminProductsQueryDto) {
    return this.adminProductsService.list(query);
  }

  // Declared before the parameterised routes so "stats" is not read as an id.
  @Get('stats')
  stats() {
    return this.adminProductsService.stats();
  }

  @Get('categories')
  categories() {
    return this.adminProductsService.categories();
  }

  @Get('images')
  images() {
    return this.adminProductsService.listImages();
  }

  @Post('images')
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: DEFAULT_MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  uploadImage(
    @UploadedFile()
    file: UploadedProductImage | undefined,
    @CurrentCustomer() customer: Customer,
  ) {
    return this.adminProductsService.uploadImage(file, { id: customer.id });
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.adminProductsService.findOne(id);
  }

  @Get(':id/stock-adjustments')
  stockAdjustments(@Param('id', ParseIntPipe) id: number) {
    return this.adminProductsService.listStockAdjustments(id);
  }

  @Post()
  @UseGuards(CsrfGuard)
  create(@Body() dto: CreateProductDto, @CurrentCustomer() customer: Customer) {
    return this.adminProductsService.create(dto, { id: customer.id });
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.adminProductsService.update(id, dto);
  }

  @Patch(':id/stock')
  @UseGuards(CsrfGuard)
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
    @CurrentCustomer() customer: Customer,
  ) {
    return this.adminProductsService.updateStock(id, dto, { id: customer.id });
  }
}
