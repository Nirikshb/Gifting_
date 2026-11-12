"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listMyOrders,
  ORDER_STATUSES,
  type CustomerOrderSummary,
  type OrderStatus,
  type PaginationMeta,
} from "@/lib/api/orders";
import {
  formatOrderDate,
  money,
  ORDER_STATUS_LABELS,
} from "@/lib/orders/format";
import { OrderStatusBadge, PaymentStatusBadge } from "./orders/OrderBadges";
import styles from "./OrdersView.module.css";

type Filter = OrderStatus | "all";
type LoadState = "loading" | "ready" | "error";

const PAGE_SIZE = 8;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All orders" },
  ...ORDER_STATUSES.map((status) => ({
    value: status as Filter,
    label: ORDER_STATUS_LABELS[status],
  })),
];

export function OrdersView() {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    listMyOrders({
      page,
      limit: PAGE_SIZE,
      status: filter === "all" ? undefined : filter,
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
  }, [filter, page, reloadKey]);

  const isFiltered = filter !== "all";
  const hasAnyOrder = (pagination?.total ?? 0) > 0 || !isFiltered;

  return (
    <div className={styles.body}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Your orders</h2>
          <p className={styles.subtitle}>
            Track fulfilment and review the details of every order placed with
            your account.
          </p>
        </div>
        <p className={styles.totalCount}>
          {pagination
            ? `${pagination.total} ${pagination.total === 1 ? "order" : "orders"}`
            : "\u00a0"}
        </p>
      </div>

      <div className={styles.filters} role="group" aria-label="Filter orders">
        {filters.map((item) => {
          const current = item.value === filter;

          return (
            <button
              key={item.value}
              className={current ? `${styles.chip} ${styles.chipCurrent}` : styles.chip}
              type="button"
              aria-pressed={current}
              onClick={() => {
                if (item.value === filter) return;
                setState("loading");
                setFilter(item.value);
                setPage(1);
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {state === "loading" ? <OrderSkeletons /> : null}

      {state === "error" ? (
        <div className={styles.stateCard}>
          <p className={styles.stateTitle}>We could not load your orders</p>
          <p className={styles.stateText}>
            Check your connection and try again. If the problem continues,
            refresh the page.
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
        <div className={styles.stateCard}>
          <p className={styles.stateTitle}>
            {hasAnyOrder && isFiltered
              ? `No ${ORDER_STATUS_LABELS[filter as OrderStatus].toLowerCase()} orders`
              : "No orders yet"}
          </p>
          <p className={styles.stateText}>
            {hasAnyOrder && isFiltered
              ? "Try another status filter to see the rest of your orders."
              : "When you place an order, it will appear here with its reference and delivery progress."}
          </p>
          {!hasAnyOrder ? (
            <Link className={styles.primary} href="/shop" transitionTypes={["curtain"]}>
              Browse the shop
            </Link>
          ) : null}
        </div>
      ) : null}

      {state === "ready" && orders.length > 0 ? (
        <>
          <ul className={styles.list}>
            {orders.map((order) => (
              <li key={order.orderReference}>
                <article className={styles.card}>
                  <header className={styles.cardHead}>
                    <div className={styles.refBlock}>
                      <p className={styles.reference}>{order.orderReference}</p>
                      <p className={styles.placed}>
                        Placed {formatOrderDate(order.createdAt)}
                      </p>
                    </div>
                    <div className={styles.badges}>
                      <OrderStatusBadge status={order.orderStatus} />
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                  </header>

                  <ul className={styles.items}>
                    {order.itemsPreview.map((item, index) => (
                      <li
                        className={styles.item}
                        key={`${order.orderReference}-${item.productSlug}-${index}`}
                      >
                        <span className={styles.itemName}>
                          {item.productName}
                          <span className={styles.qty}> × {item.quantity}</span>
                        </span>
                        <span className={styles.itemTotal}>
                          {money(item.lineTotal)}
                        </span>
                      </li>
                    ))}
                    {order.itemCount > countPreviewed(order) ? (
                      <li className={styles.more}>
                        +{order.itemCount - countPreviewed(order)} more{" "}
                        {order.itemCount - countPreviewed(order) === 1
                          ? "item"
                          : "items"}
                      </li>
                    ) : null}
                  </ul>

                  <footer className={styles.cardFoot}>
                    <p className={styles.summary}>
                      Total <strong>{money(order.totalAmount)}</strong>
                      <span>
                        {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                      </span>
                    </p>
                    <div className={styles.cardActions}>
                      {order.canCancel ? (
                        <Link
                          className={styles.secondary}
                          href={`/account/orders/${encodeURIComponent(order.orderReference)}`}
                          transitionTypes={["account"]}
                        >
                          Cancel or view
                        </Link>
                      ) : null}
                      <Link
                        className={styles.details}
                        href={`/account/orders/${encodeURIComponent(order.orderReference)}`}
                        transitionTypes={["account"]}
                      >
                        View details
                      </Link>
                    </div>
                  </footer>
                </article>
              </li>
            ))}
          </ul>

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
              <p className={styles.pageStatus}>
                Page {pagination.page} of {pagination.totalPages}
              </p>
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
        </>
      ) : null}
    </div>
  );
}

function countPreviewed(order: CustomerOrderSummary) {
  return order.itemsPreview.reduce((total, item) => total + item.quantity, 0);
}

function OrderSkeletons() {
  return (
    <div className={styles.list} aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div className={styles.skeleton} key={index}>
          <span className={styles.skeletonLine} />
          <span className={styles.skeletonLineShort} />
        </div>
      ))}
    </div>
  );
}
