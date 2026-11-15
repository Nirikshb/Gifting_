"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Window-level smooth scrolling, matching the gentle exponential easing used
 * by the reference site (Lenis, lerp ~0.1). Disabled entirely when the visitor
 * asks for reduced motion so native scrolling stays predictable.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      syncTouch: false,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Keep anchored in-page links smooth too.
    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (!(target instanceof HTMLAnchorElement)) return;
      const id = target.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      event.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -24, duration: 1.1 });
    };
    document.addEventListener("click", onClick);

    const onMotionChange = () => {
      if (reduced.matches) {
        lenis.destroy();
        cancelAnimationFrame(frame);
        document.documentElement.classList.remove("lenis", "lenis-smooth");
      }
    };
    reduced.addEventListener("change", onMotionChange);

    return () => {
      reduced.removeEventListener("change", onMotionChange);
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
