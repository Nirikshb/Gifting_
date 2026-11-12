"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getAdminOrderStats,
  type AdminOrderStats,
} from "@/lib/api/orders";
import {
  formatOrderDate,
  initials,
  money,
} from "@/lib/orders/format";
import { OrderStatusBadge, PaymentStatusBadge } from "./orders/OrderBadges";
import styles from "./admin.module.css";

type LoadState = "loading" | "ready" | "error";

export function AdminOverview() {
  const [stats, setStats] = useState<AdminOrderStats | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    getAdminOrderStats()
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <p className={styles.eyebrow}>Studio</p>
          <h1 className={styles.pageTitle}>Order overview</h1>
          <p className={styles.pageSub}>
            Fulfilment, payment and revenue at a glance. Every figure is drawn
            from recorded orders.
          </p>
        </div>
        <Link className={styles.actionButton} href="/admin/orders">
          Manage orders
        </Link>
      </header>

      {state === "loading" ? <OverviewSkeleton /> : null}

      {state === "error" ? (
        <div className={styles.panel}>
          <p className={styles.emptyTitle}>We could not load the overview</p>
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

      {state === "ready" && stats ? (
        <>
          <section className={styles.statGrid} aria-label="Order statistics">
            <StatCard
              label="Total orders"
              value={String(stats.totalOrders)}
              hint={`${stats.cancelledOrders} cancelled`}
            />
            <StatCard
              label="Awaiting confirmation"
              value={String(stats.pendingOrders)}
              hint="Pending review"
              share={share(stats.pendingOrders, stats.totalOrders)}
            />
            <StatCard
              label="In fulfilment"
              value={String(stats.activeOrders)}
              hint="Confirmed, processing or shipped"
              share={share(stats.activeOrders, stats.totalOrders)}
            />
            <StatCard
              label="Delivered"
              value={String(stats.deliveredOrders)}
              hint="Completed orders"
              share={share(stats.deliveredOrders, stats.totalOrders)}
            />
            <StatCard
              label="Paid revenue"
              value={money(stats.revenue)}
              hint="Paid orders, cancelled excluded"
            />
            <StatCard
              label="Unpaid orders"
              value={String(stats.unpaidOrders)}
              hint={`${stats.paidOrders} marked paid`}
              share={share(stats.unpaidOrders, stats.totalOrders)}
            />
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Recent orders</h2>
                <p className={styles.panelSub}>The five most recently placed orders.</p>
              </div>
              <Link className={styles.panelLink} href="/admin/orders">
                View all
              </Link>
            </div>

            {stats.recentOrders.length === 0 ? (
              <div className={styles.emptyBlock}>
                <p className={styles.emptyTitle}>No orders yet</p>
                <p className={styles.emptyText}>
                  Orders placed through the storefront or guest checkout will
                  appear here.
                </p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Order</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Status</th>
                      <th scope="col">Payment</th>
                      <th scope="col" className={styles.alignRight}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.map((order) => (
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
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function share(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function StatCard({
  label,
  value,
  hint,
  share,
}: {
  label: string;
  value: string;
  hint: string;
  share?: number;
}) {
  return (
    <article className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statHint}>{hint}</p>
      {share !== undefined ? (
        <span className={styles.statTrack} aria-hidden="true">
          <span className={styles.statFill} style={{ width: `${share}%` }} />
        </span>
      ) : null}
    </article>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <div className={styles.statGrid} aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div className={styles.statSkeleton} key={index} />
        ))}
      </div>
      <div className={styles.panelSkeleton} aria-hidden="true" />
    </>
  );
}
