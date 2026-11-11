import { describe, expect, it } from 'vitest';
import {
  createOrderConfirmationToken,
  hashOrderConfirmationToken,
} from './order-confirmation-token';

describe('order confirmation tokens', () => {
  it('creates distinct high-entropy tokens', () => {
    const first = createOrderConfirmationToken();
    const second = createOrderConfirmationToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
  });

  it('hashes deterministically to a 64-character digest', () => {
    const token = createOrderConfirmationToken();

    expect(hashOrderConfirmationToken(token)).toBe(
      hashOrderConfirmationToken(token),
    );
    expect(hashOrderConfirmationToken(token)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('does not store the raw token', () => {
    const token = createOrderConfirmationToken();

    expect(hashOrderConfirmationToken(token)).not.toContain(token);
  });
});
