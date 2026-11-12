import { BadRequestException } from '@nestjs/common';
import {
  ORDER_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from '../entities/order.entity';

/**
 * Fulfilment is deliberately forward-only. Delivered and cancelled are
 * terminal states; reversing them would misrepresent what the customer saw.
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<
  Record<OrderStatus, readonly OrderStatus[]>
> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const CUSTOMER_CANCELLABLE_ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
];

export const ADMIN_CANCELLABLE_ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
];

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[status].length === 0;
}

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function allowedOrderStatusTransitions(
  from: OrderStatus,
): readonly OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[from];
}

export function assertOrderStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): void {
  if (from === to) {
    throw new BadRequestException(`Order is already marked as "${to}".`);
  }

  if (!canTransitionOrderStatus(from, to)) {
    throw new BadRequestException(
      `Cannot move an order from "${from}" to "${to}".`,
    );
  }
}

/**
 * Customers may only self-cancel an unpaid order that staff have not started
 * fulfilling. Paid cancellations stay an admin decision so refunds are handled
 * deliberately.
 */
export function customerCanCancelOrder(
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus,
): boolean {
  return (
    paymentStatus === 'unpaid' &&
    CUSTOMER_CANCELLABLE_ORDER_STATUSES.includes(orderStatus)
  );
}

export function adminCanCancelOrder(orderStatus: OrderStatus): boolean {
  return ADMIN_CANCELLABLE_ORDER_STATUSES.includes(orderStatus);
}
