import type { Product } from "@/src/types/product";

export function formatProductPrice(price: string): string {
  const value = Number(price);
  if (Number.isNaN(value)) {
    return price;
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

export function getAvailabilityLabel(product: Product): string {
  if (product.stockQuantity <= 0) {
    return "Out of stock";
  }

  if (product.stockQuantity <= 5) {
    return `Only ${product.stockQuantity} left`;
  }

  return "In stock";
}

export function isInStock(product: Product): boolean {
  return product.stockQuantity > 0;
}
