import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import {
  formatInr,
  getActiveProduct,
  inrAmount,
  productImageUrl,
  productPath,
} from "@/lib/api/catalogue";
import { getSiteUrl, publicPageMetadata } from "@/lib/site-url";
import styles from "./page.module.css";

export const instant = false;

type ProductParams = {
  params: Promise<{ slug: string }>;
};

function jsonLdScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateMetadata({ params }: ProductParams) {
  const { slug } = await params;
  const result = await getActiveProduct(slug);
  if (!result.ok) {
    return { title: "Product" };
  }

  const product = result.data;
  const path = productPath(product.slug) ?? "/shop";
  const description = product.description.trim() || product.name;

  return {
    title: product.name,
    ...publicPageMetadata(`${product.name} | Aapulki`, description, path),
  };
}

export default async function ProductPage({ params }: ProductParams) {
  const { slug } = await params;
  const result = await getActiveProduct(slug);

  if (!result.ok) {
    if (result.missing) notFound();

    return (
      <ViewTransition name="page-curtain" share="curtain" default="none">
        <div className={styles.pageFill}>
          <article className={styles.page}>
            <h1>Product</h1>
            <p className={styles.note}>This product cannot be loaded right now.</p>
          </article>
        </div>
      </ViewTransition>
    );
  }

  const product = result.data;
  const amount = inrAmount(product.price);
  const price = formatInr(product.price);
  const image = productImageUrl(product.imageUrl);
  const description = product.description.trim();
  const path = productPath(product.slug);
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(amount
      ? {
          offers: {
            "@type": "Offer",
            price: amount,
            priceCurrency: "INR",
            availability:
              product.stockQuantity > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            ...(siteUrl && path ? { url: `${siteUrl}${path}` } : {}),
          },
        }
      : {}),
  };

  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <div className={styles.pageFill}>
        <article className={styles.page}>
          {image ? <img className={styles.image} src={image} alt={product.name} /> : null}
          <h1>{product.name}</h1>
          {price ? <p className={styles.price}>{price}</p> : null}
          <p className={styles.stock}>{product.stockQuantity > 0 ? "In stock" : "Out of stock"}</p>
          {description ? <p className={styles.description}>{description}</p> : null}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }}
          />
        </article>
      </div>
    </ViewTransition>
  );
}
