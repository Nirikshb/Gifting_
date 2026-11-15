"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import styles from "./SignatureSequence.module.css";

const sequence = [
  {
    image: "/gifting/14365405.jpg",
    alt: "A woven gifting basket filled with small ribbon-tied presents",
    title: "It starts with a little wonder.",
    text: "The first glimpse: colour, texture, and the promise of something chosen just for them.",
  },
  {
    image: "/gifting/6102479.jpg",
    alt: "An overhead arrangement of gifts wrapped in red, blush and gold",
    title: "Then, the thoughtful details.",
    text: "A favourite shade. A familiar ribbon. All the small things that make it feel personal.",
  },
  {
    image: "/gifting/6102096.jpg",
    alt: "A single present wrapped in white paper and a vivid red bow",
    title: "And finally, all theirs.",
    text: "A keepsake of a moment, ready to make its way into their hands.",
  },
];

export default function SignatureSequence() {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  // One calm crossfade per 100vh block. No spring, no scale, no clipping —
  // the reference only changes opacity while the image column stays pinned.
  const storyOne = useTransform(scrollYProgress, [0, 0.02, 0.22, 0.34], [1, 1, 1, 0]);
  const storyTwo = useTransform(scrollYProgress, [0.27, 0.4, 0.6, 0.73], [0, 1, 1, 0]);
  const storyThree = useTransform(scrollYProgress, [0.66, 0.79, 1, 1], [0, 1, 1, 1]);

  const imageOne = useTransform(scrollYProgress, [0, 0.25, 0.36], [1, 1, 0]);
  const imageTwo = useTransform(scrollYProgress, [0.3, 0.42, 0.62, 0.73], [0, 1, 1, 0]);
  const imageThree = useTransform(scrollYProgress, [0.67, 0.79, 1, 1], [0, 1, 1, 1]);

  const storyOpacities = [storyOne, storyTwo, storyThree];
  const imageOpacities = [imageOne, imageTwo, imageThree];

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
                <Image src={step.image} alt="" fill sizes="(max-width: 809px) 92vw, 40vw" />
              </figure>
            </article>
          ))}
        </div>

        <div className={styles.visual} aria-hidden="true">
          <div className={styles.visualInner}>
            {sequence.map((step, index) => (
              <motion.figure
                className={styles.frame}
                key={step.image}
                style={reduceMotion ? undefined : { opacity: imageOpacities[index] }}
              >
                <Image src={step.image} alt={step.alt} fill sizes="(max-width: 809px) 92vw, 46vw" />
              </motion.figure>
            ))}
            <span className={styles.caption}>A little wonder, wrapped with care</span>
          </div>
        </div>
      </div>
    </section>
  );
}
