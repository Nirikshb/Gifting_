"use client";

import localFont from "next/font/local";
import { ShaderFill } from "@/src/lib/custom-effect-runtime";
import {
  manifest,
  render,
  setup,
} from "@/src/lib/custom-effects/CodeComponentId_c421a4d62d3ef0ba266d0523fef883b785f6ebbc_3160";
import styles from "./LiquidmetalButton.module.css";

const hostGrotesk = localFont({
  src: "../assets/fonts/host-grotesk/HostGrotesk-Variable.woff2",
  weight: "400 700",
  display: "swap",
});

const liquidMetalShader = {
  setup,
  render,
  manifest,
  params: {
    bands: 2.4,
    definition: 4,
    color2: { r: 0.239215686917305, g: 0.239215686917305, b: 0.239215686917305, a: 1 },
    frequency: 0.1,
    speed: 1.6,
    exposure: 1.1,
    saturation: 1,
    contrastAmt: 1.1,
    amplitude: 0.6,
    color1: { r: 0.054901961237192154, g: 0.054901961237192154, b: 0.054901961237192154, a: 1 },
    color3: { r: 0.5568627715110779, g: 0.5568627715110779, b: 0.5568627715110779, a: 1 },
    grain: 0.16,
    color4: { r: 0.8039215803146362, g: 0.8039215803146362, b: 0.8039215803146362, a: 1 },
    featureScale: 0.4,
    seed: 32,
  },
};

export function LiquidmetalButton() {
  return (
    <button className={`${styles.button} ${hostGrotesk.className}`} type="button">
      <ShaderFill className={styles.fill} shader={liquidMetalShader} />
      <span className={styles.label}>Liquidmetal</span>
      <span className={styles.rim} aria-hidden="true" />
    </button>
  );
}
