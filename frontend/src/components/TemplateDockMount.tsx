"use client";

import dynamic from "next/dynamic";

/**
 * The dock is client-only: nothing dock-related ships in the SSR HTML, so it
 * never participates in LCP or hydrates against server markup. Once the chunk
 * loads on the client, the pill slides up from the bottom edge (see the
 * dock-enter animation in TemplateDock.module.css).
 */
const TemplateDock = dynamic(() => import("./TemplateDock").then((m) => m.TemplateDock), {
  ssr: false,
});

export function TemplateDockMount() {
  return <TemplateDock />;
}
