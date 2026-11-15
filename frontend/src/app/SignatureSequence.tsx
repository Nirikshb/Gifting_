"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./SignatureSequence.module.css";

const sequence = [
  {
    image: "/gifting/ritual-boxes.jpg",
    focal: "center 46%",
    alt: "Red parcels tied with ribbon and stacked beneath a scattering of gold light",
    title: "It starts with a little wonder.",
    text: "The first glimpse: colour, texture, and the promise of something chosen just for them.",
  },
  {
    image: "/gifting/ritual-velvet.jpg",
    focal: "center 52%",
    alt: "Deep red velvet bows gathered around a black bottle and a printed box",
    title: "Then, the thoughtful details.",
    text: "A favourite shade. A familiar ribbon. All the small things that make it feel personal.",
  },
  {
    image: "/gifting/ritual-arranging.jpg",
    focal: "center 56%",
    alt: "Hands arranging pale bottles and gold ornaments inside a white gift box",
    title: "And finally, all theirs.",
    text: "A keepsake of a moment, ready to make its way into their hands.",
  },
];

const fade = (progress: number, start: number, end: number) =>
  Math.min(1, Math.max(0, (progress - start) / (end - start)));

export default function SignatureSequence() {
  const trackRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const visual = visualRef.current;
    if (!track || !visual) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress =
        scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;

      // One calm crossfade per story. The copy itself stays still.
      const first = 1 - fade(progress, 0.25, 0.36);
      const second = fade(progress, 0.3, 0.42) * (1 - fade(progress, 0.62, 0.73));
      const third = fade(progress, 0.67, 0.79);

      visual.style.setProperty("--o1", first.toFixed(3));
      visual.style.setProperty("--o2", second.toFixed(3));
      visual.style.setProperty("--o3", third.toFixed(3));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className={styles.section} aria-labelledby="sequence-title">
      <div className={styles.head}>
        <p className={styles.eyebrow}>The Aapulki ritual</p>
        <h2 id="sequence-title">
          A gift is a feeling,
          <br />
          <em>in the making.</em>
        </h2>
      </div>

      <div className={styles.track} ref={trackRef}>
        <div className={styles.stories}>
          {sequence.map((step, index) => (
            <article className={styles.story} key={step.title}>
              <span className={styles.number}>0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <figure className={styles.storyPhoto} aria-hidden="true">
                <Image
                  src={step.image}
                  alt=""
                  fill
                  sizes="(max-width: 809px) 92vw, 40vw"
                  style={{ objectPosition: step.focal }}
                />
              </figure>
            </article>
          ))}
        </div>

        <div className={styles.visual} aria-hidden="true">
          <div className={styles.visualInner} ref={visualRef}>
            {sequence.map((step) => (
              <figure className={styles.frame} key={step.image}>
                <Image
                  src={step.image}
                  alt={step.alt}
                  fill
                  sizes="(max-width: 809px) 92vw, 46vw"
                  style={{ objectPosition: step.focal }}
                />
              </figure>
            ))}
            <span className={styles.caption}>A little wonder, wrapped with care</span>
          </div>
        </div>
      </div>
    </section>
  );
}
