"use client";

import { useState } from "react";
import styles from "./page.module.css";

const groups = [
  { id: "shipping", label: "On Shipping" },
  { id: "arrived", label: "Arrived" },
  { id: "cancelled", label: "Cancelled" },
];

const orders = [
  {
    reference: "AAP-10482",
    group: "shipping",
    status: "On delivery",
    place: "Jaipur, India",
    estimated: "Estimated arrival: 18 May 2026",
    address: "Civil Lines, Jaipur",
    items: [
      { name: "Kraft gift box", price: "₹24.00", detail: "Medium" },
      { name: "Linen wrap", price: "₹12.00", detail: "Sand" },
    ],
    total: "₹36.00",
  },
  {
    reference: "AAP-10490",
    group: "shipping",
    status: "On delivery",
    place: "Jaipur, India",
    estimated: "Estimated arrival: 22 May 2026",
    address: "Civil Lines, Jaipur",
    items: [
      { name: "Ribbon spool", price: "₹8.00", detail: "Black" },
      { name: "Tissue pack", price: "₹6.00", detail: "Ivory" },
    ],
    total: "₹14.00",
  },
  {
    reference: "AAP-10311",
    group: "arrived",
    status: "Arrived",
    place: "Jaipur, India",
    estimated: "Delivered: 2 May 2026",
    address: "Civil Lines, Jaipur",
    items: [{ name: "Gift tag set", price: "₹9.00", detail: "Set of 8" }],
    total: "₹9.00",
  },
  {
    reference: "AAP-10204",
    group: "cancelled",
    status: "Cancelled",
    place: "Jaipur, India",
    estimated: "Cancelled: 14 Apr 2026",
    address: "Civil Lines, Jaipur",
    items: [{ name: "Kraft gift box", price: "₹24.00", detail: "Large" }],
    total: "₹24.00",
  },
];

export function OrdersView() {
  const [group, setGroup] = useState("shipping");
  const visible = orders.filter((order) => order.group === group);

  return (
    <div className={styles.body}>
      <div className={styles.statuses} role="group" aria-label="Order status">
        {groups.map((item) => {
          const count = orders.filter((order) => order.group === item.id).length;
          const current = item.id === group;

          return (
            <button
              key={item.id}
              className={current ? `${styles.status} ${styles.statusCurrent}` : styles.status}
              type="button"
              aria-pressed={current}
              onClick={() => setGroup(item.id)}
            >
              {current ? <span className={styles.knob} aria-hidden="true" /> : null}
              <span className={styles.statusLabel}>{item.label}</span>
              <span className={styles.count}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.list}>
        {visible.length === 0 ? <p className={styles.empty}>No orders in this group.</p> : null}
        {visible.map((order) => (
          <article className={styles.card} key={order.reference}>
            <div className={styles.head}>
              <div>
                <p className={styles.reference}>{order.reference}</p>
                <p className={styles.place}>{order.place}</p>
              </div>
              <span className={styles.dots} aria-hidden="true" />
              <div className={styles.arrival}>
                <p>{order.estimated}</p>
                <p className={styles[order.group]}>{order.status}</p>
              </div>
              <p className={styles.address}>
                <PinIcon />
                <span>{order.address}</span>
              </p>
            </div>

            <ul className={styles.items}>
              {order.items.map((item) => (
                <li className={styles.item} key={`${order.reference}-${item.name}`}>
                  <span className={styles.photo} aria-hidden="true" />
                  <span>
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.price}>{item.price}</span>
                  </span>
                  <span className={styles.detail}>{item.detail}</span>
                </li>
              ))}
            </ul>

            <div className={styles.foot}>
              <p className={styles.total}>
                Total: <strong>{order.total}</strong>
                <span>
                  {order.items.length} {order.items.length === 1 ? "item" : "items"}
                </span>
              </p>
              <button className={styles.details} type="button">
                Details
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}
