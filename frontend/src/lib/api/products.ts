import { loadCsrfToken, request } from "./client";

export type ProductStockState = "out" | "low" | "in";

export type AdminProductSummary = {
  id: number;
  name: string;
  slug: string;
  price: string;
  category: string;
  stockQuantity: number;
  stockState: ProductStockState;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminProductDetail = AdminProductSummary & {
  description: string;
};

export type AdminProductStats = {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  lowStockThreshold: number;
};

export type StockAdjustment = {
  id: number;
  productId: number;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
  reason: string;
  actorType: string;
  actorId: number | null;
  createdAt: string;
};

export type ProductImage = {
  id: number;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type StockUpdateResult = {
  product: AdminProductDetail;
  adjustment: StockAdjustment | null;
  changed: boolean;
};

export type AdminProductPayload = {
  name: string;
  slug: string;
  description: string;
  price: string;
  category: string;
  stockQuantity: number;
  isActive: boolean;
  imageId?: number | null;
};

export type AdminProductUpdatePayload = Partial<
  Omit<AdminProductPayload, "stockQuantity">
> & {
  imageId?: number | null;
};

export type AdminProductListParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  availability?: "all" | "active" | "inactive";
  stock?: "all" | "in" | "low" | "out";
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PaginatedProducts<T> = {
  data: T[];
  pagination: PaginationMeta;
};

function queryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }

  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

export function listAdminProducts(
  params: AdminProductListParams = {},
): Promise<PaginatedProducts<AdminProductSummary>> {
  return request("GET", `/admin/products${queryString({ ...params })}`);
}

export function getAdminProductStats(): Promise<AdminProductStats> {
  return request("GET", "/admin/products/stats");
}

export function listAdminProductCategories(): Promise<string[]> {
  return request("GET", "/admin/products/categories");
}

export function listAdminProductImages(): Promise<ProductImage[]> {
  return request("GET", "/admin/products/images");
}

export function getAdminProduct(id: number): Promise<AdminProductDetail> {
  return request("GET", `/admin/products/${id}`);
}

export function createAdminProduct(
  payload: AdminProductPayload,
): Promise<AdminProductDetail> {
  return request("POST", "/admin/products", payload);
}

export function updateAdminProduct(
  id: number,
  payload: AdminProductUpdatePayload,
): Promise<AdminProductDetail> {
  return request("PATCH", `/admin/products/${id}`, payload);
}

export function updateAdminProductStock(
  id: number,
  stockQuantity: number,
  reason: string,
): Promise<StockUpdateResult> {
  return request("PATCH", `/admin/products/${id}/stock`, {
    stockQuantity,
    reason,
  });
}

export function listStockAdjustments(
  id: number,
): Promise<StockAdjustment[]> {
  return request("GET", `/admin/products/${id}/stock-adjustments`);
}

/**
 * Uploads an image and returns the stored record. The file is sent as
 * multipart data; the server generates the file name and the public URL.
 */
export async function uploadAdminProductImage(
  file: File,
): Promise<ProductImage> {
  const csrfToken = await loadCsrfToken();
  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/admin/products/images", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    cache: "no-store",
    body,
  });

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw Object.assign(new Error("Request failed"), {
      statusCode: response.status,
    });
  }

  const result = payload as {
    success?: boolean;
    data?: ProductImage;
    message?: string;
    statusCode?: number;
  };

  if (result.success && result.data) {
    return result.data;
  }

  throw Object.assign(
    new Error(result.message ?? "The image could not be uploaded."),
    { statusCode: result.statusCode ?? response.status },
  );
}
