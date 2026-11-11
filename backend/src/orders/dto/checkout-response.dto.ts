import type { OrderStatus, PaymentStatus } from '../entities/order.entity';

export type CheckoutDeliveryAddress = {
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  country: string;
};

export type CheckoutOrderLineResponse = {
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type CheckoutOrderResponse = {
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
  items: CheckoutOrderLineResponse[];
  /**
   * Returned once from the checkout call. The confirmation endpoint requires
   * this token together with the order reference; only its hash is stored.
   */
  confirmationToken: string;
};

export type OrderConfirmationResponse = Omit<
  CheckoutOrderResponse,
  'confirmationToken'
>;
