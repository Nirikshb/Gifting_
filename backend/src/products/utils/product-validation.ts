export const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PRODUCT_PRICE_PATTERN = /^\d{1,8}(?:\.\d{1,2})?$/;
export const MAX_PRODUCT_PRICE = '99999999.99';
export const MAX_STOCK_QUANTITY = 1_000_000;

export const PRODUCT_SLUG_MESSAGE =
  'Slug can only contain lowercase letters, numbers and single hyphens (for example "kraft-gift-box").';
export const PRODUCT_PRICE_MESSAGE =
  'Price must be a positive amount with up to two decimal places (for example 249 or 249.50).';
export const PRODUCT_STOCK_MESSAGE =
  'Stock quantity must be a whole number of 0 or more.';

/**
 * Slugs are stored lowercase so the same product cannot be reached through
 * two different URLs.
 */
export function normalizeProductSlug(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidProductSlug(value: string): boolean {
  return (
    value.length > 0 && value.length <= 180 && PRODUCT_SLUG_PATTERN.test(value)
  );
}

/**
 * Best effort slug for the admin form. The result is still validated
 * server-side before it is stored.
 */
export function slugifyProductName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

/**
 * Prices are stored as numeric(10,2), so the value is normalised to two
 * decimal places before it reaches the database.
 */
export function normalizeProductPrice(value: string): string {
  const trimmed = value.trim();
  const [whole = '0', fraction = ''] = trimmed.split('.');
  return `${whole}.${fraction.padEnd(2, '0').slice(0, 2)}`;
}

export function isValidProductPrice(value: string): boolean {
  return PRODUCT_PRICE_PATTERN.test(value.trim());
}

export function isValidStockQuantity(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_STOCK_QUANTITY;
}
