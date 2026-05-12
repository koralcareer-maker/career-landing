"use client";

// Top loading bar that flashes during route transitions — like Linear,
// Vercel, GitHub. Pure CSS animation, no NProgress dependency.
//
// Triggered by the React `useLinkStatus` hook, which Next.js 16 exposes
// as the supported way to react to <Link> pending states. We wrap the
// status in a portal-style fixed bar at the top so the bar is universal:
// every <Link> click instantly shows the bar without per-link wiring.
//
// Falls back gracefully on browsers that don't support it — the bar
// just stays at 0% width.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NavProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  // pathname changes *after* the navigation completes, so we use it to
  // hide the bar. The bar is shown by a global click listener (below)
  // the moment a same-origin link is activated — this catches both
  // <Link> and plain <a> clicks.
  useEffect(() => {
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest("a");
      if (!target) return;
      // Only same-origin, same-tab navigations
      if (
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      // Show the bar; pathname change effect above hides it again
      setVisible(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="טעינת עמוד"
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none"
    >
      <div className="h-full bg-teal animate-nav-progress origin-right" />
    </div>
  );
}
