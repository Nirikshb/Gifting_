"use client";

import { useEffect, useRef } from "react";

type RevealWordsProps = {
  as?: "h1" | "h2" | "p" | "span";
  text: string;
  className?: string;
  wordClassName: string;
  visibleClassName: string;
  staggerMs?: number;
  startDelayMs?: number;
};

export function RevealWords({
  as: Tag = "span",
  text,
  className,
  wordClassName,
  visibleClassName,
  staggerMs = 35,
  startDelayMs = 0,
}: RevealWordsProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const words = Array.from(el.querySelectorAll<HTMLElement>("[data-reveal-word]"));
    const show = () => {
      words.forEach((w, i) => {
        w.style.transitionDelay = `${startDelayMs + i * staggerMs}ms`;
        w.classList.add(visibleClassName);
      });
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          show();
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [staggerMs, startDelayMs, visibleClassName]);

  const tokens = text.split(/(\s+)/);

  return (
    <Tag ref={ref as never} className={className}>
      {tokens.map((token, i) =>
        /^\s+$/.test(token) ? (
          <span key={i}> </span>
        ) : (
          <span key={i} data-reveal-word className={wordClassName}>
            {token}
          </span>
        )
      )}
    </Tag>
  );
}
