import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  adminCanCancelOrder,
  allowedOrderStatusTransitions,
  assertOrderStatusTransition,
  canTransitionOrderStatus,
  customerCanCancelOrder,
  isTerminalOrderStatus,
} from './order-lifecycle';

describe('order lifecycle transitions', () => {
  it('allows only forward fulfilment steps and cancellation', () => {
    expect(canTransitionOrderStatus('pending', 'confirmed')).toBe(true);
    expect(canTransitionOrderStatus('confirmed', 'processing')).toBe(true);
    expect(canTransitionOrderStatus('processing', 'shipped')).toBe(true);
    expect(canTransitionOrderStatus('shipped', 'delivered')).toBe(true);
    expect(canTransitionOrderStatus('pending', 'cancelled')).toBe(true);
    expect(canTransitionOrderStatus('confirmed', 'cancelled')).toBe(true);
    expect(canTransitionOrderStatus('processing', 'cancelled')).toBe(true);
  });

  it('rejects skipping steps, going backwards and leaving terminal states', () => {
    expect(canTransitionOrderStatus('pending', 'shipped')).toBe(false);
    expect(canTransitionOrderStatus('pending', 'delivered')).toBe(false);
    expect(canTransitionOrderStatus('confirmed', 'pending')).toBe(false);
    expect(canTransitionOrderStatus('shipped', 'confirmed')).toBe(false);
    expect(canTransitionOrderStatus('delivered', 'cancelled')).toBe(false);
    expect(canTransitionOrderStatus('cancelled', 'pending')).toBe(false);
  });

  it('treats delivered and cancelled as terminal', () => {
    expect(isTerminalOrderStatus('delivered')).toBe(true);
    expect(isTerminalOrderStatus('cancelled')).toBe(true);
    expect(isTerminalOrderStatus('shipped')).toBe(false);
  });

  it('throws a BadRequestException for invalid transitions', () => {
    expect(() =>
      assertOrderStatusTransition('pending', 'delivered'),
    ).toThrow(BadRequestException);
    expect(() =>
      assertOrderStatusTransition('confirmed', 'confirmed'),
    ).toThrow(/already marked/i);
    expect(() =>
      assertOrderStatusTransition('confirmed', 'processing'),
    ).not.toThrow();
  });

  it('does not offer cancellation once an order is shipped', () => {
    expect(allowedOrderStatusTransitions('shipped')).toEqual(['delivered']);
    expect(allowedOrderStatusTransitions('delivered')).toEqual([]);
  });
});

describe('cancellation policy', () => {
  it('lets customers cancel only unpaid pending/confirmed orders', () => {
    expect(customerCanCancelOrder('pending', 'unpaid')).toBe(true);
    expect(customerCanCancelOrder('confirmed', 'unpaid')).toBe(true);
    expect(customerCanCancelOrder('processing', 'unpaid')).toBe(false);
    expect(customerCanCancelOrder('pending', 'paid')).toBe(false);
    expect(customerCanCancelOrder('pending', 'failed')).toBe(false);
  });

  it('lets admins cancel unfulfilled orders regardless of payment', () => {
    expect(adminCanCancelOrder('pending')).toBe(true);
    expect(adminCanCancelOrder('confirmed')).toBe(true);
    expect(adminCanCancelOrder('processing')).toBe(true);
    expect(adminCanCancelOrder('shipped')).toBe(false);
    expect(adminCanCancelOrder('delivered')).toBe(false);
    expect(adminCanCancelOrder('cancelled')).toBe(false);
  });
});
