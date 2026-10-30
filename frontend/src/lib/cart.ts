export type CartItem = {
  productId: number;
  quantity: number;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
  stockQuantity: number;
};

export type CartProduct = {
  id: number;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
  stockQuantity: number;
};

const STORAGE_KEY = "gp_cart";

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as CartItem;
  return (
    Number.isInteger(item.productId) &&
    item.productId > 0 &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    typeof item.name === "string" &&
    item.name.trim() !== "" &&
    typeof item.slug === "string" &&
    item.slug.trim() !== "" &&
    typeof item.price === "string" &&
    item.price.trim() !== "" &&
    (item.imageUrl === null || typeof item.imageUrl === "string") &&
    Number.isInteger(item.stockQuantity) &&
    item.stockQuantity >= 0
  );
}

function parseCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isCartItem).map((item) => ({
    ...item,
    quantity:
      item.stockQuantity > 0
        ? Math.min(item.quantity, item.stockQuantity)
        : item.quantity,
  }));
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    return parseCart(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addProductToCart(product: CartProduct): {
  items: CartItem[];
  added: boolean;
} {
  if (product.stockQuantity < 1) {
    return { items: readCart(), added: false };
  }

  const items = readCart();
  const existing = items.find((item) => item.productId === product.id);
  const nextQuantity = Math.min(
    (existing?.quantity ?? 0) + 1,
    product.stockQuantity,
  );

  if (existing && existing.quantity >= product.stockQuantity) {
    return { items, added: false };
  }

  const nextItem: CartItem = {
    productId: product.id,
    quantity: nextQuantity,
    name: product.name,
    slug: product.slug,
    price: product.price,
    imageUrl: product.imageUrl,
    stockQuantity: product.stockQuantity,
  };

  const nextItems = existing
    ? items.map((item) => (item.productId === product.id ? nextItem : item))
    : [...items, nextItem];

  writeCart(nextItems);
  return { items: nextItems, added: true };
}

export function updateCartQuantity(
  productId: number,
  quantity: number,
): CartItem[] {
  const items = readCart();
  const current = items.find((item) => item.productId === productId);
  if (!current) {
    return items;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return removeCartItem(productId);
  }

  const nextQuantity =
    current.stockQuantity > 0
      ? Math.min(quantity, current.stockQuantity)
      : quantity;
  const nextItems = items.map((item) =>
    item.productId === productId ? { ...item, quantity: nextQuantity } : item,
  );
  writeCart(nextItems);
  return nextItems;
}

export function removeCartItem(productId: number): CartItem[] {
  const nextItems = readCart().filter((item) => item.productId !== productId);
  writeCart(nextItems);
  return nextItems;
}

export function clearCart(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

function priceToCents(price: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(price.trim());
  if (!match) {
    return 0;
  }

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  return whole * 100 + fraction;
}

export function cartSubtotal(items: CartItem[]): string {
  const cents = items.reduce(
    (total, item) => total + priceToCents(item.price) * item.quantity,
    0,
  );
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}
