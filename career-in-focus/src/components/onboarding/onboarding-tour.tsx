"use client";

import { useEffect, useState, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

// ─── Generic onboarding tour component ────────────────────────────────────
// Spotlights one element at a time, shows a tooltip with explanation, and
// remembers completion in localStorage so a member only sees it once.

const PADDING = 12;          // visual padding around the spotlit element
const TIP_WIDTH = 320;       // tooltip card width in px

export interface TourStep {
  /** matches the `data-tour-id` attribute on the element to highlight */
  targetId?: string;
  title: string;
  body: string;
  /** optional CTA that closes the tour and navigates */
  cta?: { label: string; href: string };
}

interface Props {
  /** unique key per tour so different tours don't clobber each other */
  storageKey: string;
  steps: TourStep[];
  /** when true, ignore the localStorage flag and always render */
  forceOpen?: boolean;
  /** called when the user closes the tour for any reason */
  onClose?: () => void;
}

export function OnboardingTour({ storageKey, steps, forceOpen, onClose }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // ─── Open on mount if not previously completed ────────────────────────
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setStepIdx(0);
      return;
    }
    try {
      const completed = window.localStorage.getItem(storageKey);
      if (!completed) setIsOpen(true);
    } catch {
      // localStorage may be blocked — open the tour anyway, no harm done
      setIsOpen(true);
    }
  }, [forceOpen, storageKey]);

  // ─── Compute the bounding rect of the current target element ─────────
  const computeRect = useCallback(() => {
    if (!isOpen) return;
    const step = steps[stepIdx];
    if (!step?.targetId) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    setRect(el.getBoundingClientRect());
  }, [isOpen, stepIdx, steps]);

  // Scroll the target into view, then measure
  useLayoutEffect(() => {
    if (!isOpen) return;
    const step = steps[stepIdx];
    if (!step?.targetId) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    // Wait for the smooth scroll to settle before measuring
    const t = window.setTimeout(computeRect, 450);
    return () => window.clearTimeout(t);
  }, [isOpen, stepIdx, steps, computeRect]);

  // Keep the spotlight in sync with viewport changes
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("resize", computeRect);
    window.addEventListener("scroll", computeRect, true);
    return () => {
      window.removeEventListener("resize", computeRect);
      window.removeEventListener("scroll", computeRect, true);
    };
  }, [isOpen, computeRect]);

  // Lock body scroll while the tour is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Keyboard nav: Esc to skip, ←/→ to navigate
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      else if (e.key === "ArrowRight") prev();          // RTL — right is "back"
      else if (e.key === "ArrowLeft") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stepIdx]);

  function close(completed: boolean) {
    if (completed) {
      try { window.localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    }
    setIsOpen(false);
    onClose?.();
  }

  function next() {
    if (stepIdx >= steps.length - 1) close(true);
    else setStepIdx((s) => s + 1);
  }

  function prev() {
    if (stepIdx > 0) setStepIdx((s) => s - 1);
  }

  if (!isOpen) return null;
  const step = steps[stepIdx];
  if (!step) return null;

  const hasTarget = !!rect;
  const spotX = rect ? rect.left - PADDING : 0;
  const spotY = rect ? rect.top - PADDING : 0;
  const spotW = rect ? rect.width + PADDING * 2 : 0;
  const spotH = rect ? rect.height + PADDING * 2 : 0;

  // Tooltip position — try below the target, fall back above. We assume an
  // upper bound of ~400px on the tooltip's natural height; combined with
  // max-height: calc(100vh - 32px) + overflow-y: auto on the card itself,
  // the tooltip is always reachable even with long body copy.
  const TIP_HEIGHT_ESTIMATE = 400;
  let tipX = 16;
  let tipY = 16;
  if (rect && typeof window !== "undefined") {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const widthOnScreen = Math.min(TIP_WIDTH, vw - 32);
    tipX = rect.left + rect.width / 2 - widthOnScreen / 2;
    tipX = Math.max(16, Math.min(vw - widthOnScreen - 16, tipX));
    // Try below
    tipY = rect.bottom + 16;
    if (tipY + TIP_HEIGHT_ESTIMATE > vh - 16) {
      // Try above
      const aboveY = rect.top - TIP_HEIGHT_ESTIMATE - 16;
      // If neither below nor above fits, anchor at the top of the viewport
      // (the card's own internal scroll lets the user reach the buttons).
      tipY = aboveY > 16 ? aboveY : 16;
    }
    // Final clamp — never let the card start below the visible viewport.
    tipY = Math.max(16, Math.min(vh - 80, tipY));
  } else if (typeof window !== "undefined") {
    // Centered when no target
    const vh = window.innerHeight;
    const widthOnScreen = Math.min(TIP_WIDTH, window.innerWidth - 32);
    tipX = (window.innerWidth - widthOnScreen) / 2;
    tipY = Math.max(16, vh / 2 - TIP_HEIGHT_ESTIMATE / 2);
  }

  const isFirstStep = stepIdx === 0;
  const isLastStep = stepIdx === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[9999]" dir="rtl" role="dialog" aria-modal="true">
      {/* ─── Backdrop — SVG mask cuts a hole around the target ─── */}
      {hasTarget ? (
        <svg
          className="absolute inset-0 w-full h-full"
          onClick={() => close(false)}
          aria-hidden
        >
          <defs>
            <mask id={`tour-mask-${storageKey}`}>
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={spotX} y={spotY} width={spotW} height={spotH} rx={16}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%" height="100%"
            fill="rgba(28,28,46,0.7)"
            mask={`url(#tour-mask-${storageKey})`}
          />
        </svg>
      ) : (
        <div
          className="absolute inset-0 bg-navy/70 cursor-pointer"
          onClick={() => close(false)}
          aria-label="סגור סיור"
        />
      )}

      {/* ─── Spotlight pulse ring ─── */}
      {hasTarget && (
        <div
          aria-hidden
          className="absolute pointer-events-none rounded-2xl ring-4 ring-teal shadow-[0_0_60px_10px_rgba(62,207,207,0.5)] animate-pulse"
          style={{ left: spotX, top: spotY, width: spotW, height: spotH }}
        />
      )}

      {/* ─── Tooltip card ─── */}
      {/* max-height + overflow-y so a long body never makes the card extend
          past the viewport with no way to reach the bottom (the body scroll
          is locked while the tour is open). */}
      <div
        className="absolute bg-white rounded-2xl shadow-2xl border border-teal/30 animate-fade-in-up"
        style={{
          left: tipX,
          top: tipY,
          width: `min(${TIP_WIDTH}px, calc(100vw - 32px))`,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-l from-teal-pale via-white to-teal-pale border-b border-teal/15">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-dark">
            <Sparkles size={11} />
            צעד {stepIdx + 1} / {steps.length}
          </span>
          <button
            type="button"
            onClick={() => close(false)}
            className="text-navy/40 hover:text-navy text-xs font-medium flex items-center gap-1"
            aria-label="דלג על הסיור"
          >
            דלג <X size={12} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <h3 className="text-base font-black text-navy mb-1.5">{step.title}</h3>
          <p className="text-sm text-navy/70 leading-relaxed whitespace-pre-line">{step.body}</p>

          {step.cta && (
            <Link
              href={step.cta.href}
              onClick={() => close(true)}
              className="mt-4 inline-flex items-center gap-1.5 bg-gradient-to-l from-teal to-teal-dark text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:shadow-md hover:shadow-teal/30 transition-shadow"
            >
              {step.cta.label}
              <ChevronLeft size={14} />
            </Link>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-3">
          {steps.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === stepIdx ? "bg-teal w-5" : i < stepIdx ? "bg-teal/40 w-1.5" : "bg-navy/15 w-1.5"
              }`}
            />
          ))}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between px-3 py-2 bg-navy/[0.02] border-t border-navy/5">
          <button
            type="button"
            onClick={prev}
            disabled={isFirstStep}
            className="text-xs font-bold text-navy/60 px-3 py-1.5 rounded-lg hover:bg-navy/5 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronRight size={12} />
            הקודם
          </button>
          <button
            type="button"
            onClick={next}
            className="text-xs font-bold bg-teal text-white px-4 py-2 rounded-lg hover:bg-teal-dark transition-colors flex items-center gap-1.5 shadow-sm"
          >
            {isLastStep ? "סיימתי 🎉" : "הבא"}
            {!isLastStep && <ChevronLeft size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}
