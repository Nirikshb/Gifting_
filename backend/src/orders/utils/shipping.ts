import { compareMoney } from './money';

/** Orders at or above this amount ship for free. */
export const FREE_SHIPPING_THRESHOLD = '499.00';

/** Flat shipping fee applied below the free-shipping threshold. */
export const STANDARD_SHIPPING_AMOUNT = '49.00';

/**
 * Server-side shipping policy. An empty (or zero-value) cart never pays
 * shipping; otherwise a flat fee applies until the free-shipping threshold.
 */
export function calculateShippingAmount(subtotal: string): string {
  if (compareMoney(subtotal, '0.00') <= 0) {
    return '0.00';
  }

  return compareMoney(subtotal, FREE_SHIPPING_THRESHOLD) >= 0
    ? '0.00'
    : STANDARD_SHIPPING_AMOUNT;
}
