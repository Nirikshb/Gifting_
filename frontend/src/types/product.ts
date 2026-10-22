/** Product shape returned by the backend API (JSON-serialized entity). */
export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  /** Decimal string from PostgreSQL `numeric(10,2)`. */
  price: string;
  stockQuantity: number;
  imageUrl: string | null;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
