import type { MetadataRoute } from "next";
import { listActiveProducts, productPath } from "@/lib/api/catalogue";
import { getSiteUrl } from "@/lib/site-url";

const publicPaths = ["/", "/shop", "/about", "/process", "/style"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return [];

  const entries: MetadataRoute.Sitemap = publicPaths.map((path) => ({
    url: new URL(path, siteUrl).href,
  }));
  const products = await listActiveProducts();
  if (!products) return entries;

  for (const product of products) {
    const path = productPath(product.slug);
    if (!path) continue;

    const updatedAt = product.updatedAt ? new Date(product.updatedAt) : null;
    entries.push({
      url: new URL(path, siteUrl).href,
      ...(updatedAt && !Number.isNaN(updatedAt.getTime()) ? { lastModified: updatedAt } : {}),
    });
  }

  return entries;
}
