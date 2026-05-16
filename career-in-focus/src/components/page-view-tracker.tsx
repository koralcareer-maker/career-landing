"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Fires a single fire-and-forget pageview event to /api/track-view
 * whenever the route changes. Mounted once in the root layout so
 * every navigation gets logged. Zero impact on user perception.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    // sendBeacon when available — survives page unload without keeping
    // the user waiting. Falls back to fetch with keepalive.
    const body = JSON.stringify({
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });
    try {
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/track-view", blob);
      } else {
        fetch("/api/track-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // analytics is best-effort
    }
  }, [pathname]);

  return null;
}
