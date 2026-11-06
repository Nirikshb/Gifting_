"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const steps = [
  {
    number: "01",
    title: "Discover",
    copy: "We learn who the gift is for, what it must hold, and how it should feel in the hand.",
    kicker: "[ Where the gift starts ]",
    items: ["Occasion", "Recipient", "The object inside"],
  },
  {
    number: "02",
    title: "Define",
    copy: "We set the size, the board, and the way the box opens. The plan stays simple enough to make.",
    kicker: "[ Where the box takes shape ]",
    items: ["Size and fit", "Board and finish", "Opening"],
  },
  {
    number: "03",
    title: "Design",
    copy: "Colour, type, ribbon, and the note. Small choices that make the package feel like one gift.",
    kicker: "[ Where it looks like them ]",
    items: ["Colour", "Type and mark", "Ribbon and seal"],
  },
  {
    number: "04",
    title: "Deliver",
    copy: "We pack the finished box with a note, a spare seal, and a way to order the same again.",
    kicker: "[ Where it reaches their hands ]",
    items: ["Packed box", "Handwritten note", "Reorder card"],
  },
];

export function ProcessStage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const finaleRef = useRef<HTMLElement>(null);
  const headsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [tops, setTops] = useState<number[]>([0, 96, 192, 288]);
  const [finale, setFinale] = useState(false);

  useEffect(() => {
    const measure = () => {
      const next: number[] = [];
      let sum = barRef.current?.offsetHeight ?? 0;

      for (const head of headsRef.current) {
        next.push(sum);
        sum += head?.offsetHeight ?? 0;
      }

      setTops(next);
    };

    measure();
    window.addEventListener("resize", measure);

    const siteHeader = document.querySelector("body > div header");
    siteHeader?.setAttribute("inert", "");
    siteHeader?.setAttribute("aria-hidden", "true");

    return () => {
      window.removeEventListener("resize", measure);
      siteHeader?.removeAttribute("inert");
      siteHeader?.removeAttribute("aria-hidden");
    };
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const onMove = (event: PointerEvent) => {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      cursor.dataset.on = "true";
    };

    const onLeave = () => {
      cursor.dataset.on = "false";
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  useEffect(() => {
    const node = finaleRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFinale(entry.isIntersecting && entry.intersectionRatio > 0.45),
      { root: pageRef.current, threshold: [0, 0.45, 0.7] },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.page} ref={pageRef} data-finale={finale ? "true" : "false"}>
      <header className={styles.bar} ref={barRef}>
        <Link className={styles.logo} href="/" transitionTypes={["curtain"]}>
          Aapulki
        </Link>
        <p className={styles.pill}>
          <span className={finale ? `${styles.face} ${styles.faceOn}` : styles.face} aria-hidden="true">
            ☺
          </span>
          <span>{finale ? "From box to keepsake" : "We measure. We wrap. We tie."}</span>
        </p>
        <Link className={styles.contact} href="/about" transitionTypes={["curtain"]}>
          <span className={styles.avatar} aria-hidden="true" />
          Get in touch
        </Link>
      </header>

      <section className={styles.intro}>
        <p>
          A gift is easier to give when the box is already part of the feeling. Here is how a plain present
          becomes a package someone keeps.
        </p>
      </section>

      <div className={styles.steps}>
        {steps.map((step, index) => (
          <Fragment key={step.number}>
            <div
              className={styles.stepHead}
              ref={(node) => {
                headsRef.current[index] = node;
              }}
              style={{ top: tops[index] ?? 0, zIndex: index + 2 }}
            >
              <span className={styles.number}>{step.number}</span>
              <h2>{step.title}</h2>
              <p>{step.copy}</p>
            </div>
            <div className={styles.stepBody}>
              <p className={styles.kicker}>{step.kicker}</p>
              <ul>
                {step.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </Fragment>
        ))}
      </div>

      <section className={styles.finale} ref={finaleRef}>
        <div className={finale ? `${styles.shot} ${styles.shotClear}` : styles.shot}>
          <div className={styles.gift} aria-hidden="true">
            <span className={styles.ribbonDown} />
            <span className={styles.ribbonAcross} />
            <span className={styles.bow} />
          </div>
        </div>
      </section>

      <div className={styles.cursor} ref={cursorRef} data-on="false" aria-hidden="true">
        <svg className={styles.pointer} viewBox="0 0 16 20">
          <path d="M1 1.2 1.4 15.2 5.6 11.6 9.2 18.2 11.6 17 8 10.4 13.4 10.2Z" />
        </svg>
        <span className={styles.cursorLabel}>From box to gift</span>
      </div>
    </div>
  );
}
