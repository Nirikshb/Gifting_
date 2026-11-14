import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Stock at or below this quantity is reported as "low stock" in the admin
 * area. Configurable so a small studio can raise it later without a code
 * change.
 */
export function getLowStockThreshold(configService: ConfigService): number {
  const raw = configService.get<string>('LOW_STOCK_THRESHOLD')?.trim();
  if (!raw) {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }

  return parsed;
}

/**
 * Where uploaded product images are written. The directory is created on
 * demand; the original file name never becomes part of the stored name.
 */
export function getProductImageUploadDirectory(
  configService: ConfigService,
): string {
  const raw = configService.get<string>('PRODUCT_IMAGE_UPLOAD_DIR')?.trim();

  if (raw) {
    return resolve(raw);
  }

  return resolve(process.cwd(), 'uploads', 'products');
}

export function getMaxProductImageBytes(configService: ConfigService): number {
  const raw = configService.get<string>('PRODUCT_IMAGE_MAX_BYTES')?.trim();

  if (!raw) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }

  return parsed;
}
