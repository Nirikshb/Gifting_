"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { subscribeConsent } from "./consent";
import { trackRoute } from "./events";

export function PageViews() {
  const pathname = usePathname();

  useEffect(() => {
    trackRoute(pathname);
    return subscribeConsent(() => {
      trackRoute(pathname);
    });
  }, [pathname]);

  return null;
}
