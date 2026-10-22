import Link from "next/link";
import type { Product } from "@/src/types/product";
import {
  formatProductPrice,
  getAvailabilityLabel,
  isInStock,
} from "@/src/lib/product-display";
import styles from "./page.module.css";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const availability = getAvailabilityLabel(product);
  const inStock = isInStock(product);

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} />
        ) : (
          <span className={styles.mediaPlaceholder}>No image</span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.category}>{product.category}</span>
          <span
            className={`${styles.availability} ${
              inStock ? styles.availabilityInStock : styles.availabilityOutOfStock
            }`}
          >
            {availability}
          </span>
        </div>
        <h2 className={styles.title}>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h2>
        <p className={styles.price}>{formatProductPrice(product.price)}</p>
        <p className={styles.description}>{product.description}</p>
        <div className={styles.cardFooter}>
          <Link className={styles.viewLink} href={`/products/${product.slug}`}>
            View product
          </Link>
        </div>
      </div>
    </article>
  );
}
