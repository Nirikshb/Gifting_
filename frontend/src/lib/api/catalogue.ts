import { cacheLife } from "next/cache";
import {
  formatInr,
  inrAmount,
  productImageUrl,
  productPath,
} from "./product-format";

export { formatInr, inrAmount, productImageUrl, productPath } from "./product-format";

const SHOP_LIMIT = 10;
const SITEMAP_LIMIT = 100;

export type CatalogueProduct = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  stockQuantity: number;
  imageUrl: string | null;
  updatedAt: string | null;
};

export type CataloguePage = {
  products: CatalogueProduct[];
  page: number;
  totalPages: number;
};

type CatalogueResult<T> =
  | { ok: true; data: T }
  | { ok: false; missing: boolean };

function apiBase() {
  const raw = process.env.API_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return raw.replace(/\/$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readProduct(value: unknown): CatalogueProduct | null {
  if (!isRecord(value)) return null;
  if (value.isActive === false) return null;
  if (typeof value.id !== "number" || !Number.isInteger(value.id) || value.id <= 0) return null;
  if (typeof value.name !== "string" || value.name.trim() === "") return null;
  if (typeof value.slug !== "string" || !productPath(value.slug)) return null;
  if (typeof value.description !== "string") return null;
  if (typeof value.price !== "string") return null;
  if (typeof value.stockQuantity !== "number") return null;
  if (!Number.isInteger(value.stockQuantity) || value.stockQuantity < 0) return null;
  if (value.imageUrl !== null && typeof value.imageUrl !== "string") return null;
  if (value.updatedAt !== undefined && value.updatedAt !== null && typeof value.updatedAt !== "string") {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    slug: value.slug,
    description: value.description,
    price: value.price,
    stockQuantity: value.stockQuantity,
    imageUrl: value.imageUrl,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  };
}

async function readJson(path: string): Promise<CatalogueResult<unknown>> {
  const base = apiBase();
  if (!base) return { ok: false, missing: false };

  try {
    const response = await fetch(`${base}${path}`, {
      headers: { Accept: "application/json" },
    });
    const body: unknown = await response.json();

    if (!isRecord(body) || body.success !== true) {
      return { ok: false, missing: response.status === 404 };
    }

    return { ok: true, data: body };
  } catch {
    return { ok: false, missing: false };
  }
}

function readPage(body: unknown, requestedPage: number): CataloguePage | null {
  if (!isRecord(body) || !Array.isArray(body.data) || !isRecord(body.pagination)) return null;

  const page = body.pagination.page;
  const totalPages = body.pagination.totalPages;
  if (typeof page !== "number" || typeof totalPages !== "number") return null;
  if (!Number.isInteger(page) || !Number.isInteger(totalPages)) return null;
  if (page !== requestedPage || totalPages < 0) return null;

  const products: CatalogueProduct[] = [];

  for (const item of body.data) {
    const product = readProduct(item);
    if (!product) return null;
    products.push(product);
  }

  return { products, page, totalPages };
}

export async function getCataloguePage(page: number): Promise<CatalogueResult<CataloguePage>> {
  "use cache";
  cacheLife("seconds");

  const result = await readJson(`/products?page=${page}&limit=${SHOP_LIMIT}`);
  if (!result.ok) return result;

  const cataloguePage = readPage(result.data, page);
  if (!cataloguePage) return { ok: false, missing: false };

  return { ok: true, data: cataloguePage };
}

export async function getActiveProduct(slug: string): Promise<CatalogueResult<CatalogueProduct>> {
  "use cache";
  cacheLife("seconds");

  if (!productPath(slug)) return { ok: false, missing: true };

  const result = await readJson(`/products/${encodeURIComponent(slug)}`);
  if (!result.ok) return result;
  if (!isRecord(result.data)) return { ok: false, missing: false };

  const product = readProduct(result.data.data);
  if (!product || product.slug !== slug) return { ok: false, missing: false };

  return { ok: true, data: product };
}

export async function listActiveProducts(): Promise<CatalogueProduct[] | null> {
  "use cache";
  cacheLife("seconds");

  const first = await readJson(`/products?page=1&limit=${SITEMAP_LIMIT}`);
  if (!first.ok) return null;

  const firstPage = readPage(first.data, 1);
  if (!firstPage) return null;

  const products = [...firstPage.products];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const next = await readJson(`/products?page=${page}&limit=${SITEMAP_LIMIT}`);
    if (!next.ok) return null;

    const nextPage = readPage(next.data, page);
    if (!nextPage) return null;
    products.push(...nextPage.products);
  }

  return products;
}
