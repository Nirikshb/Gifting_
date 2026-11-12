import { request } from "./client";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

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
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
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

export type OrderHistoryCategory = "fulfilment" | "payment";

export type OrderHistoryActorType = "customer" | "admin" | "system";

export type OrderHistoryEntry = {
  id: number;
  category: OrderHistoryCategory;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  actorType: OrderHistoryActorType;
  createdAt: string;
};

export type OrderSummaryLine = {
  productName: string;
  productSlug: string;
  quantity: number;
  lineTotal: string;
};

export type CustomerOrderSummary = {
  orderReference: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: string;
  currency: "INR";
  createdAt: string;
  itemCount: number;
  itemsPreview: OrderSummaryLine[];
  canCancel: boolean;
};

export type CustomerOrderDetail = {
  orderReference: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
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
  paidAt: string | null;
  cancelledAt: string | null;
  canCancel: boolean;
  items: CheckoutOrderLine[];
  history: OrderHistoryEntry[];
};

export type AdminOrderSummary = CustomerOrderSummary & {
  customerId: number | null;
  customerName: string;
  customerEmail: string;
  recipientName: string | null;
  paidAt: string | null;
  paymentReference: string | null;
};

export type AdminOrderDetail = CustomerOrderDetail & {
  customerId: number | null;
  paymentReference: string | null;
  stockRestoredAt: string | null;
  updatedAt: string;
  allowedTransitions: OrderStatus[];
};

export type AdminOrderStats = {
  totalOrders: number;
  pendingOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  unpaidOrders: number;
  paidOrders: number;
  revenue: string;
  recentOrders: AdminOrderSummary[];
};

export type CancelOrderResult = {
  orderReference: string;
  orderStatus: "cancelled";
  paymentStatus: PaymentStatus;
  cancelledAt: string;
  stockRestored: boolean;
  refundDue: boolean;
};

export type OrderStatusUpdateResult = {
  orderReference: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  updatedAt: string;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PaginatedOrders<T> = {
  data: T[];
  pagination: PaginationMeta;
};

export type OrderListParams = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
};

export type AdminOrderListParams = OrderListParams & {
  paymentStatus?: PaymentStatus;
  search?: string;
};

function queryString(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }

  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

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

export function listMyOrders(
  params: OrderListParams = {},
): Promise<PaginatedOrders<CustomerOrderSummary>> {
  return request("GET", `/orders/mine${queryString({ ...params })}`);
}

export function getMyOrder(orderReference: string): Promise<CustomerOrderDetail> {
  return request("GET", `/orders/mine/${encodeURIComponent(orderReference)}`);
}

export function cancelMyOrder(
  orderReference: string,
  reason?: string,
): Promise<CancelOrderResult> {
  return request(
    "POST",
    `/orders/mine/${encodeURIComponent(orderReference)}/cancel`,
    reason ? { reason } : {},
  );
}

export function listAdminOrders(
  params: AdminOrderListParams = {},
): Promise<PaginatedOrders<AdminOrderSummary>> {
  return request("GET", `/admin/orders${queryString({ ...params })}`);
}

export function getAdminOrderStats(): Promise<AdminOrderStats> {
  return request("GET", "/admin/orders/stats");
}

export function getAdminOrder(orderReference: string): Promise<AdminOrderDetail> {
  return request("GET", `/admin/orders/${encodeURIComponent(orderReference)}`);
}

export function updateAdminOrderStatus(
  orderReference: string,
  status: OrderStatus,
  note?: string,
): Promise<OrderStatusUpdateResult> {
  return request("PATCH", `/admin/orders/${encodeURIComponent(orderReference)}/status`, {
    status,
    ...(note ? { note } : {}),
  });
}

export function cancelAdminOrder(
  orderReference: string,
  reason?: string,
): Promise<CancelOrderResult> {
  return request(
    "POST",
    `/admin/orders/${encodeURIComponent(orderReference)}/cancel`,
    reason ? { reason } : {},
  );
}
