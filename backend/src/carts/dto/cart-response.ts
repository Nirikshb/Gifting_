export type CartItemResponse = {
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

export type CartResponse = {
  items: CartItemResponse[];
  subtotal: string;
};

export type CartCountResponse = {
  count: number;
};

export type CartCookieAction =
  | { type: 'none' }
  | { type: 'set'; token: string }
  | { type: 'clear' };
