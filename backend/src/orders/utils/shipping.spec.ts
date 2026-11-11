import { describe, expect, it } from 'vitest';
import { calculateShippingAmount } from './shipping';

describe('calculateShippingAmount', () => {
  it('never charges shipping for an empty cart', () => {
    expect(calculateShippingAmount('0.00')).toBe('0.00');
  });

  it('charges the flat fee below the free-shipping threshold', () => {
    expect(calculateShippingAmount('4.50')).toBe('49.00');
    expect(calculateShippingAmount('498.99')).toBe('49.00');
  });

  it('is free at and above the threshold', () => {
    expect(calculateShippingAmount('499.00')).toBe('0.00');
    expect(calculateShippingAmount('1200.00')).toBe('0.00');
  });
});
