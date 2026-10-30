import { ApiError, fetchProducts } from "@/src/lib/api";
import type { Product } from "@/src/types/product";
import { ProductCard } from "./ProductCard";
import styles from "./page.module.css";

export const metadata = {
  title: "Products | Gift Packaging",
  description: "Browse gift boxes, wrapping, ribbons, and packaging supplies.",
};

export default async function ProductsPage() {
  let products: Product[] | null = null;
  let loadError: string | null = null;

  try {
    const result = await fetchProducts();
    products = result.data;
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : "Something went wrong while loading products.";
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <header className={styles.hero}>
            <h1>Gift packaging</h1>
          </header>
          <div className={`${styles.statePanel} ${styles.statePanelError}`}>
            <h2>Could not load products</h2>
            <p>{loadError}</p>
            <p>
              Check that the API is running and that{" "}
              <code>NEXT_PUBLIC_API_URL</code> points to it, then reload.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const catalogue = products ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.hero}>
          <h1>Gift packaging</h1>
          <p>
            Boxes, wrap, ribbons, and finishing touches for presents that feel
            considered from the outside in.
          </p>
        </header>

        {catalogue.length === 0 ? (
          <div className={styles.statePanel}>
            <h2>No products yet</h2>
            <p>
              The catalogue is empty. Add products in the backend or run your
              seed data, then refresh this page.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {catalogue.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
