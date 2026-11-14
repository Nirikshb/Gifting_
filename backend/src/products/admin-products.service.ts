import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  Between,
  DataSource,
  EntityManager,
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThan,
  QueryFailedError,
} from 'typeorm';
import { getFrontendOrigin } from '../config/auth-configuration';
import {
  getLowStockThreshold,
  getMaxProductImageBytes,
  getProductImageUploadDirectory,
} from '../config/product-configuration';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import {
  AdminProductDetailResponse,
  AdminProductStatsResponse,
  AdminProductSummaryResponse,
  ProductImageResponse,
  ProductStockState,
  StockAdjustmentResponse,
  StockUpdateResponse,
} from './dto/admin-product-response.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListAdminProductsQueryDto } from './dto/list-admin-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ProductImage } from './entities/product-image.entity';
import { Product } from './entities/product.entity';
import { StockAdjustment } from './entities/stock-adjustment.entity';
import {
  buildProductImageFileName,
  buildProductImageUrl,
  detectProductImageMimeType,
  sanitizeOriginalFileName,
} from './utils/product-image';
import {
  isValidProductPrice,
  isValidProductSlug,
  isValidStockQuantity,
  normalizeProductPrice,
  normalizeProductSlug,
  PRODUCT_PRICE_MESSAGE,
  PRODUCT_SLUG_MESSAGE,
  PRODUCT_STOCK_MESSAGE,
} from './utils/product-validation';

const PRODUCT_NOT_FOUND_MESSAGE = 'Product not found';
const SLUG_CONFLICT_MESSAGE = 'A product with this slug already exists.';

/**
 * The shape of the file handed over by the upload interceptor. It is
 * described locally so the project does not depend on extra type packages.
 */
export type UploadedProductImage = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type AdminActor = {
  id: number | null;
};

@Injectable()
export class AdminProductsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async list(
    query: ListAdminProductsQueryDto,
  ): Promise<PaginatedResult<AdminProductSummaryResponse>> {
    const repository = this.dataSource.getRepository(Product);
    const threshold = getLowStockThreshold(this.configService);

    const base: FindOptionsWhere<Product> = {};
    if (query.category) {
      base.category = query.category;
    }

    if (query.availability === 'active') {
      base.isActive = true;
    } else if (query.availability === 'inactive') {
      base.isActive = false;
    }

    if (query.stock === 'out') {
      base.stockQuantity = LessThanOrEqual(0);
    } else if (query.stock === 'low') {
      base.stockQuantity = Between(1, threshold);
    } else if (query.stock === 'in') {
      base.stockQuantity = MoreThan(threshold);
    }

    let where: FindOptionsWhere<Product> | FindOptionsWhere<Product>[] = base;

    if (query.search) {
      const search = `%${query.search}%`;
      where = [
        { ...base, name: ILike(search) },
        { ...base, slug: ILike(search) },
      ];
    }

    const [products, total] = await repository.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      items: products.map((product) => this.toSummary(product, threshold)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async stats(): Promise<AdminProductStatsResponse> {
    const repository = this.dataSource.getRepository(Product);
    const threshold = getLowStockThreshold(this.configService);

    const [
      totalProducts,
      activeProducts,
      inactiveProducts,
      outOfStockProducts,
      lowStockProducts,
    ] = await Promise.all([
      repository.count(),
      repository.count({ where: { isActive: true } }),
      repository.count({ where: { isActive: false } }),
      repository.count({ where: { stockQuantity: LessThanOrEqual(0) } }),
      repository.count({
        where: { stockQuantity: Between(1, threshold) },
      }),
    ]);

    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      outOfStockProducts,
      lowStockProducts,
      lowStockThreshold: threshold,
    };
  }

  async categories(): Promise<string[]> {
    const rows = await this.dataSource.query<{ category?: unknown }[]>(
      'SELECT DISTINCT category FROM products ORDER BY category ASC',
    );

    return rows
      .map((row) => row?.category)
      .filter(
        (category): category is string =>
          typeof category === 'string' && category.trim() !== '',
      );
  }

  async findOne(id: number): Promise<AdminProductDetailResponse> {
    const product = await this.dataSource.getRepository(Product).findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(PRODUCT_NOT_FOUND_MESSAGE);
    }

    return this.toDetail(product);
  }

  async create(
    dto: CreateProductDto,
    actor: AdminActor,
  ): Promise<AdminProductDetailResponse> {
    const repository = this.dataSource.getRepository(Product);
    const slug = normalizeProductSlug(dto.slug);

    this.assertValidSlug(slug);
    this.assertValidPrice(dto.price);
    this.assertValidStock(dto.stockQuantity);

    const duplicate = await repository.findOne({ where: { slug } });
    if (duplicate) {
      throw new ConflictException(SLUG_CONFLICT_MESSAGE);
    }

    const imageUrl = await this.resolveImageUrl(dto.imageId);

    const product = repository.create({
      name: dto.name.trim(),
      slug,
      description: dto.description.trim(),
      price: normalizeProductPrice(dto.price),
      category: dto.category.trim(),
      stockQuantity: dto.stockQuantity,
      imageUrl: imageUrl ?? null,
      isActive: dto.isActive ?? true,
    });

    try {
      await repository.save(product);
    } catch (error) {
      if (this.isSlugUniqueViolation(error)) {
        throw new ConflictException(SLUG_CONFLICT_MESSAGE);
      }

      throw error;
    }

    if (product.stockQuantity > 0) {
      await this.dataSource.getRepository(StockAdjustment).save({
        productId: product.id,
        previousQuantity: 0,
        newQuantity: product.stockQuantity,
        delta: product.stockQuantity,
        reason: 'Initial stock',
        actorType: 'admin',
        actorId: actor.id,
      });
    }

    return this.toDetail(product);
  }

  async update(
    id: number,
    dto: UpdateProductDto,
  ): Promise<AdminProductDetailResponse> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Product);
      const product = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        throw new NotFoundException(PRODUCT_NOT_FOUND_MESSAGE);
      }

      if (dto.name !== undefined) {
        product.name = dto.name.trim();
      }

      if (dto.slug !== undefined) {
        const slug = normalizeProductSlug(dto.slug);
        this.assertValidSlug(slug);

        if (slug !== product.slug) {
          const duplicate = await repository.findOne({ where: { slug } });
          if (duplicate && duplicate.id !== product.id) {
            throw new ConflictException(SLUG_CONFLICT_MESSAGE);
          }
        }

        product.slug = slug;
      }

      if (dto.description !== undefined) {
        product.description = dto.description.trim();
      }

      if (dto.price !== undefined) {
        this.assertValidPrice(dto.price);
        product.price = normalizeProductPrice(dto.price);
      }

      if (dto.category !== undefined) {
        product.category = dto.category.trim();
      }

      if (dto.isActive !== undefined) {
        product.isActive = dto.isActive;
      }

      if (dto.imageId !== undefined) {
        const imageUrl = await this.resolveImageUrl(dto.imageId, manager);
        product.imageUrl = imageUrl ?? null;
      }

      try {
        await repository.save(product);
      } catch (error) {
        if (this.isSlugUniqueViolation(error)) {
          throw new ConflictException(SLUG_CONFLICT_MESSAGE);
        }

        throw error;
      }

      return this.toDetail(product);
    });
  }

  /**
   * Sets the available quantity of a product. The row is locked so two
   * concurrent adjustments cannot overwrite each other, and every change is
   * recorded with the previous value, the new value and a reason.
   */
  async updateStock(
    id: number,
    dto: UpdateStockDto,
    actor: AdminActor,
  ): Promise<StockUpdateResponse> {
    this.assertValidStock(dto.stockQuantity);

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Product);
      const product = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        throw new NotFoundException(PRODUCT_NOT_FOUND_MESSAGE);
      }

      const previousQuantity = product.stockQuantity;

      if (previousQuantity === dto.stockQuantity) {
        return {
          product: this.toDetail(product),
          adjustment: null,
          changed: false,
        };
      }

      product.stockQuantity = dto.stockQuantity;
      await repository.save(product);

      const adjustment = await manager.getRepository(StockAdjustment).save({
        productId: product.id,
        previousQuantity,
        newQuantity: dto.stockQuantity,
        delta: dto.stockQuantity - previousQuantity,
        reason: dto.reason.trim(),
        actorType: 'admin',
        actorId: actor.id,
      });

      return {
        product: this.toDetail(product),
        adjustment: this.toAdjustmentResponse(adjustment),
        changed: true,
      };
    });
  }

  async listStockAdjustments(id: number): Promise<StockAdjustmentResponse[]> {
    const repository = this.dataSource.getRepository(Product);
    const product = await repository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(PRODUCT_NOT_FOUND_MESSAGE);
    }

    const adjustments = await this.dataSource
      .getRepository(StockAdjustment)
      .find({
        where: { productId: id },
        order: { createdAt: 'DESC', id: 'DESC' },
        take: 50,
      });

    return adjustments.map((adjustment) =>
      this.toAdjustmentResponse(adjustment),
    );
  }

  async listImages(): Promise<ProductImageResponse[]> {
    const images = await this.dataSource.getRepository(ProductImage).find({
      order: { id: 'DESC' },
      take: 50,
    });

    return images.map((image) => this.toImageResponse(image));
  }

  /**
   * Stores an uploaded image. The content type is detected from the file
   * signature, the stored name is generated by the server and the public URL
   * is derived from the configured storefront origin.
   */
  async uploadImage(
    file: UploadedProductImage | undefined,
    actor: AdminActor,
  ): Promise<ProductImageResponse> {
    const frontendOrigin = getFrontendOrigin(this.configService);
    if (!frontendOrigin) {
      throw new ServiceUnavailableException(
        'Product image uploads are not configured on this server.',
      );
    }

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Choose an image file to upload.');
    }

    const maxBytes = getMaxProductImageBytes(this.configService);
    if (file.buffer.length > maxBytes) {
      throw new PayloadTooLargeException(
        `Images must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller.`,
      );
    }

    const mimeType = detectProductImageMimeType(file.buffer);
    if (!mimeType) {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP, GIF or AVIF images can be uploaded.',
      );
    }

    const storedName = buildProductImageFileName(mimeType);
    const directory = getProductImageUploadDirectory(this.configService);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, storedName), file.buffer);

    const image = await this.dataSource.getRepository(ProductImage).save({
      originalName: sanitizeOriginalFileName(file.originalname ?? 'image'),
      storedName,
      mimeType,
      sizeBytes: file.buffer.length,
      createdByCustomerId: actor.id,
    });

    return this.toImageResponse(image);
  }

  private async resolveImageUrl(
    imageId: number | null | undefined,
    manager?: EntityManager,
  ): Promise<string | null | undefined> {
    if (imageId === undefined) {
      return undefined;
    }

    if (imageId === null) {
      return null;
    }

    const frontendOrigin = getFrontendOrigin(this.configService);
    if (!frontendOrigin) {
      throw new ServiceUnavailableException(
        'Product image uploads are not configured on this server.',
      );
    }

    const repository = (manager ?? this.dataSource).getRepository(ProductImage);
    const image = await repository.findOne({ where: { id: imageId } });

    if (!image) {
      throw new BadRequestException(
        'That image could not be found. Upload it again.',
      );
    }

    return buildProductImageUrl(frontendOrigin, image.storedName);
  }

  private assertValidSlug(slug: string): void {
    if (!isValidProductSlug(slug)) {
      throw new BadRequestException(PRODUCT_SLUG_MESSAGE);
    }
  }

  private assertValidPrice(price: string): void {
    if (!isValidProductPrice(price)) {
      throw new BadRequestException(PRODUCT_PRICE_MESSAGE);
    }
  }

  private assertValidStock(stockQuantity: number): void {
    if (!isValidStockQuantity(stockQuantity)) {
      throw new BadRequestException(PRODUCT_STOCK_MESSAGE);
    }
  }

  private isSlugUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error as { driverError?: { code?: string } }).driverError?.code ===
        '23505'
    );
  }

  private stockState(
    stockQuantity: number,
    threshold: number,
  ): ProductStockState {
    if (stockQuantity <= 0) {
      return 'out';
    }

    if (stockQuantity <= threshold) {
      return 'low';
    }

    return 'in';
  }

  private toSummary(
    product: Product,
    threshold: number,
  ): AdminProductSummaryResponse {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      category: product.category,
      stockQuantity: product.stockQuantity,
      stockState: this.stockState(product.stockQuantity, threshold),
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private toDetail(product: Product): AdminProductDetailResponse {
    const threshold = getLowStockThreshold(this.configService);

    return {
      ...this.toSummary(product, threshold),
      description: product.description,
    };
  }

  private toAdjustmentResponse(
    adjustment: StockAdjustment,
  ): StockAdjustmentResponse {
    return {
      id: adjustment.id,
      productId: adjustment.productId,
      previousQuantity: adjustment.previousQuantity,
      newQuantity: adjustment.newQuantity,
      delta: adjustment.delta,
      reason: adjustment.reason,
      actorType: adjustment.actorType,
      actorId: adjustment.actorId,
      createdAt: adjustment.createdAt,
    };
  }

  private toImageResponse(image: ProductImage): ProductImageResponse {
    const frontendOrigin = getFrontendOrigin(this.configService);

    return {
      id: image.id,
      url: frontendOrigin
        ? buildProductImageUrl(frontendOrigin, image.storedName)
        : '',
      originalName: image.originalName,
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes,
      createdAt: image.createdAt,
    };
  }
}
