"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatInr, productImageUrl, productPath } from "@/lib/api/product-format";
import type { CatalogueProduct } from "@/lib/api/catalogue";
import styles from "./SignatureListingView.module.css";

type Density = "compact" | "medium" | "large";
type SortKey =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc"
  | "date-new"
  | "date-old";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "name-asc", label: "Alphabetically, A–Z" },
  { value: "name-desc", label: "Alphabetically, Z–A" },
  { value: "date-new", label: "Date, new to old" },
  { value: "date-old", label: "Date, old to new" },
];

function priceValue(product: CatalogueProduct) {
  const value = Number(product.price);
  return Number.isFinite(value) ? value : 0;
}

function CompactIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function MediumIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="5" />
      <rect x="3" y="11" width="18" height="5" />
      <rect x="3" y="19" width="18" height="2" />
    </svg>
  );
}

function LargeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="9" />
      <rect x="3" y="15" width="18" height="6" />
    </svg>
  );
}

export function SignatureListingView({ products }: { products: CatalogueProduct[] }) {
  const [density, setDensity] = useState<Density>("compact");
  const [sort, setSort] = useState<SortKey>("date-new");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setDensity("medium");
    }
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const drawer = drawerRef.current;
    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusFirst = () => {
      const items = drawer?.querySelectorAll<HTMLElement>(selector);
      items?.[0]?.focus();
    };
    focusFirst();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawer) return;
      const items = Array.from(drawer.querySelectorAll<HTMLElement>(selector));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [filtersOpen]);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      if (inStockOnly && product.stockQuantity <= 0) return false;
      const value = priceValue(product);
      if (minPrice.trim() !== "" && value < Number(minPrice)) return false;
      if (maxPrice.trim() !== "" && value > Number(maxPrice)) return false;
      return true;
    });
  }, [products, inStockOnly, minPrice, maxPrice]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => priceValue(a) - priceValue(b));
        break;
      case "price-desc":
        list.sort((a, b) => priceValue(b) - priceValue(a));
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "date-old":
        list.sort((a, b) => (a.updatedAt ?? "").localeCompare(b.updatedAt ?? ""));
        break;
      case "date-new":
        list.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
        break;
      case "featured":
      default:
        break;
    }
    return list;
  }, [filtered, sort]);

  const countLabel = `${sorted.length} ${sorted.length === 1 ? "hamper" : "hampers"}`;

  return (
    <div className={styles.pageFill}>
      <section className={styles.hero} aria-labelledby="signature-heading">
        <p className={styles.eyebrow}>Thoughtful gifts, beautifully wrapped</p>
        <h1 id="signature-heading" className={styles.title}>
          Signature collection
        </h1>
        <p className={styles.body}>
          Explore our thoughtfully curated gift boxes, each filled with premium
          selections and beautifully wrapped in our signature packaging. Every box
          includes a personalized handwritten note.
        </p>
      </section>

      <div className={styles.toolbar} role="toolbar" aria-label="Collection controls">
        <div className={styles.densityGroup} aria-label="Grid density">
          <button
            type="button"
            className={density === "compact" ? styles.densityButtonActive : styles.densityButton}
            onClick={() => setDensity("compact")}
            aria-pressed={density === "compact"}
            aria-label="Compact grid"
          >
            <CompactIcon />
          </button>
          <button
            type="button"
            className={density === "medium" ? styles.densityButtonActive : styles.densityButton}
            onClick={() => setDensity("medium")}
            aria-pressed={density === "medium"}
            aria-label="Medium grid"
          >
            <MediumIcon />
          </button>
          <button
            type="button"
            className={density === "large" ? styles.densityButtonActive : styles.densityButton}
            onClick={() => setDensity("large")}
            aria-pressed={density === "large"}
            aria-label="Large grid"
          >
            <LargeIcon />
          </button>
        </div>

        <div className={styles.toolbarSpacer} />

        <label className={styles.sortLabel}>
          <span className={styles.sortCaption}>Sort by</span>
          <select
            className={styles.sortSelect}
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={styles.filterButton}
          onClick={() => setFiltersOpen(true)}
        >
          Filter
        </button>

        <span className={styles.count} aria-live="polite">
          {countLabel}
        </span>
      </div>

      <section className={styles.gridSection} aria-labelledby="signature-grid-heading">
        <h2 id="signature-grid-heading" className={styles.srOnly}>
          Products
        </h2>
        {sorted.length === 0 ? (
          <p className={styles.note}>No hampers match these filters.</p>
        ) : (
          <div className={styles.grid} data-density={density}>
            {sorted.map((product) => {
              const href = productPath(product.slug);
              const image = productImageUrl(product.imageUrl);
              const price = formatInr(product.price);
              return (
                <article className={styles.card} key={product.slug}>
                  <div className={styles.media}>
                    {href ? (
                      <Link className={styles.mediaLink} href={href} aria-label={`View ${product.name}`}>
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className={styles.image} src={image} alt={product.name} loading="lazy" />
                        ) : (
                          <span className={styles.noImage}>A gift, chosen with care</span>
                        )}
                      </Link>
                    ) : (
                      <span className={styles.mediaLink} aria-hidden="true">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className={styles.image} src={image} alt="" loading="lazy" />
                        ) : (
                          <span className={styles.noImage}>A gift, chosen with care</span>
                        )}
                      </span>
                    )}
                    {product.stockQuantity <= 0 ? (
                      <span className={styles.soldOut}>Sold out</span>
                    ) : null}
                  </div>

                  <div className={styles.info}>
                    <p className={styles.vendor}>
                      <Link href="/shop">Aapulki</Link>
                    </p>
                    <h3 className={styles.productTitle}>
                      {href ? <Link href={href}>{product.name}</Link> : product.name}
                    </h3>
                    {price ? <p className={styles.price}>{price}</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {filtersOpen ? (
        <div className={styles.drawerOverlay} role="presentation" onClick={() => setFiltersOpen(false)}>
          <aside
            ref={drawerRef}
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="signature-filters-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHead}>
              <h2 id="signature-filters-title" className={styles.drawerTitle}>
                Filters
              </h2>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
              >
                ×
              </button>
            </div>

            <div className={styles.filterGroup}>
              <h3>Availability</h3>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => setInStockOnly(event.target.checked)}
                />
                In stock only
              </label>
            </div>

            <div className={styles.filterGroup}>
              <h3>Price</h3>
              <div className={styles.priceInputs}>
                <label>
                  <span>Min ₹</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                  />
                </label>
                <label>
                  <span>Max ₹</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className={styles.filterGroup}>
              <h3>Product type</h3>
              <p className={styles.filterStatic}>Hamper</p>
            </div>

            <div className={styles.filterGroup}>
              <h3>Brand</h3>
              <p className={styles.filterStatic}>Aapulki</p>
            </div>

            <button
              type="button"
              className={styles.viewResults}
              onClick={() => setFiltersOpen(false)}
            >
              View results
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
