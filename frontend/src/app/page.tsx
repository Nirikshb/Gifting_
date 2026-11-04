"use client";

import { useState, ViewTransition } from "react";
import { LiquidmetalButton } from "./LiquidmetalButton";
import styles from "./page.module.css";

const slides = [
  {
    title: "Life Of The Wild",
    coverLead: "Life Of",
    coverAccent: "The",
    coverRest: "Wild",
    author: "Sanchit Howdy",
    copy: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu feugiat amet, libero ipsum enim pharetra hac. Urna commodo, lacus ut magna velit eleifend. Amet, quis urna, a eu.",
  },
  {
    title: "Birds gonna be Happy",
    coverLead: "Birds gonna be",
    coverAccent: "Happy",
    coverRest: "",
    author: "Timbur Hood",
    copy: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eu feugiat amet, libero ipsum enim pharetra hac. Urna commodo, lacus ut magna velit eleifend. Amet, quis urna, a eu.",
  },
];

export default function Home() {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  function show(nextIndex) {
    setIndex((nextIndex + count) % count);
  }

  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
    <div className={styles.pageFill}>
    <section className={styles.hero} aria-roledescription="carousel" aria-label="Featured books">
      <button
        className={`${styles.arrow} ${styles.arrowLeft}`}
        type="button"
        aria-label="Previous slide"
        onClick={() => show(index - 1)}
      >
        <ArrowIcon direction="left" />
      </button>

      <div className={styles.viewport}>
        <div
          className={styles.track}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide) => (
            <article className={styles.slide} key={slide.title}>
              <div className={styles.copy}>
                <h1>{slide.title}</h1>
                <p>{slide.copy}</p>
                <div className={styles.cta}>
                  <LiquidmetalButton />
                </div>
                <div className={styles.dots}>
                  {slides.map((item, dotIndex) => (
                    <button
                      key={item.title}
                      className={dotIndex === index ? styles.dotActive : styles.dot}
                      type="button"
                      aria-label={`Show ${item.title}`}
                      aria-current={dotIndex === index ? "true" : undefined}
                      onClick={() => show(dotIndex)}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.stage}>
                <BookCover slide={slide} />
              </div>
            </article>
          ))}
        </div>
      </div>

      <button
        className={`${styles.arrow} ${styles.arrowRight}`}
        type="button"
        aria-label="Next slide"
        onClick={() => show(index + 1)}
      >
        <ArrowIcon direction="right" />
      </button>

    </section>
    </div>
    </ViewTransition>
  );
}

function BookCover({ slide }) {
  return (
    <div className={styles.book}>
      <p className={styles.coverTitle}>
        {slide.coverLead} <span>{slide.coverAccent}</span> {slide.coverRest}
      </p>
      <Birds />
      <p className={styles.coverAuthor}>- {slide.author}</p>
    </div>
  );
}

function Birds() {
  return (
    <svg className={styles.birds} viewBox="0 0 220 250" aria-hidden="true">
      <path d="M18 150c36-28 62-16 86 4 22 18 40 14 62-8 18-16 40-10 54 8" />
      <path d="M70 138c8 22 4 48-10 72M124 132c10 26 6 52-8 78M164 146c12 20 8 46-2 68" />
      <path d="M86 126c22-14 36-2 28 16-20 2-34-2-28-16z" />
      <path d="M112 104c24-16 40 0 30 18-22 4-38-2-30-18z" />
      <path d="M148 86c20-16 36-2 26 16-20 6-34 0-26-16z" />
      <path d="M96 118c-16-8-22 6-8 14M124 96c-16-8-20 8-6 14M158 80c-14-8-18 8-4 12" />
      <circle cx="104" cy="122" r="2.1" />
      <circle cx="132" cy="100" r="2.1" />
      <circle cx="164" cy="84" r="2.1" />
    </svg>
  );
}

function ArrowIcon({ direction }) {
  const points = direction === "left" ? "14 5 7 12 14 19" : "10 5 17 12 10 19";

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}
