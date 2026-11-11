import { request } from "./client";

export type CartItem = {
  productId: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  unitPrice: string;
  seenUnitPrice: string;
  priceChanged: boolean;
  quantity: number;
  stockQuantity: number;
  isActive: boolean;
  lineTotal: string;
  requiresAttention: boolean;
  attentionMessage: string | null;
};

export type Cart = {
  items: CartItem[];
  subtotal: string;
};

export type CartCount = {
  count: number;
};

export type CartInitialization = {
  initialized: boolean;
};

export type CartMutationResult = {
  ok: boolean;
  message: string | null;
};

export function getCart(): Promise<Cart> {
  return request("GET", "/cart");
}

export function getCartCount(): Promise<CartCount> {
  return request("GET", "/cart/count");
}

export function initializeCart(): Promise<CartInitialization> {
  return request("POST", "/cart/initialize");
}

export function addCartItem(
  productId: number,
  quantity: number,
): Promise<Cart> {
  return request("POST", "/cart/items", { productId, quantity });
}

export function updateCartItem(
  productId: number,
  quantity: number,
): Promise<Cart> {
  return request("PATCH", `/cart/items/${productId}`, { quantity });
}

export function removeCartItem(productId: number): Promise<Cart> {
  return request("DELETE", `/cart/items/${productId}`);
}

export function clearCart(): Promise<Cart> {
  return request("DELETE", "/cart");
}
