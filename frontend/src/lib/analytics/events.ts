import { readConsent } from "./consent";
import { clarityReady, ga4Ready, syncProviders } from "./providers/start";
import { sendClarityEvent } from "./providers/clarity";
import { sendGa4Event } from "./providers/ga4";

export type AnalyticsProduct = {
  id: number;
  name: string;
  price: string;
};

export type AnalyticsCartItem = {
  productId: number;
  name: string;
  unitPrice: string;
  quantity: number;
};

export type AnalyticsCart = {
  items: AnalyticsCartItem[];
  subtotal: string;
};

export type AnalyticsOrderItem = {
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: string;
};

export type AnalyticsOrder = {
  orderReference: string;
  totalAmount: string;
  items: AnalyticsOrderItem[];
};

type GaItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
};

type CommerceParams = {
  currency: string;
  value: number;
  items: GaItem[];
};

let pendingPath = "";
let lastSentPath = "";
let routeKey = "";
const sentOnRoute = new Set<string>();
const purchases = new Set<string>();

export function trackRoute(path: string) {
  if (typeof window === "undefined" || !path.startsWith("/")) return;
  pendingPath = path;
  flushPageView();
}

export function trackViewItem({ product }: { product: AnalyticsProduct }) {
  const params = buildProductEvent(product, 1);
  if (!params) return;
  emit("view_item", params, `view_item:${params.items[0].item_id}`);
}

export function trackViewItemList({
  products,
  itemListName,
}: {
  products: AnalyticsProduct[];
  itemListName: string;
}) {
  if (!Array.isArray(products) || products.length === 0) return;
  if (typeof itemListName !== "string" || !itemListName) return;

  const items: GaItem[] = [];
  for (const product of products) {
    const line = lineFromProduct(product, 1);
    if (!line) return;
    items.push(line);
  }

  const currency = currencyCode();
  if (!currency) return;

  const value = rounded(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  emit(
    "view_item_list",
    {
      currency,
      value,
      item_list_name: itemListName,
      items,
    },
    `view_item_list:${itemListName}:${items.map((item) => item.item_id).join(",")}`,
  );
}

export function trackAddToCart({
  product,
  quantity,
}: {
  product: AnalyticsProduct;
  quantity: number;
}) {
  const params = buildProductEvent(product, quantity);
  if (!params) return;
  emit("add_to_cart", params);
}

export function trackRemoveFromCart({
  product,
  quantity,
}: {
  product: AnalyticsProduct;
  quantity: number;
}) {
  const params = buildProductEvent(product, quantity);
  if (!params) return;
  emit("remove_from_cart", params);
}

export function trackViewCart({ cart }: { cart: AnalyticsCart }) {
  const params = buildCartEvent(cart);
  if (!params) return;
  emit("view_cart", params, `view_cart:${cartKey(cart)}`);
}

export function trackBeginCheckout({ cart }: { cart: AnalyticsCart }) {
  const params = buildCartEvent(cart);
  if (!params) return;
  emit("begin_checkout", params, `begin_checkout:${cartKey(cart)}`);
}

export function trackAddShippingInfo({ cart }: { cart: AnalyticsCart }) {
  const params = buildCartEvent(cart);
  if (!params) return;
  emit("add_shipping_info", params, `add_shipping_info:${cartKey(cart)}`);
}

export function trackPurchase({ order }: { order: AnalyticsOrder }) {
  try {
    const params = buildPurchase(order);
    if (!params) return;
    const transactionId = order.orderReference;
    if (purchaseSeen(transactionId)) return;
    if (readConsent() !== "granted") return;
    syncProviders("granted");
    if (!ga4Ready() && !clarityReady()) return;
    rememberPurchase(transactionId);
    sendGa4Event("purchase", params);
    sendClarityEvent("purchase");
  } catch {
    return;
  }
}

function flushPageView() {
  const consent = readConsent();
  if (consent !== "granted") {
    if (consent === "denied") syncProviders("denied");
    return;
  }
  syncProviders("granted");
  if (!ga4Ready()) return;
  if (!pendingPath || pendingPath === lastSentPath) return;

  const path = pendingPath;
  lastSentPath = path;
  sendGa4Event("page_view", {
    page_path: path,
    page_title: document.title,
    page_location: `${window.location.origin}${path}`,
  });
}

function emit(name: string, params: Record<string, unknown>, key?: string) {
  try {
    if (readConsent() !== "granted") return;
    syncProviders("granted");
    if (!ga4Ready() && !clarityReady()) return;
    if (key && oncePerRoute(key)) return;
    sendGa4Event(name, params);
    sendClarityEvent(name);
  } catch {
    return;
  }
}

function buildProductEvent(product: AnalyticsProduct, quantity: number): CommerceParams | null {
  const line = lineFromProduct(product, quantity);
  const currency = currencyCode();
  if (!line || !currency) return null;
  return {
    currency,
    value: rounded(line.price * line.quantity),
    items: [line],
  };
}

function buildCartEvent(cart: AnalyticsCart): CommerceParams | null {
  if (!cart || !Array.isArray(cart.items)) return null;
  const currency = currencyCode();
  const value = money(cart.subtotal);
  if (!currency || value === null) return null;

  const items: GaItem[] = [];
  for (const item of cart.items) {
    if (!Number.isInteger(item.productId) || item.productId < 1) return null;
    const line = lineFromValues(String(item.productId), item.name, item.unitPrice, item.quantity);
    if (!line) return null;
    items.push(line);
  }

  return { currency, value, items };
}

function buildPurchase(order: AnalyticsOrder): Record<string, unknown> | null {
  if (!order || !/^[0-9a-f-]{36}$/i.test(order.orderReference || "")) return null;
  if (!Array.isArray(order.items) || order.items.length === 0) return null;

  const currency = currencyCode();
  const value = money(order.totalAmount);
  if (!currency || value === null) return null;

  const items: GaItem[] = [];
  for (const item of order.items) {
    const line = lineFromValues(item.productSlug, item.productName, item.unitPrice, item.quantity);
    if (!line) return null;
    items.push(line);
  }

  return {
    transaction_id: order.orderReference,
    currency,
    value,
    items,
  };
}

function lineFromProduct(product: AnalyticsProduct, quantity: number) {
  if (!product || !Number.isInteger(product.id) || product.id < 1) return null;
  return lineFromValues(String(product.id), product.name, product.price, quantity);
}

function lineFromValues(
  id: string,
  name: string,
  price: string,
  quantity: number,
): GaItem | null {
  const parsedPrice = money(price);
  const parsedQuantity = wholeQuantity(quantity);
  if (typeof id !== "string" || !id || id.length > 180 || /\s/.test(id)) return null;
  if (typeof name !== "string" || !name || name.length > 150) return null;
  if (parsedPrice === null || parsedQuantity === null) return null;
  return {
    item_id: id,
    item_name: name,
    price: parsedPrice,
    quantity: parsedQuantity,
  };
}

function cartKey(cart: AnalyticsCart) {
  const lines = cart.items
    .map((item) => `${item.productId}:${item.quantity}:${item.unitPrice}`)
    .join(",");
  return `${lines}|${cart.subtotal}`;
}

function oncePerRoute(key: string) {
  if (typeof window === "undefined") return true;
  const route = window.location.pathname;
  if (route !== routeKey) {
    routeKey = route;
    sentOnRoute.clear();
  }
  if (sentOnRoute.has(key)) return true;
  sentOnRoute.add(key);
  return false;
}

function currencyCode() {
  const code = process.env.NEXT_PUBLIC_GA_CURRENCY;
  if (!code || !/^[A-Z]{3}$/.test(code)) return "";
  return code;
}

function money(value: string) {
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return number;
}

function wholeQuantity(value: number) {
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

function rounded(value: number) {
  return Math.round(value * 100) / 100;
}

function purchaseSeen(id: string) {
  if (purchases.has(id)) return true;
  try {
    if (window.localStorage.getItem(purchaseKey(id)) === "1") {
      purchases.add(id);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function rememberPurchase(id: string) {
  purchases.add(id);
  try {
    window.localStorage.setItem(purchaseKey(id), "1");
  } catch {
    return;
  }
}

function purchaseKey(id: string) {
  return `gp_analytics_purchase_${id}`;
}
