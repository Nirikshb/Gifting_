import type { OrderStatus, PaymentStatus } from '../entities/order.entity';

export type CreatedOrderLineItemResponse = {
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type CreatedOrderResponse = {
  orderReference: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: string;
  items: CreatedOrderLineItemResponse[];
};

export type OrderDetailsLineItemResponse = {
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type OrderDetailsResponse = {
  orderReference: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: string;
  createdAt: Date;
  items: OrderDetailsLineItemResponse[];
};
