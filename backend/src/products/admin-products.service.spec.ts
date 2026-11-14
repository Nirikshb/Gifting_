import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProductsService } from './admin-products.service';
import { ProductImage } from './entities/product-image.entity';
import { Product } from './entities/product.entity';
import { StockAdjustment } from './entities/stock-adjustment.entity';

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(() => Promise.resolve()),
  writeFile: vi.fn(() => Promise.resolve()),
}));

const configValues: Record<string, string> = {
  FRONTEND_ORIGIN: 'http://localhost:4000',
};

const productRepository = {
  find: vi.fn(),
  findOne: vi.fn(),
  findAndCount: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
};

const imageRepository = {
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
};

const adjustmentRepository = {
  find: vi.fn(),
  save: vi.fn(),
};

function repositoryFor(entity: unknown) {
  if (entity === ProductImage) return imageRepository;
  if (entity === StockAdjustment) return adjustmentRepository;
  return productRepository;
}

const manager = {
  getRepository: vi.fn(),
};

const dataSource = {
  getRepository: vi.fn(),
  transaction: vi.fn(),
  query: vi.fn(),
};

const configService = {
  get: vi.fn((key: string) => configValues[key]),
} as unknown as ConfigService;

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 42,
    name: 'Kraft Gift Box',
    slug: 'kraft-gift-box',
    description: 'A sturdy box for hampers.',
    price: '249.00',
    stockQuantity: 3,
    imageUrl: null,
    category: 'gift boxes',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

const actor = { id: 7 };

describe('AdminProductsService', () => {
  let service: AdminProductsService;

  beforeEach(() => {
    vi.resetAllMocks();

    manager.getRepository.mockImplementation(repositoryFor);
    dataSource.getRepository.mockImplementation(repositoryFor);
    dataSource.transaction.mockImplementation(
      (callback: (manager: unknown) => unknown) =>
        Promise.resolve(callback(manager)),
    );

    productRepository.create.mockImplementation((data: unknown) => ({
      ...(data as object),
    }));
    productRepository.save.mockImplementation((entity: unknown) => {
      const record = entity as { id?: number };
      record.id = record.id ?? 42;
      return Promise.resolve(entity);
    });
    imageRepository.save.mockImplementation((entity: unknown) => {
      const record = entity as { id?: number; createdAt?: Date };
      record.id = record.id ?? 3;
      record.createdAt = record.createdAt ?? new Date('2026-01-02');
      return Promise.resolve(entity);
    });
    adjustmentRepository.save.mockImplementation((entity: unknown) => {
      const record = entity as { id?: number; createdAt?: Date };
      record.id = record.id ?? 9;
      record.createdAt = record.createdAt ?? new Date('2026-01-02');
      return Promise.resolve(entity);
    });

    service = new AdminProductsService(dataSource as never, configService);
  });

  describe('create', () => {
    const payload = {
      name: 'Kraft Gift Box',
      slug: 'Kraft-Gift-Box',
      description: 'A sturdy box for hampers.',
      price: '249',
      category: 'gift boxes',
      stockQuantity: 12,
    };

    it('stores the product with a normalised slug and price', async () => {
      productRepository.findOne.mockResolvedValue(null);

      const product = await service.create(payload, actor);

      expect(productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'kraft-gift-box',
          price: '249.00',
          isActive: true,
          imageUrl: null,
          stockQuantity: 12,
        }),
      );
      expect(product.slug).toBe('kraft-gift-box');
    });

    it('records the opening stock as an adjustment', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await service.create(payload, actor);

      expect(adjustmentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 42,
          previousQuantity: 0,
          newQuantity: 12,
          delta: 12,
          reason: 'Initial stock',
          actorType: 'admin',
          actorId: 7,
        }),
      );
    });

    it('does not record an adjustment for a product without stock', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await service.create({ ...payload, stockQuantity: 0 }, actor);

      expect(adjustmentRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a duplicate slug', async () => {
      productRepository.findOne.mockResolvedValue(makeProduct());

      await expect(service.create(payload, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects an invalid slug', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ ...payload, slug: 'Kraft Gift Box' }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an invalid price', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ ...payload, price: '12.345' }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a negative stock quantity', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ ...payload, stockQuantity: -1 }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('uses the uploaded image instead of a client supplied url', async () => {
      productRepository.findOne.mockResolvedValue(null);
      imageRepository.findOne.mockResolvedValue({
        id: 3,
        storedName: '11111111-2222-3333-4444-555555555555.png',
      });

      await service.create({ ...payload, imageId: 3 }, actor);

      expect(productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl:
            'http://localhost:4000/api/product-images/11111111-2222-3333-4444-555555555555.png',
        }),
      );
    });

    it('rejects an image that was never uploaded', async () => {
      productRepository.findOne.mockResolvedValue(null);
      imageRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ ...payload, imageId: 99 }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('applies the changed fields', async () => {
      const product = makeProduct();
      productRepository.findOne.mockResolvedValueOnce(product);

      await service.update(42, {
        name: 'Kraft Box',
        price: '199.50',
        isActive: false,
      });

      expect(productRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Kraft Box',
          price: '199.50',
          isActive: false,
        }),
      );
    });

    it('keeps the slug unique', async () => {
      productRepository.findOne
        .mockResolvedValueOnce(makeProduct())
        .mockResolvedValueOnce(makeProduct({ id: 43, slug: 'taken-slug' }));

      await expect(
        service.update(42, { slug: 'taken-slug' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows a product to keep its own slug', async () => {
      productRepository.findOne
        .mockResolvedValueOnce(makeProduct())
        .mockResolvedValueOnce(makeProduct());

      await service.update(42, { slug: 'kraft-gift-box' });

      expect(productRepository.save).toHaveBeenCalled();
    });

    it('removes the image when the image id is null', async () => {
      productRepository.findOne.mockResolvedValueOnce(makeProduct());

      await service.update(42, { imageId: null });

      expect(productRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ imageUrl: null }),
      );
    });

    it('reports a missing product', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.update(9, { name: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateStock', () => {
    it('locks the row, sets the quantity and records the reason', async () => {
      productRepository.findOne.mockResolvedValue(makeProduct());

      const result = await service.updateStock(
        42,
        { stockQuantity: 10, reason: 'New delivery' },
        actor,
      );

      expect(productRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 42 },
          lock: { mode: 'pessimistic_write' },
        }),
      );
      expect(productRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ stockQuantity: 10 }),
      );
      expect(adjustmentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 42,
          previousQuantity: 3,
          newQuantity: 10,
          delta: 7,
          reason: 'New delivery',
          actorType: 'admin',
          actorId: 7,
        }),
      );
      expect(result.changed).toBe(true);
      expect(result.adjustment?.delta).toBe(7);
    });

    it('does nothing when the quantity is unchanged', async () => {
      productRepository.findOne.mockResolvedValue(makeProduct());

      const result = await service.updateStock(
        42,
        { stockQuantity: 3, reason: 'Check' },
        actor,
      );

      expect(adjustmentRepository.save).not.toHaveBeenCalled();
      expect(result.changed).toBe(false);
      expect(result.adjustment).toBeNull();
    });

    it('rejects a negative quantity', async () => {
      await expect(
        service.updateStock(42, { stockQuantity: -1, reason: 'x' }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reports a missing product', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStock(9, { stockQuantity: 1, reason: 'x' }, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('list', () => {
    it('returns a paginated page with stock state', async () => {
      productRepository.findAndCount.mockResolvedValue([
        [
          makeProduct({ stockQuantity: 0 }),
          makeProduct({ id: 43, stockQuantity: 3 }),
          makeProduct({ id: 44, stockQuantity: 20 }),
        ],
        3,
      ]);

      const result = await service.list({ page: 1, limit: 10 });

      expect(result.total).toBe(3);
      expect(result.items.map((item) => item.stockState)).toEqual([
        'out',
        'low',
        'in',
      ]);
      expect(productRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('searches the name and the slug', async () => {
      productRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.list({ page: 2, limit: 5, search: 'kraft' });

      const call = productRepository.findAndCount.mock.calls[0][0] as {
        skip: number;
        where: unknown[];
      };
      expect(call.skip).toBe(5);
      expect(call.where).toHaveLength(2);
    });

    it('filters by availability and stock', async () => {
      productRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.list({
        page: 1,
        limit: 10,
        availability: 'inactive',
        stock: 'out',
      });

      const call = productRepository.findAndCount.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(call.where.isActive).toBe(false);
      expect(call.where.stockQuantity).toBeDefined();
    });
  });

  describe('stats', () => {
    it('counts products, availability and stock levels', async () => {
      productRepository.count
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(3);

      const stats = await service.stats();

      expect(stats).toEqual({
        totalProducts: 12,
        activeProducts: 10,
        inactiveProducts: 2,
        outOfStockProducts: 1,
        lowStockProducts: 3,
        lowStockThreshold: 5,
      });
    });
  });

  describe('categories', () => {
    it('returns the distinct categories', async () => {
      dataSource.query.mockResolvedValue([
        { category: 'gift boxes' },
        { category: 'wraps' },
      ]);

      await expect(service.categories()).resolves.toEqual([
        'gift boxes',
        'wraps',
      ]);
    });
  });

  describe('stock adjustments', () => {
    it('returns the history for a product', async () => {
      productRepository.findOne.mockResolvedValue(makeProduct());
      adjustmentRepository.find.mockResolvedValue([
        {
          id: 9,
          productId: 42,
          previousQuantity: 3,
          newQuantity: 10,
          delta: 7,
          reason: 'New delivery',
          actorType: 'admin',
          actorId: 7,
          createdAt: new Date('2026-01-02'),
        },
      ]);

      const adjustments = await service.listStockAdjustments(42);

      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].delta).toBe(7);
    });

    it('reports a missing product', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.listStockAdjustments(9)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('uploadImage', () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(16, 0x11),
    ]);

    it('stores the file with a server generated name', async () => {
      const result = await service.uploadImage(
        {
          originalname: '../../evil.png',
          mimetype: 'application/x-msdownload',
          size: png.length,
          buffer: png,
        },
        actor,
      );

      expect(mkdir).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalled();

      const [path, contents] = (
        writeFile as unknown as ReturnType<typeof vi.fn>
      ).mock.calls[0] as [string, Buffer];
      expect(path).toContain(join('uploads', 'products'));
      expect(contents).toEqual(png);

      expect(result.url).toMatch(
        /^http:\/\/localhost:4000\/api\/product-images\/[0-9a-f-]{36}\.png$/,
      );
      expect(result.originalName).toBe('evil.png');
      expect(result.mimeType).toBe('image/png');
    });

    it('rejects a file that is not an image', async () => {
      await expect(
        service.uploadImage(
          {
            originalname: 'notes.txt',
            mimetype: 'text/plain',
            size: 4,
            buffer: Buffer.from('text'),
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('rejects a request without a file', async () => {
      await expect(
        service.uploadImage(undefined, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
