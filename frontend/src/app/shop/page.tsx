import { ViewTransition } from "react";
import Link from "next/link";
import {
  formatInr,
  getCataloguePage,
  productImageUrl,
  productPath,
} from "@/lib/api/catalogue";
import { publicPageMetadata } from "@/lib/site-url";
import styles from "./page.module.css";

const description = "Gifts currently listed by Aapulki.";

export const instant = false;

type ShopSearch = {
  page?: string | string[];
};

function requestedPage(value: string | string[] | undefined) {
  if (value === undefined) return 1;

  const raw = Array.isArray(value) ? value[0] : value;
  if (!/^[1-9]\d*$/.test(raw)) return null;

  const page = Number(raw);
  return Number.isSafeInteger(page) ? page : null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ShopSearch>;
}) {
  const page = requestedPage((await searchParams).page) ?? 1;
  const path = page > 1 ? `/shop?page=${page}` : "/shop";

  return {
    title: "Shop",
    ...publicPageMetadata(`Shop | Aapulki`, description, path),
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearch>;
}) {
  const page = requestedPage((await searchParams).page);
  const result = page === null ? null : await getCataloguePage(page);
  const catalogue = result?.ok ? result.data : null;
  const unavailable = page === null || result === null || !result.ok;

  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <div className={styles.pageFill}>
        <section className={styles.page} aria-labelledby="shop-heading">
          <h1 id="shop-heading" className={styles.srOnly}>
            Shop
          </h1>
          {unavailable ? <p className={styles.note}>The shop cannot be loaded right now.</p> : null}
          {!unavailable && catalogue && catalogue.products.length === 0 ? (
            <p className={styles.note}>No gifts are available right now.</p>
          ) : null}
          {catalogue && catalogue.products.length > 0 ? (
            <div className={styles.grid}>
              {catalogue.products.map((product) => {
                const href = productPath(product.slug);
                const image = productImageUrl(product.imageUrl);
                const price = formatInr(product.price);
                if (!href) return null;

                return (
                  <article className={styles.card} key={product.slug}>
                    {image ? (
                      <Link className={styles.photo} href={href}>
                        <img className={styles.image} src={image} alt={product.name} />
                      </Link>
                    ) : null}
                    <h2>
                      <Link href={href}>{product.name}</Link>
                    </h2>
                    <div className={styles.priceRow}>
                      {price ? <p className={styles.price}>{price}</p> : null}
                    </div>
                    <p className={styles.stock}>
                      {product.stockQuantity > 0 ? "In stock" : "Out of stock"}
                    </p>
                    <div className={styles.actions}>
                      <Link className={styles.add} href={href}>
                        View
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
          {catalogue && catalogue.totalPages > 1 ? (
            <nav className={styles.pager} aria-label="Pagination">
              {Array.from({ length: catalogue.totalPages }, (_, index) => {
                const number = index + 1;
                if (number === catalogue.page) {
                  return (
                    <span key={number} aria-current="page">
                      {number}
                    </span>
                  );
                }

                return (
                  <Link key={number} href={number === 1 ? "/shop" : `/shop?page=${number}`}>
                    {number}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </section>
      </div>
    </ViewTransition>
  );
}
