"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

// ─── Generic onboarding tour ──────────────────────────────────────────────
// Bottom-sheet design: the explanation card is always anchored to the bottom
// center of the viewport, so the next/skip buttons are always reachable
// regardless of where the target element actually lives on the page. The
// previous "tooltip next to target" approach kept rendering off-screen for
// real users — calling `getBoundingClientRect` while body scroll is locked,
// or before the layout settled, would put the card hundreds of pixels above
// the target and you couldn't reach "המשך".
//
// The targeted element still gets a visual cue: we scroll it into the
// upper third of the viewport and draw a pulsing teal ring around it via
// a fixed overlay (no backdrop cutout — keeps the layout simple).

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

// Visual padding for the spotlight ring around the target.
const RING_PADDING = 8;

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

  // ─── Scroll target into view + track its rect for the spotlight ring ──
  const updateTarget = useCallback(() => {
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

  useEffect(() => {
    if (!isOpen) return;
    const step = steps[stepIdx];
    if (!step?.targetId) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`);
    if (!el) { setRect(null); return; }

    // Scroll the target so it sits in the upper third of the viewport,
    // leaving plenty of room below for the explanation sheet. Using
    // window.scrollTo (not element.scrollIntoView) because the element's
    // scroll container may have been locked elsewhere.
    const r = el.getBoundingClientRect();
    const desiredTopInViewport = Math.round(window.innerHeight * 0.18);
    const scrollDelta = r.top - desiredTopInViewport;
    if (Math.abs(scrollDelta) > 20) {
      window.scrollBy({ top: scrollDelta, behavior: "smooth" });
    }

    // Measure once the scroll has settled.
    const tick = window.setTimeout(updateTarget, 450);
    return () => window.clearTimeout(tick);
  }, [isOpen, stepIdx, steps, updateTarget]);

  // Keep the ring in sync with scroll / resize while the tour is open.
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => updateTarget();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [isOpen, updateTarget]);

  // Keyboard nav: Esc to skip, ←/→ to navigate (RTL — right is "back")
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      else if (e.key === "ArrowRight") prev();
      else if (e.key === "ArrowLeft") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, stepIdx]);

  function close(completed: boolean) {
    // Persist a flag so the tour doesn't pester the member every load.
    // "1" = finished all steps, "skipped" = closed early. Either way,
    // we don't reopen automatically.
    try {
      window.localStorage.setItem(storageKey, completed ? "1" : "skipped");
    } catch { /* ignore */ }
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

  const isFirstStep = stepIdx === 0;
  const isLastStep = stepIdx === steps.length - 1;
  const hasTarget = !!rect;

  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="סיור הכרות"
    >
      {/* ─── Soft dim — clickable to close. Lets you still read the page. ── */}
      <button
        type="button"
        onClick={() => close(false)}
        aria-label="סגור סיור"
        className="absolute inset-0 bg-navy/30 backdrop-blur-[1px] pointer-events-auto"
      />

      {/* ─── Spotlight ring around target (no backdrop cutout — simpler). ── */}
      {hasTarget && rect && (
        <div
          aria-hidden
          className="absolute pointer-events-none rounded-2xl ring-4 ring-teal shadow-[0_0_60px_15px_rgba(62,207,207,0.6)] animate-pulse transition-all duration-300"
          style={{
            left: rect.left - RING_PADDING,
            top: rect.top - RING_PADDING,
            width: rect.width + RING_PADDING * 2,
            height: rect.height + RING_PADDING * 2,
          }}
        />
      )}

      {/* ─── Bottom sheet — always at the viewport bottom, always reachable. ── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-4 sm:bottom-6 w-[min(420px,calc(100vw-24px))] bg-white rounded-2xl shadow-2xl border border-teal/30 pointer-events-auto animate-fade-in-up"
        style={{ maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-l from-teal-pale via-white to-teal-pale border-b border-teal/15 rounded-t-2xl">
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

        {/* Nav buttons — sticky so they NEVER get cut off */}
        <div className="flex items-center justify-between px-3 py-2 bg-navy/[0.02] border-t border-navy/5 sticky bottom-0 rounded-b-2xl">
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
