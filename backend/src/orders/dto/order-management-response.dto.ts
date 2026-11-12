import type {
  OrderHistoryActorType,
  OrderHistoryCategory,
} from '../entities/order-status-history.entity';
import type { OrderStatus, PaymentStatus } from '../entities/order.entity';
import type {
  CheckoutDeliveryAddress,
  CheckoutOrderLineResponse,
} from './checkout-response.dto';

export type OrderHistoryEntryResponse = {
  id: number;
  category: OrderHistoryCategory;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  actorType: OrderHistoryActorType;
  createdAt: Date;
};

export type OrderSummaryLineResponse = {
  productName: string;
  productSlug: string;
  quantity: number;
  lineTotal: string;
};

export type CustomerOrderSummaryResponse = {
  orderReference: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: string;
  currency: 'INR';
  createdAt: Date;
  itemCount: number;
  itemsPreview: OrderSummaryLineResponse[];
  canCancel: boolean;
};

export type CustomerOrderDetailResponse = {
  orderReference: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: string;
  shipping: string;
  totalAmount: string;
  currency: 'INR';
  customerName: string;
  customerEmail: string;
  recipientName: string | null;
  delivery: CheckoutDeliveryAddress;
  giftMessage: string | null;
  createdAt: Date;
  paidAt: Date | null;
  cancelledAt: Date | null;
  canCancel: boolean;
  items: CheckoutOrderLineResponse[];
  history: OrderHistoryEntryResponse[];
};

export type AdminOrderSummaryResponse = CustomerOrderSummaryResponse & {
  customerId: number | null;
  customerName: string;
  customerEmail: string;
  recipientName: string | null;
  paidAt: Date | null;
  paymentReference: string | null;
};

export type AdminOrderDetailResponse = CustomerOrderDetailResponse & {
  customerId: number | null;
  paymentReference: string | null;
  stockRestoredAt: Date | null;
  updatedAt: Date;
  allowedTransitions: OrderStatus[];
};

export type AdminOrderStatsResponse = {
  totalOrders: number;
  pendingOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  unpaidOrders: number;
  paidOrders: number;
  revenue: string;
  recentOrders: AdminOrderSummaryResponse[];
};

export type CancelOrderResponse = {
  orderReference: string;
  orderStatus: 'cancelled';
  paymentStatus: PaymentStatus;
  cancelledAt: Date;
  stockRestored: boolean;
  /**
   * True when money was captured but no refund has been recorded. Surfacing
   * this is deliberate: the system never fabricates a refund.
   */
  refundDue: boolean;
};

export type OrderStatusUpdateResponse = {
  orderReference: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  updatedAt: Date;
};
