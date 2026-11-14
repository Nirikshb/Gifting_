"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getAdminProductStats,
  listAdminProductCategories,
  listAdminProducts,
  type AdminProductStats,
  type AdminProductSummary,
  type PaginationMeta,
} from "@/lib/api/products";
import { formatInr } from "@/lib/api/product-format";
import { formatOrderDate } from "@/lib/orders/format";
import styles from "./admin.module.css";

type LoadState = "loading" | "ready" | "error";

type AvailabilityFilter = "all" | "active" | "inactive";
type StockFilter = "all" | "in" | "low" | "out";

const PAGE_SIZE = 12;

const availabilityFilters: { value: AvailabilityFilter; label: string }[] = [
  { value: "all", label: "All products" },
  { value: "active", label: "Listed" },
  { value: "inactive", label: "Hidden" },
];

const stockFilters: { value: StockFilter; label: string }[] = [
  { value: "all", label: "Any stock" },
  { value: "in", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

function stockLabel(product: AdminProductSummary) {
  if (product.stockState === "out") return "Out of stock";
  if (product.stockState === "low") return "Low stock";
  return `${product.stockQuantity} in stock`;
}

export function AdminProductsView() {
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [stock, setStock] = useState<StockFilter>("all");
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<AdminProductSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<AdminProductStats | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;

    listAdminProductCategories()
      .then((result) => {
        if (!cancelled) setCategories(result);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;

    listAdminProducts({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      category: category || undefined,
      availability,
      stock,
    })
      .then((result) => {
        if (cancelled) return;
        setProducts(result.data);
        setPagination(result.pagination);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [page, search, category, availability, stock, reloadKey]);

  useEffect(() => {
    let cancelled = false;

    getAdminProductStats()
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtersActive =
    availability !== "all" || stock !== "all" || category !== "" || search !== "";

  function clearFilters() {
    setSearchText("");
    setSearch("");
    setCategory("");
    setAvailability("all");
    setStock("all");
    setPage(1);
  }

  const from =
    pagination && pagination.total > 0
      ? (pagination.page - 1) * pagination.limit + 1
      : 0;
  const to = pagination
    ? Math.min(pagination.page * pagination.limit, pagination.total)
    : 0;

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <p className={styles.eyebrow}>Studio</p>
          <h1 className={styles.pageTitle}>Products</h1>
          <p className={styles.pageSub}>
            Add products, keep prices and images current, and control what the
            shop can sell.
          </p>
        </div>
        <Link className={styles.actionButton} href="/admin/products/new">
          Add product
        </Link>
      </header>

      {stats ? (
        <section className={styles.statGrid} aria-label="Product statistics">
          <StatCard
            label="Products"
            value={String(stats.totalProducts)}
            hint={`${stats.activeProducts} listed`}
          />
          <StatCard
            label="Hidden"
            value={String(stats.inactiveProducts)}
            hint="Not visible in the shop"
          />
          <StatCard
            label="Out of stock"
            value={String(stats.outOfStockProducts)}
            hint="Cannot be bought"
          />
          <StatCard
            label="Low stock"
            value={String(stats.lowStockProducts)}
            hint={`${stats.lowStockThreshold} or fewer left`}
          />
        </section>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <form
            className={styles.searchForm}
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const next = searchText.trim();
              if (next !== search) setState("loading");
              setSearch(next);
              setPage(1);
            }}
          >
            <input
              className={styles.searchInput}
              type="search"
              value={searchText}
              placeholder="Search by product name or slug"
              aria-label="Search products"
              onChange={(event) => setSearchText(event.target.value)}
            />
            <button className={styles.searchButton} type="submit">
              Search
            </button>
          </form>

          <label className={styles.selectLabel}>
            <span>Category</span>
            <select
              className={styles.select}
              value={category}
              onChange={(event) => {
                setState("loading");
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.selectLabel}>
            <span>Availability</span>
            <select
              className={styles.select}
              value={availability}
              onChange={(event) => {
                setState("loading");
                setAvailability(event.target.value as AvailabilityFilter);
                setPage(1);
              }}
            >
              {availabilityFilters.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.selectLabel}>
            <span>Stock</span>
            <select
              className={styles.select}
              value={stock}
              onChange={(event) => {
                setState("loading");
                setStock(event.target.value as StockFilter);
                setPage(1);
              }}
            >
              {stockFilters.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {state === "loading" ? <TableSkeleton /> : null}

        {state === "error" ? (
          <div className={styles.emptyBlock}>
            <p className={styles.emptyTitle}>We could not load the products</p>
            <p className={styles.emptyText}>
              The studio API did not respond. Check the connection and try again.
            </p>
            <button
              className={styles.retry}
              type="button"
              onClick={() => {
                setState("loading");
                setReloadKey((value) => value + 1);
              }}
            >
              Try again
            </button>
          </div>
        ) : null}

        {state === "ready" && products.length === 0 ? (
          <div className={styles.emptyBlock}>
            <p className={styles.emptyTitle}>
              {filtersActive
                ? "No products match these filters"
                : "No products yet"}
            </p>
            <p className={styles.emptyText}>
              {filtersActive
                ? "Try a different search, category or stock filter."
                : "Add your first product to start selling."}
            </p>
            <div className={styles.emptyActions}>
              {filtersActive ? (
                <button className={styles.retry} type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <Link className={styles.retry} href="/admin/products/new">
                  Add product
                </Link>
              )}
            </div>
          </div>
        ) : null}

        {state === "ready" && products.length > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Price</th>
                    <th scope="col">Category</th>
                    <th scope="col">Stock</th>
                    <th scope="col">Availability</th>
                    <th scope="col" className={styles.alignRight}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className={styles.productCell}>
                          {product.imageUrl ? (
                            <img
                              className={styles.productThumb}
                              src={product.imageUrl}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span className={styles.productThumbEmpty} aria-hidden="true">
                              {product.name.trim().charAt(0).toUpperCase() || "?"}
                            </span>
                          )}
                          <div>
                            <p className={styles.customerName}>{product.name}</p>
                            <p className={styles.productSlug}>{product.slug}</p>
                            <p className={styles.orderDate}>
                              Updated {formatOrderDate(product.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={styles.totalCell}>
                        {formatInr(product.price) ?? product.price}
                      </td>
                      <td className={styles.muted}>{product.category}</td>
                      <td>
                        <span
                          className={`${styles.stockBadge} ${styles[`stock${product.stockState}`]}`}
                        >
                          {stockLabel(product)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.pill} ${product.isActive ? styles.pillActive : styles.pillInactive}`}
                        >
                          {product.isActive ? "Listed" : "Hidden"}
                        </span>
                      </td>
                      <td className={styles.alignRight}>
                        <Link
                          className={styles.rowAction}
                          href={`/admin/products/${product.id}/edit`}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.tableFooter}>
              <p className={styles.footerMeta}>
                {pagination
                  ? `Showing ${from}–${to} of ${pagination.total} ${pagination.total === 1 ? "product" : "products"}`
                  : "\u00a0"}
              </p>
              {pagination && pagination.totalPages > 1 ? (
                <nav className={styles.pagination} aria-label="Product pages">
                  <button
                    className={styles.pageButton}
                    type="button"
                    disabled={page <= 1}
                    onClick={() => {
                      setState("loading");
                      setPage((value) => Math.max(1, value - 1));
                    }}
                  >
                    Previous
                  </button>
                  <span className={styles.pageStatus}>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    className={styles.pageButton}
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => {
                      setState("loading");
                      setPage((value) =>
                        Math.min(pagination.totalPages, value + 1),
                      );
                    }}
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statHint}>{hint}</p>
    </article>
  );
}

function TableSkeleton() {
  return (
    <div className={styles.panelSkeleton} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
