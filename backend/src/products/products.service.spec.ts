import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let productsService: ProductsService;
  const productsRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
  };

  const kraftGiftBox: Product = {
    id: 1,
    name: 'Kraft Gift Box',
    slug: 'kraft-gift-box',
    description: 'A sturdy kraft gift box for hampers.',
    price: '4.50',
    stockQuantity: 20,
    imageUrl: null,
    category: 'gift boxes',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    productsRepository.find.mockReset();
    productsRepository.findOne.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: productsRepository,
        },
      ],
    }).compile();

    productsService = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('returns active products', async () => {
      productsRepository.find.mockResolvedValue([kraftGiftBox]);

      const products = await productsService.findAll();

      expect(productsRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(products).toEqual([kraftGiftBox]);
    });
  });

  describe('findBySlug', () => {
    it('returns an active product by slug', async () => {
      productsRepository.findOne.mockResolvedValue(kraftGiftBox);

      const product = await productsService.findBySlug('kraft-gift-box');

      expect(productsRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'kraft-gift-box', isActive: true },
      });
      expect(product).toEqual(kraftGiftBox);
    });

    it('throws NotFoundException when the slug does not exist', async () => {
      productsRepository.findOne.mockResolvedValue(null);

      await expect(
        productsService.findBySlug('missing-product'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the product is inactive', async () => {
      productsRepository.findOne.mockResolvedValue(null);

      await expect(
        productsService.findBySlug('kraft-gift-box'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(productsRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'kraft-gift-box', isActive: true },
      });
    });
  });
});
