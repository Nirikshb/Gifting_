import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateStockDto } from '../dto/update-stock.dto';
import {
  isValidProductPrice,
  isValidProductSlug,
  isValidStockQuantity,
  normalizeProductPrice,
  normalizeProductSlug,
  slugifyProductName,
} from './product-validation';

async function validationErrors(dto: object) {
  return validate(plainToInstance(CreateProductDto, dto));
}

describe('product validation', () => {
  describe('slug', () => {
    it('accepts lowercase kebab case', () => {
      expect(isValidProductSlug('kraft-gift-box')).toBe(true);
      expect(isValidProductSlug('box2')).toBe(true);
    });

    it('rejects spaces, capitals, double hyphens and empty values', () => {
      expect(isValidProductSlug('Kraft Gift Box')).toBe(false);
      expect(isValidProductSlug('kraft--gift-box')).toBe(false);
      expect(isValidProductSlug('-kraft')).toBe(false);
      expect(isValidProductSlug('')).toBe(false);
    });

    it('normalises the value the admin typed', () => {
      expect(normalizeProductSlug('  Kraft-Gift-Box ')).toBe('kraft-gift-box');
    });

    it('builds a slug from a product name', () => {
      expect(slugifyProductName('Kraft Gift Box (Large)')).toBe(
        'kraft-gift-box-large',
      );
    });
  });

  describe('price', () => {
    it('accepts up to two decimal places', () => {
      expect(isValidProductPrice('249')).toBe(true);
      expect(isValidProductPrice('249.5')).toBe(true);
      expect(isValidProductPrice('249.50')).toBe(true);
      expect(isValidProductPrice('0')).toBe(true);
    });

    it('rejects negative, empty and over-precise amounts', () => {
      expect(isValidProductPrice('-1')).toBe(false);
      expect(isValidProductPrice('-1.00')).toBe(false);
      expect(isValidProductPrice('1.234')).toBe(false);
      expect(isValidProductPrice('abc')).toBe(false);
      expect(isValidProductPrice('')).toBe(false);
    });

    it('normalises the amount to two decimals', () => {
      expect(normalizeProductPrice('249')).toBe('249.00');
      expect(normalizeProductPrice('249.5')).toBe('249.50');
      expect(normalizeProductPrice('249.55')).toBe('249.55');
    });
  });

  describe('stock quantity', () => {
    it('accepts zero and positive whole numbers', () => {
      expect(isValidStockQuantity(0)).toBe(true);
      expect(isValidStockQuantity(12)).toBe(true);
    });

    it('rejects negatives and fractions', () => {
      expect(isValidStockQuantity(-1)).toBe(false);
      expect(isValidStockQuantity(1.5)).toBe(false);
      expect(isValidStockQuantity(1_000_001)).toBe(false);
    });
  });

  describe('create product payload', () => {
    const valid = {
      name: 'Kraft Gift Box',
      slug: 'kraft-gift-box',
      description: 'A sturdy box.',
      price: '249.50',
      category: 'gift boxes',
      stockQuantity: 10,
    };

    it('accepts a complete product', async () => {
      expect(await validationErrors(valid)).toHaveLength(0);
    });

    it('rejects an invalid price', async () => {
      const errors = await validationErrors({ ...valid, price: '12.345' });
      expect(errors.map((error) => error.property)).toContain('price');
    });

    it('rejects a negative price', async () => {
      const errors = await validationErrors({ ...valid, price: '-5' });
      expect(errors.map((error) => error.property)).toContain('price');
    });

    it('rejects a negative stock quantity', async () => {
      const errors = await validationErrors({
        ...valid,
        stockQuantity: -3,
      });
      expect(errors.map((error) => error.property)).toContain('stockQuantity');
    });

    it('rejects a blank name', async () => {
      const errors = await validationErrors({ ...valid, name: '   ' });
      expect(errors.map((error) => error.property)).toContain('name');
    });
  });

  describe('stock update payload', () => {
    it('requires a reason and a valid quantity', async () => {
      const errors = await validate(
        plainToInstance(UpdateStockDto, { stockQuantity: -1 }),
      );
      const properties = errors.map((error) => error.property);

      expect(properties).toContain('stockQuantity');
      expect(properties).toContain('reason');
    });

    it('accepts a zero quantity with a reason', async () => {
      const errors = await validate(
        plainToInstance(UpdateStockDto, {
          stockQuantity: 0,
          reason: 'Stock take',
        }),
      );

      expect(errors).toHaveLength(0);
    });
  });
});
