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
    place: "Austin, United States",
    estimated: "Estimated arrival: 18 May 2026",
    address: "Maple House, Austin",
    items: [
      { name: "Kraft gift box", price: "$24.00", detail: "Medium" },
      { name: "Linen wrap", price: "$12.00", detail: "Sand" },
    ],
    total: "$36.00",
  },
  {
    reference: "AAP-10490",
    group: "shipping",
    status: "On delivery",
    place: "Austin, United States",
    estimated: "Estimated arrival: 22 May 2026",
    address: "Maple House, Austin",
    items: [
      { name: "Ribbon spool", price: "$8.00", detail: "Black" },
      { name: "Tissue pack", price: "$6.00", detail: "Ivory" },
    ],
    total: "$14.00",
  },
  {
    reference: "AAP-10311",
    group: "arrived",
    status: "Arrived",
    place: "Austin, United States",
    estimated: "Delivered: 2 May 2026",
    address: "Maple House, Austin",
    items: [{ name: "Gift tag set", price: "$9.00", detail: "Set of 8" }],
    total: "$9.00",
  },
  {
    reference: "AAP-10204",
    group: "cancelled",
    status: "Cancelled",
    place: "Austin, United States",
    estimated: "Cancelled: 14 Apr 2026",
    address: "Maple House, Austin",
    items: [{ name: "Kraft gift box", price: "$24.00", detail: "Large" }],
    total: "$24.00",
  },
];

const tabs = [
  { label: "Profile", icon: "profile" },
  { label: "Wishlist", icon: "heart" },
  { label: "My Order", icon: "bag", href: "/account/orders" },
  { label: "Saved Address", icon: "pin" },
  { label: "Change Password", icon: "key" },
  { label: "Logout", icon: "out" },
];

export function OrdersView() {
  const [group, setGroup] = useState("shipping");
  const [name, setName] = useState("");
  const [hello, setHello] = useState("");
  const visible = orders.filter((order) => order.group === group);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setHello("Good morning");
    else if (hour < 17) setHello("Good afternoon");
    else setHello("Good evening");

    let cancelled = false;

    api
      .get("/auth/me")
      .then((profile) => {
        if (cancelled || !profile || typeof profile.displayName !== "string") return;
        setName(profile.displayName);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <div>
          <p className={styles.hello}>{hello ? `${hello},` : "\u00a0"}</p>
          <h1 className={styles.name}>{name || "My orders"}</h1>
        </div>
        <nav className={styles.tabs} aria-label="Account">
          {tabs.map((tab) => {
            const current = tab.href === "/account/orders";
            const className = current ? `${styles.tab} ${styles.tabCurrent}` : styles.tab;
            const content = (
              <>
                <TabIcon name={tab.icon} />
                <span>{tab.label}</span>
              </>
            );

            if (tab.href) {
              return (
                <Link
                  key={tab.label}
                  className={className}
                  href={tab.href}
                  aria-current="page"
                  transitionTypes={["curtain"]}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button key={tab.label} className={className} type="button">
                {content}
              </button>
            );
          })}
        </nav>
      </header>

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
    </div>
  );
}

function TabIcon({ name }: { name: string }) {
  if (name === "profile") return <ProfileIcon />;
  if (name === "heart") return <HeartIcon />;
  if (name === "bag") return <BagIcon />;
  if (name === "pin") return <PinIcon />;
  if (name === "key") return <KeyIcon />;
  return <LogoutIcon />;
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M6.5 19c1.2-2.4 3.1-3.5 5.5-3.5S16.3 16.6 17.5 19" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19s-6.2-3.8-6.2-8A3.4 3.4 0 0 1 12 8.2 3.4 3.4 0 0 1 18.2 11c0 4.2-6.2 8-6.2 8z" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 7h12l-1 11H7L6 7z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
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

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="12" r="3" />
      <path d="M11 12h9M17 12v3M14 12v2" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 7V5H6v14h4v-2" />
      <path d="M10 12h8M15 9l3 3-3 3" />
    </svg>
  );
}
