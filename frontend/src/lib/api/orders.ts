import { request } from "./client";

export type CheckoutOrderPayload = {
  customerName: string;
  customerEmail: string;
  recipientName?: string;
  deliveryLine1: string;
  deliveryLine2?: string;
  deliveryCity: string;
  deliveryPostcode: string;
  deliveryCountry: string;
  giftMessage?: string;
  idempotencyKey: string;
};

export type CheckoutOrderLine = {
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type CheckoutDeliveryAddress = {
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  country: string;
};

export type CheckoutOrder = {
  orderReference: string;
  orderStatus: "pending" | "confirmed" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "failed";
  subtotal: string;
  shipping: string;
  totalAmount: string;
  currency: "INR";
  customerName: string;
  customerEmail: string;
  recipientName: string | null;
  delivery: CheckoutDeliveryAddress;
  giftMessage: string | null;
  createdAt: string;
  items: CheckoutOrderLine[];
};

export type CheckoutOrderResult = CheckoutOrder & {
  confirmationToken: string;
};

export function createCheckoutOrder(
  payload: CheckoutOrderPayload,
): Promise<CheckoutOrderResult> {
  return request("POST", "/orders/checkout", payload);
}

export function getOrderConfirmation(
  orderReference: string,
  token: string,
): Promise<CheckoutOrder> {
  return request(
    "GET",
    `/orders/${encodeURIComponent(orderReference)}/confirmation?token=${encodeURIComponent(token)}`,
  );
}
