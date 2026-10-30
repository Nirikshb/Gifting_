import Link from "next/link";
import Image from "next/image";
import { ApiError, fetchProduct } from "@/src/lib/api";
import type { Product } from "@/src/types/product";
import {
  formatProductPrice,
  getAvailabilityLabel,
  isInStock,
} from "@/src/lib/product-display";
import { AddToCartButton } from "./AddToCartButton";
import styles from "./page.module.css";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { slug } = await params;

  try {
    const product = await fetchProduct(slug);
    return {
      title: `${product.name} | Gift Packaging`,
      description: product.description,
    };
  } catch {
    return {
      title: "Product | Gift Packaging",
    };
  }
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;

  let product: Product | null = null;
  let loadError: string | null = null;
  let unavailable = false;

  try {
    product = await fetchProduct(slug);
  } catch (error) {
    unavailable = error instanceof ApiError && error.statusCode === 404;
    loadError = unavailable
      ? "This product is not available."
      : error instanceof ApiError
        ? error.message
        : "Something went wrong while loading this product.";
  }

  if (loadError || !product) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.backRow}>
            <Link href="/products">Back to products</Link>
          </p>
          <div className={`${styles.statePanel} ${styles.statePanelError}`}>
            <h1>{unavailable ? "Product not available" : "Could not load product"}</h1>
            <p>{loadError}</p>
            {unavailable ? null : (
              <p>
                Check that the API is running and that{" "}
                <code>NEXT_PUBLIC_API_URL</code> points to it, then reload.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const inStock = isInStock(product);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.backRow}>
          <Link href="/products">Back to products</Link>
        </p>
        <article className={styles.detail}>
          <div className={styles.media}>
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 800px) 100vw, 50vw"
                className={styles.mediaImage}
                unoptimized
              />
            ) : (
              <span className={styles.mediaPlaceholder}>No image</span>
            )}
          </div>
          <div className={styles.body}>
            <div className={styles.metaRow}>
              <span className={styles.category}>{product.category}</span>
              <span
                className={`${styles.availability} ${
                  inStock
                    ? styles.availabilityInStock
                    : styles.availabilityOutOfStock
                }`}
              >
                {getAvailabilityLabel(product)}
              </span>
            </div>
            <h1>{product.name}</h1>
            <p className={styles.price}>{formatProductPrice(product.price)}</p>
            <p className={styles.description}>{product.description}</p>
            <AddToCartButton inStock={inStock} />
          </div>
        </article>
      </div>
    </div>
  );
}
