import type { Product } from "@/src/types/product";

export type ApiErrorBody = {
  success: false;
  message: string;
  statusCode: number;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ProductsListSuccess = {
  success: true;
  data: Product[];
  pagination: PaginationMeta;
};

export type ProductSuccess = {
  success: true;
  data: Product;
};

export type CustomerProfile = {
  id: number;
  email: string;
  displayName: string;
};

type CsrfSuccess = {
  success: true;
  data: {
    csrfToken: string;
  };
};

type AuthProfileSuccess = {
  success: true;
  data: CustomerProfile;
};

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    throw new ApiError("API URL is not configured", 500);
  }
  return baseUrl.replace(/\/$/, "");
}

function parseJsonBody(response: Response): Promise<unknown> {
  return response.json().catch(() => {
    throw new ApiError("Invalid response from API", response.status || 500);
  });
}

function isProductsListSuccess(body: unknown): body is ProductsListSuccess {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const candidate = body as ProductsListSuccess;
  return (
    candidate.success === true &&
    Array.isArray(candidate.data) &&
    typeof candidate.pagination === "object" &&
    candidate.pagination !== null
  );
}

function messageFromErrorBody(body: unknown, fallbackStatus: number): ApiError {
  if (typeof body === "object" && body !== null && "message" in body) {
    const { message, statusCode } = body as ApiErrorBody;
    if (typeof message === "string") {
      return new ApiError(
        message,
        typeof statusCode === "number" ? statusCode : fallbackStatus,
      );
    }
  }

  return new ApiError("Request to API failed", fallbackStatus);
}

export async function fetchProducts(
  page = 1,
  limit = 100,
): Promise<ProductsListSuccess> {
  const url = `${getApiBaseUrl()}/products?page=${page}&limit=${limit}`;
  const response = await fetch(url, { cache: "no-store" });
  const body = await parseJsonBody(response);

  if (!response.ok) {
    throw messageFromErrorBody(body, response.status);
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    (body as { success: unknown }).success === false
  ) {
    throw messageFromErrorBody(body, response.status);
  }

  if (!isProductsListSuccess(body)) {
    throw new ApiError("Unexpected API response shape", 500);
  }

  return body;
}

function isProductSuccess(body: unknown): body is ProductSuccess {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const candidate = body as ProductSuccess;
  return (
    candidate.success === true &&
    typeof candidate.data === "object" &&
    candidate.data !== null &&
    "slug" in candidate.data
  );
}

export async function fetchProduct(slug: string): Promise<Product> {
  const url = `${getApiBaseUrl()}/products/${encodeURIComponent(slug)}`;
  const response = await fetch(url, { cache: "no-store" });
  const body = await parseJsonBody(response);

  if (!response.ok) {
    throw messageFromErrorBody(body, response.status);
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    (body as { success: unknown }).success === false
  ) {
    throw messageFromErrorBody(body, response.status);
  }

  if (!isProductSuccess(body)) {
    throw new ApiError("Unexpected API response shape", 500);
  }

  return body.data;
}

function isCsrfSuccess(body: unknown): body is CsrfSuccess {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const candidate = body as CsrfSuccess;
  return (
    candidate.success === true &&
    typeof candidate.data === "object" &&
    candidate.data !== null &&
    typeof candidate.data.csrfToken === "string" &&
    candidate.data.csrfToken.trim() !== ""
  );
}

function isAuthProfileSuccess(body: unknown): body is AuthProfileSuccess {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const candidate = body as AuthProfileSuccess;
  return (
    candidate.success === true &&
    typeof candidate.data === "object" &&
    candidate.data !== null &&
    typeof candidate.data.id === "number" &&
    typeof candidate.data.email === "string" &&
    typeof candidate.data.displayName === "string"
  );
}

function assertSuccessEnvelope(body: unknown, response: Response): void {
  if (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    (body as { success: unknown }).success === false
  ) {
    throw messageFromErrorBody(body, response.status);
  }
}

export async function fetchAuthCsrf(): Promise<string> {
  const url = `${getApiBaseUrl()}/auth/csrf`;
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  const body = await parseJsonBody(response);

  if (!response.ok) {
    throw messageFromErrorBody(body, response.status);
  }

  assertSuccessEnvelope(body, response);

  if (!isCsrfSuccess(body)) {
    throw new ApiError("Unexpected API response shape", 500);
  }

  return body.data.csrfToken;
}

export async function fetchAuthMe(): Promise<CustomerProfile> {
  const url = `${getApiBaseUrl()}/auth/me`;
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  const body = await parseJsonBody(response);

  if (!response.ok) {
    throw messageFromErrorBody(body, response.status);
  }

  assertSuccessEnvelope(body, response);

  if (!isAuthProfileSuccess(body)) {
    throw new ApiError("Unexpected API response shape", 500);
  }

  return body.data;
}

export type CreateOrderItemInput = {
  productId: number;
  quantity: number;
};

export type CreateOrderInput = {
  customerName: string;
  customerEmail: string;
  deliveryLine1: string;
  deliveryLine2?: string;
  deliveryCity: string;
  deliveryPostcode: string;
  deliveryCountry: string;
  items: CreateOrderItemInput[];
};

export type OrderLine = {
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type CreatedOrder = {
  orderReference: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: string;
  items: Array<OrderLine & { productSlug: string }>;
};

export type OrderDetails = {
  orderReference: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
  items: OrderLine[];
};

function isOrderLine(value: unknown, requireSlug: boolean): value is OrderLine {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const line = value as OrderLine & { productSlug?: unknown };
  return (
    typeof line.productName === "string" &&
    typeof line.quantity === "number" &&
    typeof line.unitPrice === "string" &&
    typeof line.lineTotal === "string" &&
    (!requireSlug || typeof line.productSlug === "string")
  );
}

function isCreatedOrder(value: unknown): value is CreatedOrder {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const order = value as CreatedOrder;
  return (
    typeof order.orderReference === "string" &&
    typeof order.orderStatus === "string" &&
    typeof order.paymentStatus === "string" &&
    typeof order.totalAmount === "string" &&
    Array.isArray(order.items) &&
    order.items.every((item) => isOrderLine(item, true))
  );
}

function isOrderDetails(value: unknown): value is OrderDetails {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const order = value as OrderDetails;
  return (
    typeof order.orderReference === "string" &&
    typeof order.orderStatus === "string" &&
    typeof order.paymentStatus === "string" &&
    typeof order.totalAmount === "string" &&
    typeof order.createdAt === "string" &&
    Array.isArray(order.items) &&
    order.items.every((item) => isOrderLine(item, false))
  );
}

function readSuccessData(body: unknown, response: Response): unknown {
  if (!response.ok) {
    throw messageFromErrorBody(body, response.status);
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    (body as { success: unknown }).success === false
  ) {
    throw messageFromErrorBody(body, response.status);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    (body as { success?: unknown }).success !== true ||
    !("data" in body)
  ) {
    throw new ApiError("Unexpected API response shape", 500);
  }

  return (body as { data: unknown }).data;
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const url = `${getApiBaseUrl()}/orders`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const body = await parseJsonBody(response);
  const data = readSuccessData(body, response);

  if (!isCreatedOrder(data)) {
    throw new ApiError("Unexpected API response shape", 500);
  }

  return data;
}

export async function fetchOrder(orderReference: string): Promise<OrderDetails> {
  const url = `${getApiBaseUrl()}/orders/${encodeURIComponent(orderReference)}`;
  const response = await fetch(url, { cache: "no-store" });
  const body = await parseJsonBody(response);
  const data = readSuccessData(body, response);

  if (!isOrderDetails(data)) {
    throw new ApiError("Unexpected API response shape", 500);
  }

  return data;
}

export async function signInWithGoogle(
  credential: string,
  csrfToken: string,
): Promise<CustomerProfile> {
  const url = `${getApiBaseUrl()}/auth/google`;
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ credential }),
  });
  const body = await parseJsonBody(response);

  if (!response.ok) {
    throw messageFromErrorBody(body, response.status);
  }

  assertSuccessEnvelope(body, response);

  if (!isAuthProfileSuccess(body)) {
    throw new ApiError("Unexpected API response shape", 500);
  }

  return body.data;
}
