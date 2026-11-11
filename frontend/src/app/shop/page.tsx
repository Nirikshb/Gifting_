import { ViewTransition } from "react";
import styles from "./page.module.css";

const products = [
  {
    name: "Skin-Perfecting Protective Base Prep",
    price: 79,
    kind: "bottle",
    cap: "#1c1c1c",
    liquid: "#f0d9a4",
    liquidDeep: "#e4c98a",
  },
  {
    name: "Hydrating & Soothing Cream",
    price: 49,
    kind: "jar",
    lid: "#d7b5a2",
    body: "#f3e4dc",
  },
  {
    name: "Hydrating & Soothing Mist with Bamboo/Orchid Extract & Willow Water",
    price: 32,
    kind: "bottle",
    cap: "#c4a090",
    liquid: "#f7f4f1",
    liquidDeep: "#efe8e3",
    slim: true,
  },
  {
    name: "Whole Plant Effect Essential Cream",
    price: 77,
    kind: "jar",
    lid: "#8d746c",
    body: "#f7f4f0",
  },
  {
    name: "Whole Plant Effect Concentrate",
    price: 88,
    kind: "dropper",
    cap: "#2a2422",
    collar: "#6a5348",
    liquid: "#f4f1ec",
    liquidDeep: "#e7e1d8",
  },
  {
    name: "Calming & Comforting Cream",
    price: 36,
    kind: "tube",
    body: "#2e3834",
  },
  {
    name: "Calming & Comforting Ampoule",
    price: 50,
    kind: "dropper",
    cap: "#1e1e1e",
    collar: "#1f3a34",
    liquid: "#e7d56a",
    liquidDeep: "#d7c45a",
  },
  {
    name: "Whole Plant Effect Essential Cream",
    price: 99,
    kind: "jar",
    lid: "#8e8a90",
    body: "#b9b4bc",
  },
  {
    name: "Hydrating & Soothing Toner with Bamboo/Orchid Extract & Willow Water",
    price: 34,
    kind: "bottle",
    cap: "#d7b5a4",
    liquid: "#f6ebe6",
    liquidDeep: "#f0ddd6",
    slim: true,
  },
] as const;

const pages = [1, 2, 3, 4, 5];

export const metadata = {
  title: "Shop",
  description: "Shop Aapulki.",
};

export default function ShopPage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <div className={styles.pageFill}>
        <section className={styles.page} aria-labelledby="shop-heading">
          <h1 id="shop-heading" className={styles.srOnly}>
            Shop
          </h1>
          <div className={styles.grid}>
            {products.map((product) => (
              <article className={styles.card} key={`${product.name}-${product.price}`}>
                <div className={product.kind === "jar" ? styles.photoShort : styles.photo}>
                  <ProductArt product={product} />
                </div>
                <h2>{product.name}</h2>
                <div className={styles.priceRow}>
                  <p className={styles.price}>${product.price}</p>
                  <button className={styles.wish} type="button" aria-label={`Save ${product.name}`}>
                    <HeartIcon />
                  </button>
                </div>
                <div className={styles.actions}>
                  <button className={styles.add} type="button">
                    Add to cart
                  </button>
                  <button className={styles.more} type="button" aria-label={`View ${product.name}`}>
                    <ArrowIcon />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <nav className={styles.pager} aria-label="Pagination">
            {pages.map((page) =>
              page === 1 ? (
                <span key={page} aria-current="page">
                  {page}
                </span>
              ) : (
                <span key={page}>{page}</span>
              ),
            )}
          </nav>
        </section>
      </div>
    </ViewTransition>
  );
}

function ProductArt({ product }: { product: (typeof products)[number] }) {
  const title = product.name;

  if (product.kind === "jar") {
    return (
      <svg className={styles.jar} viewBox="0 0 160 130" role="img" aria-label={title}>
        <ellipse cx="80" cy="28" rx="46" ry="12" fill={product.lid} />
        <rect x="36" y="26" width="88" height="10" fill={product.lid} />
        <rect x="48" y="20" width="64" height="10" rx="2" fill={shade(product.lid, -18)} />
        <rect x="34" y="36" width="92" height="72" rx="16" fill={product.body} />
        <rect x="34" y="36" width="10" height="72" rx="8" fill="#ffffff" opacity="0.35" />
        <text x="80" y="78" textAnchor="middle" className={styles.mark}>
          YUNJAC
        </text>
        <rect x="112" y="62" width="6" height="16" rx="1" fill="#c6a15a" />
      </svg>
    );
  }

  if (product.kind === "dropper") {
    return (
      <svg className={styles.bottle} viewBox="0 0 120 190" role="img" aria-label={title}>
        <rect x="52" y="6" width="16" height="22" rx="8" fill={product.cap} />
        <rect x="56" y="26" width="8" height="16" fill={product.collar} />
        <rect x="46" y="40" width="28" height="8" rx="2" fill={product.collar} />
        <rect x="38" y="52" width="44" height="112" rx="18" fill={product.liquid} />
        <rect x="38" y="96" width="44" height="68" rx="18" fill={product.liquidDeep} />
        <rect x="44" y="58" width="6" height="90" rx="3" fill="#ffffff" opacity="0.45" />
        <text x="60" y="128" textAnchor="middle" className={styles.mark}>
          YUNJAC
        </text>
      </svg>
    );
  }

  if (product.kind === "tube") {
    return (
      <svg className={styles.bottle} viewBox="0 0 120 180" role="img" aria-label={title}>
        <rect x="46" y="8" width="28" height="16" rx="3" fill="#1a1a1a" />
        <path d="M40 28h40l10 118c0 10-12 16-30 16s-30-6-30-16L40 28z" fill={product.body} />
        <path d="M46 36h8l4 96c0 6-4 10-12 10V36z" fill="#ffffff" opacity="0.12" />
        <text x="60" y="110" textAnchor="middle" className={styles.markLight}>
          YUNJAC
        </text>
      </svg>
    );
  }

  const width = "slim" in product && product.slim ? 34 : 48;
  const x = 60 - width / 2;

  return (
    <svg className={styles.bottle} viewBox="0 0 120 190" role="img" aria-label={title}>
      <rect x="48" y="8" width="24" height="26" rx="3" fill={product.cap} />
      <rect x="52" y="34" width="16" height="14" fill={shade(product.liquid, -8)} />
      <rect x={x} y="50" width={width} height="118" rx="14" fill={product.liquid} />
      <rect x={x} y="108" width={width} height="60" rx="14" fill={product.liquidDeep} />
      <rect x={x + 6} y="58" width="6" height="96" rx="3" fill="#ffffff" opacity="0.4" />
      <text x="60" y="132" textAnchor="middle" className={styles.mark}>
        YUNJAC
      </text>
    </svg>
  );
}

function shade(hex: string, amount: number) {
  const value = hex.replace("#", "");
  const num = parseInt(value, 16);
  const channels = [16, 8, 0].map((shift) => {
    const channel = (num >> shift) & 255;
    return Math.max(0, Math.min(255, channel + amount));
  });
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19.2s-6.4-4-6.4-8.1c0-2.2 1.6-3.7 3.6-3.7 1.2 0 2.2.6 2.8 1.6.6-1 1.6-1.6 2.8-1.6 2 0 3.6 1.5 3.6 3.7 0 4.1-6.4 8.1-6.4 8.1z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13" />
      <path d="M13 7l5 5-5 5" />
    </svg>
  );
}
