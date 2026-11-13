"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import styles from "./TemplateDock.module.css";

/**
 * Aapulki floating dock — a bottom-edge callout in the style of the firdavs
 * template dock. The sheet is attached to the bottom of the viewport and grows
 * upward by animating its height, while the content inside rises with a short
 * delay — the same two-stage motion as the reference.
 *
 * Content is centralised in `dock` so copy, prices, links and proof rows can
 * be swapped without touching the markup.
 */
const dock = {
  pill: {
    name: "Aapulki",
    label: "Hand-wrapped gift hampers",
    chip: "20% off",
  },
  proof: {
    line: (
      <>
        <span className={styles.accent}>20% off</span> your first hamper
      </>
    ),
    list: "₹1,499",
    price: "₹1,199",
    note: "applied at checkout",
    sub: "Holiday 2026 · one per customer",
  },
  panel: {
    wordmark: "Aapulki",
    product: {
      name: "Holiday Gifting 2026",
      list: "₹1,499",
      price: "₹1,199",
      note: "first order",
    },
    includedTitle: "What's inside",
    included: [
      {
        icon: "box",
        label: "Curated gift hampers",
        tags: ["Festive", "Corporate", "+8"],
      },
      {
        icon: "ribbon",
        label: "Hand-tied ribbon & wax seal",
        tags: ["Every hamper"],
      },
      {
        icon: "hand",
        label: "Handwritten note cards",
        tags: ["Free"],
      },
      {
        icon: "sparkle",
        label: "Keepsake packaging",
        tags: ["Reusable", "FSC mix"],
      },
      {
        icon: "chat",
        label: "Bulk & corporate gifting",
        tags: [{ label: "Get a quote", href: "/process" }],
      },
    ] as { icon: string; label: string; tags: Array<string | { label: string; href: string }> }[],
    offer: {
      title: "20% off your first order",
      sub: "₹1,499 → ₹1,199 · applied at checkout",
    },
    cta: { label: "Shop hampers from ₹1,199", href: "/shop" },
    browse: {
      title: "Explore Aapulki",
      sub: "Hampers, wrap & keepsakes",
      href: "/shop",
    },
  },
};

function Icon({ name, size = 14 }: { name: string; size?: number }): ReactElement {
  const common = { width: size, height: size, viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": true } as const;

  switch (name) {
    case "box":
      return (
        <svg {...common}>
          <path d="M10 1.6c1.3-2.2 4.4-1.7 4.4.7 0 1.1-.6 2-1.4 2.5h3.5c.8 0 1.5.7 1.5 1.5v1.7h-7.5V5h-1v3.5H2V6.7c0-.8.7-1.5 1.5-1.5h3.5C6.2 4.7 5.6 3.8 5.6 2.7c0-2.4 3.1-2.9 4.4-.7z" />
          <path d="M2.6 10.4h6.9V17a1.6 1.6 0 0 1-1.6 1.6H4.2A1.6 1.6 0 0 1 2.6 17v-6.6zM10.5 10.4h6.9V17a1.6 1.6 0 0 1-1.6 1.6h-3.7a1.6 1.6 0 0 1-1.6-1.6v-6.6z" />
        </svg>
      );
    case "craft":
      return (
        <svg {...common}>
          <path d="M10 1.8l8 4.2-8 4.2-8-4.2 8-4.2z" />
          <path d="M2 9.6l8 4.2 8-4.2v2.2l-8 4.2-8-4.2V9.6z" opacity=".65" />
          <path d="M2 13.4l8 4.2 8-4.2v2.2l-8 4.2-8-4.2v-2.2z" opacity=".35" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M10 0c.9 5.9 4.1 9.1 10 10-5.9.9-9.1 4.1-10 10-.9-5.9-4.1-9.1-10-10C5.9 9.1 9.1 5.9 10 0z" />
          <path d="M16.5 12.5c.4 2.4 1.7 3.7 4 4-2.3.4-3.6 1.7-4 4-.4-2.3-1.7-3.6-4-4 2.3-.3 3.6-1.6 4-4z" opacity=".65" />
        </svg>
      );
    case "hand":
      return (
        <svg {...common}>
          <path d="M10 17.6S2.6 13 2.6 8.2A4.3 4.3 0 0 1 10 5.5a4.3 4.3 0 0 1 7.4 2.7c0 4.8-7.4 9.4-7.4 9.4z" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M2.5 3.5h15v10H8.5l-6 4.5v-14.5z" />
        </svg>
      );
    case "ornament":
      return (
        <svg {...common}>
          <path d="M10 1l1.6 3.2 3.4.5-2.5 2.4.6 3.4L10 8.9 6.9 10.5l.6-3.4L5 4.7l3.4-.5L10 1z" />
          <path d="M10 11.5c3 2.4 4.6 4.2 4.6 6.2 0 1.9-2 3.3-4.6 3.3s-4.6-1.4-4.6-3.3c0-2 1.6-3.8 4.6-6.2z" />
        </svg>
      );
    case "ribbon":
      return (
        <svg {...common}>
          <path d="M4 8a3 3 0 0 1 3-3h6a3 3 0 0 1 0 6H7a3 3 0 0 1-3-3z" />
          <path d="M7 11.5L5 19l3-1.5L9.5 19l1.5-3.5" opacity=".65" />
          <path d="M13 11.5L11 19l3-1.5L15.5 19l1.5-3.5" opacity=".4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="7" />
        </svg>
      );
  }
}

function ArrowIcon() {
  return <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden="true" />;
}

const TEASE_KEY = "aapulki-dock:teased";
// Proof card (hover/teaser reveal) is commented out for the time being —
// flip this back to true together with the reveal markup below to re-enable.
const TEASER_ENABLED = false;

export function TemplateDock() {
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [justClosed, setJustClosed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const foldTimer = useRef<number>(0);
  const cooldownTimer = useRef<number>(0);
  const focusBack = useRef(false);

  /**
   * Measure the natural height of the panel content and publish it as
   * --panel-h (capped to the viewport), the same way the reference does —
   * the sheet then animates its height to that value.
   */
  const measure = useCallback(() => {
    const content = contentRef.current;
    const container = containerRef.current;
    if (!content || !container) return;
    content.style.height = "auto";
    const natural = content.scrollHeight;
    content.style.height = "";
    const max = window.innerHeight - 60;
    container.style.setProperty("--panel-h", `${Math.min(natural, max)}px`);
  }, []);

  const clearFold = useCallback(() => {
    window.clearTimeout(foldTimer.current);
  }, []);

  // After closing, the pointer often lands on the tab where the close button
  // used to be — hold the hover reveal off briefly so the pill doesn't pop.
  const startCooldown = useCallback(() => {
    window.clearTimeout(cooldownTimer.current);
    setJustClosed(true);
    cooldownTimer.current = window.setTimeout(() => setJustClosed(false), 700);
  }, []);

  const toggle = useCallback(
    (next: boolean) => {
      clearFold();
      if (next) {
        setTeaser(false);
        // Measure first, then open in the same task — the sheet transitions
        // from its already-committed height (0) to the new --panel-h.
        measure();
        setOpen(true);
        setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 0);
      } else {
        setOpen(false);
        startCooldown();
      }
    },
    [clearFold, measure, startCooldown],
  );

  // Restore focus to the tab after closing via the close button or Escape —
  // runs after React commits, when the tab is visible again.
  useEffect(() => {
    if (open || !focusBack.current) return;
    focusBack.current = false;
    setTimeout(() => tabRef.current?.focus({ preventScroll: true }), 0);
  }, [open]);

  // One-time teaser: after a beat or a real scroll, the tab grows upward and
  // holds the white proof card. It folds itself after a while unless the
  // pointer is over it. Shown once per session.
  useEffect(() => {
    if (!TEASER_ENABLED) return;
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      try {
        sessionStorage.setItem(TEASE_KEY, "1");
      } catch {}
      setTeaser(true);
      foldTimer.current = window.setTimeout(() => setTeaser(false), 15000);
      window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.6) show();
    };
    let timer = 0;
    try {
      if (!sessionStorage.getItem(TEASE_KEY)) timer = window.setTimeout(show, 1500);
      else shown = true;
    } catch {
      timer = window.setTimeout(show, 1500);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(foldTimer.current);
      window.clearTimeout(cooldownTimer.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        focusBack.current = true;
        toggle(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) toggle(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open, toggle, measure]);

  const dockClass = [
    styles.dock,
    open ? styles.dockOpen : "",
    TEASER_ENABLED && teaser && !open ? styles.teaser : "",
    justClosed && !open ? styles.justClosed : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={containerRef} className={dockClass}>
      <button
        ref={tabRef}
        className={styles.tab}
        type="button"
        aria-expanded={open}
        aria-controls="aapulki-dock-panel"
        aria-label={open ? "Close" : `${dock.pill.label}, by Aapulki`}
        onPointerEnter={clearFold}
        onPointerLeave={() => {
          if (teaser) foldTimer.current = window.setTimeout(() => setTeaser(false), 2000);
        }}
        onClick={() => toggle(!open)}
      >
        <span className={styles.row}>
          <span className={styles.face} aria-hidden="true">
            <Icon name="box" size={16} />
          </span>
          <span className={styles.names}>
            <span className={styles.tName}>{dock.pill.name}</span>
            <span className={styles.label}>{dock.pill.label}</span>
          </span>
          <span className={styles.chip}>{dock.pill.chip}</span>
          <ChevronUp className={styles.chev} size={16} strokeWidth={1.8} aria-hidden="true" />
        </span>
        {/* Proof card commented out for now — re-enable with TEASER_ENABLED.
        <span className={styles.reveal} aria-hidden="true">
          <span>
            <span className={styles.proofWrap}>
              <span className={styles.proof}>
                <span className={styles.proofLine}>{dock.proof.line}</span>
                <span className={styles.proofPrice}>
                  <s>{dock.proof.list}</s>
                  <b>{dock.proof.price}</b>
                  <span>{dock.proof.note}</span>
                </span>
                <span className={styles.proofSub}>{dock.proof.sub}</span>
              </span>
            </span>
          </span>
        </span>
        */}
      </button>

      <div className={styles.folder}>
        <div className={styles.sheet}>
          <div
            ref={contentRef}
            className={styles.content}
            role="dialog"
            aria-label={`${dock.panel.wordmark} — ${dock.panel.product.name}`}
            id="aapulki-dock-panel"
          >
            <div className={styles.scroll}>
              <div className={styles.identity}>
                <span className={styles.faceLg} aria-hidden="true">
                  <Icon name="box" size={16} />
                </span>
                <span className={styles.wordmark}>
                  {dock.panel.wordmark}
                  <span className={styles.wordmarkDot}>.</span>
                </span>
                <button
                  ref={closeRef}
                  className={styles.close}
                  type="button"
                  aria-label="Close"
                  onClick={() => {
                    focusBack.current = true;
                    toggle(false);
                  }}
                >
                  <X size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>

              <section className={styles.product}>
                <div className={styles.productHead}>
                  <span className={styles.thumb} aria-hidden="true">
                    <Icon name="box" size={22} />
                  </span>
                  <h2 className={styles.productName}>{dock.panel.product.name}</h2>
                  <span className={styles.priceTag}>
                    <s className={styles.listPrice}>{dock.panel.product.list}</s>
                    <span className={styles.price}>{dock.panel.product.price}</span>
                    <span className={styles.priceNote}>{dock.panel.product.note}</span>
                  </span>
                </div>

                <p className={styles.incTitle}>{dock.panel.includedTitle}</p>
                <ul className={styles.included}>
                  {dock.panel.included.map((row) => (
                    <li key={row.label}>
                      <span className={styles.incIcon} aria-hidden="true">
                        <Icon name={row.icon} />
                      </span>
                      <span className={styles.incLabel}>{row.label}</span>
                      <span className={styles.incTags}>
                        {row.tags.map((tag) =>
                          typeof tag === "string" ? (
                            <span className={styles.incTag} key={tag}>
                              {tag}
                            </span>
                          ) : (
                            <Link
                              className={`${styles.incTag} ${styles.incTagLink}`}
                              key={tag.label}
                              href={tag.href}
                              data-track="included-link"
                            >
                              {tag.label} ↗
                            </Link>
                          ),
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className={styles.offer}>
                  <span className={styles.offerBadge} aria-hidden="true">
                    <Icon name="sparkle" size={14} />
                  </span>
                  <div>
                    <span className={styles.offerTitle}>{dock.panel.offer.title}</span>
                    <span className={styles.offerSub}>{dock.panel.offer.sub}</span>
                  </div>
                </div>

                <Link className={styles.cta} href={dock.panel.cta.href} data-track="cta">
                  <span className={styles.ctaLabel}>{dock.panel.cta.label}</span>
                  <ArrowIcon />
                </Link>
              </section>

              <Link className={styles.browse} href={dock.panel.browse.href} data-track="see-all">
                <span className={styles.fan} aria-hidden="true">
                  <span className={styles.fanItem}>
                    <Icon name="box" size={16} />
                  </span>
                  <span className={styles.fanItem}>
                    <Icon name="ornament" size={16} />
                  </span>
                  <span className={styles.fanItem}>
                    <Icon name="ribbon" size={16} />
                  </span>
                </span>
                <span className={styles.browseCopy}>
                  <span className={styles.browseTitle}>{dock.panel.browse.title}</span>
                  <span className={styles.browseSub}>{dock.panel.browse.sub}</span>
                </span>
                <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
