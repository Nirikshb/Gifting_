"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listAdminOrders,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type AdminOrderSummary,
  type OrderStatus,
  type PaginationMeta,
  type PaymentStatus,
} from "@/lib/api/orders";
import {
  formatOrderDate,
  initials,
  money,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders/format";
import { OrderStatusBadge, PaymentStatusBadge } from "./orders/OrderBadges";
import styles from "./admin.module.css";

type LoadState = "loading" | "ready" | "error";
type StatusFilter = OrderStatus | "all";
type PaymentFilter = PaymentStatus | "all";

const PAGE_SIZE = 12;

export function AdminOrdersView() {
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [paymentStatus, setPaymentStatus] = useState<PaymentFilter>("all");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  // Debounce free text so each keystroke does not become a request.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;

    listAdminOrders({
      page,
      limit: PAGE_SIZE,
      status: status === "all" ? undefined : status,
      paymentStatus: paymentStatus === "all" ? undefined : paymentStatus,
      search: search || undefined,
    })
      .then((result) => {
        if (cancelled) return;
        setOrders(result.data);
        setPagination(result.pagination);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [page, status, paymentStatus, search, reloadKey]);

  const filtersActive =
    status !== "all" || paymentStatus !== "all" || search.length > 0;

  function clearFilters() {
    if (filtersActive) setState("loading");
    setSearchText("");
    setSearch("");
    setStatus("all");
    setPaymentStatus("all");
    setPage(1);
  }

  const from = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const to = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <p className={styles.eyebrow}>Studio</p>
          <h1 className={styles.pageTitle}>Orders</h1>
          <p className={styles.pageSub}>
            Search, filter and open any order to update fulfilment or record a
            cancellation.
          </p>
        </div>
        <Link className={styles.actionButton} href="/admin">
          Back to overview
        </Link>
      </header>

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
              placeholder="Search reference, customer, email or recipient"
              aria-label="Search orders"
              onChange={(event) => setSearchText(event.target.value)}
            />
            <button className={styles.searchButton} type="submit">
              Search
            </button>
          </form>

          <label className={styles.selectLabel}>
            <span>Payment</span>
            <select
              className={styles.select}
              value={paymentStatus}
              onChange={(event) => {
                setState("loading");
                setPaymentStatus(event.target.value as PaymentFilter);
                setPage(1);
              }}
            >
              <option value="all">All payments</option>
              {PAYMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {PAYMENT_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.chips} role="group" aria-label="Filter by fulfilment status">
          <button
            className={status === "all" ? `${styles.chip} ${styles.chipCurrent}` : styles.chip}
            type="button"
            aria-pressed={status === "all"}
            onClick={() => {
              if (status === "all") return;
              setState("loading");
              setStatus("all");
              setPage(1);
            }}
          >
            All
          </button>
          {ORDER_STATUSES.map((value) => {
            const current = status === value;

            return (
              <button
                key={value}
                className={current ? `${styles.chip} ${styles.chipCurrent}` : styles.chip}
                type="button"
                aria-pressed={current}
                onClick={() => {
                  if (status === value) return;
                  setState("loading");
                  setStatus(value);
                  setPage(1);
                }}
              >
                {ORDER_STATUS_LABELS[value]}
              </button>
            );
          })}
        </div>

        {state === "loading" ? <TableSkeleton /> : null}

        {state === "error" ? (
          <div className={styles.emptyBlock}>
            <p className={styles.emptyTitle}>We could not load orders</p>
            <p className={styles.emptyText}>
              Check the connection to the studio API and try again.
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

        {state === "ready" && orders.length === 0 ? (
          <div className={styles.emptyBlock}>
            <p className={styles.emptyTitle}>
              {filtersActive ? "No orders match these filters" : "No orders yet"}
            </p>
            <p className={styles.emptyText}>
              {filtersActive
                ? "Try a different search or status combination."
                : "Orders placed through the storefront will appear here."}
            </p>
            {filtersActive ? (
              <button className={styles.retry} type="button" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}

        {state === "ready" && orders.length > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Recipient</th>
                    <th scope="col">Items</th>
                    <th scope="col">Status</th>
                    <th scope="col">Payment</th>
                    <th scope="col" className={styles.alignRight}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.orderReference}>
                      <td>
                        <Link
                          className={styles.orderLink}
                          href={`/admin/orders/${encodeURIComponent(order.orderReference)}`}
                        >
                          {order.orderReference}
                        </Link>
                        <p className={styles.orderDate}>
                          {formatOrderDate(order.createdAt)}
                        </p>
                      </td>
                      <td>
                        <div className={styles.customerCell}>
                          <span className={styles.avatar} aria-hidden="true">
                            {initials(order.customerName)}
                          </span>
                          <div>
                            <p className={styles.customerName}>{order.customerName}</p>
                            <p className={styles.customerEmail}>{order.customerEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className={styles.muted}>
                        {order.recipientName ?? order.customerName}
                      </td>
                      <td className={styles.muted}>{order.itemCount}</td>
                      <td>
                        <OrderStatusBadge status={order.orderStatus} />
                      </td>
                      <td>
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </td>
                      <td className={`${styles.alignRight} ${styles.totalCell}`}>
                        {money(order.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.tableFooter}>
              <p className={styles.footerMeta}>
                {pagination
                  ? `Showing ${from}–${to} of ${pagination.total} ${pagination.total === 1 ? "order" : "orders"}`
                  : "\u00a0"}
              </p>
              {pagination && pagination.totalPages > 1 ? (
                <nav className={styles.pagination} aria-label="Order pages">
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
                      setPage((value) => Math.min(pagination.totalPages, value + 1));
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
