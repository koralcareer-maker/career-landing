"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Fires a single fire-and-forget pageview event to /api/track-view
 * whenever the route changes. Mounted once in the root layout so
 * every navigation gets logged. Zero impact on user perception.
 *
 * Captures:
 *   - path (current URL)
 *   - referrer (document.referrer)
 *   - utm_source / utm_campaign (from the URL — survives across the
 *     SPA navigation only on first load; persisted in sessionStorage
 *     so subsequent in-app navigations keep the same attribution).
 *
 * Server-side track-view route also pulls the logged-in user from the
 * session so the admin can see WHO clicked when they're a member.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || typeof window === "undefined") return;

    // Capture / re-use UTMs across the session. First visit reads them
    // from the URL; subsequent same-session views read from storage.
    let utmSource: string | null = null;
    let utmCampaign: string | null = null;
    try {
      const url = new URL(window.location.href);
      const fromUrlSource = url.searchParams.get("utm_source");
      const fromUrlCampaign = url.searchParams.get("utm_campaign");
      if (fromUrlSource) {
        sessionStorage.setItem("utm_source", fromUrlSource);
      }
      if (fromUrlCampaign) {
        sessionStorage.setItem("utm_campaign", fromUrlCampaign);
      }
      utmSource = fromUrlSource ?? sessionStorage.getItem("utm_source");
      utmCampaign = fromUrlCampaign ?? sessionStorage.getItem("utm_campaign");
    } catch {
      // sessionStorage can be disabled (Safari private). Ignore.
    }

    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      utmSource,
      utmCampaign,
    });
    try {
      if (typeof navigator.sendBeacon === "function") {
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
