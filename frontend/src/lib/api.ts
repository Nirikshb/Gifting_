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
