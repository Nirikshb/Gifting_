"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  masked?: boolean;
};

export function Reveal({ children, className, delay = 0, masked = false }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={masked
        ? { opacity: 0.7, clipPath: "inset(12% 0 0 0)", scale: 1.025 }
        : { opacity: 0, y: 24 }}
      whileInView={masked
        ? { opacity: 1, clipPath: "inset(0% 0 0 0)", scale: 1 }
        : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.05, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}