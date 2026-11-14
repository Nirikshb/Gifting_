export type ProductStockState = 'out' | 'low' | 'in';

export type AdminProductSummaryResponse = {
  id: number;
  name: string;
  slug: string;
  price: string;
  category: string;
  stockQuantity: number;
  stockState: ProductStockState;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminProductDetailResponse = AdminProductSummaryResponse & {
  description: string;
};

export type AdminProductStatsResponse = {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  lowStockThreshold: number;
};

export type StockAdjustmentResponse = {
  id: number;
  productId: number;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
  reason: string;
  actorType: string;
  actorId: number | null;
  createdAt: Date;
};

export type ProductImageResponse = {
  id: number;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

export type StockUpdateResponse = {
  product: AdminProductDetailResponse;
  adjustment: StockAdjustmentResponse | null;
  changed: boolean;
};
