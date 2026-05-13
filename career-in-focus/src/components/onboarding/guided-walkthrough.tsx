"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X, ChevronLeft, CheckCircle2 } from "lucide-react";

// ─── Guided 5-step walkthrough ────────────────────────────────────────────
// Replaces the floating-tooltip tour with something more boring (and
// therefore more reliable):
//   - a single CARD pinned to the bottom-right of the viewport
//   - shows the current step's title + body + CTA button
//   - the CTA navigates to the relevant page (`/profile`, `/skills`, etc.)
//   - the matching sidebar link gets a pulsing teal ring so the member
//     can see in the chrome where the next stop lives
//   - localStorage tracks the current step; the walkthrough advances
//     when the member returns to the dashboard after visiting the page
//   - "Done" state shows a brief celebration card and then hides itself
//
// The walkthrough only renders on `/dashboard`. Once the member visits a
// step's destination page, returning to the dashboard auto-advances —
// no manual "next" button needed.

export const WALKTHROUGH_KEY = "career-in-focus:walkthrough:v1";

interface Step {
  href: string;     // route to navigate to + sidebar item to highlight
  label: string;    // sidebar item label, used to point them at it ("בסיידבר 'פרופיל'")
  title: string;
  body: string;
  ctaLabel: string;
}

const STEPS: Step[] = [
  {
    href: "/profile",
    label: "פרופיל",
    title: "🎯 שלב 1 — מלאי את הפרופיל",
    body: "בלי הפרופיל המלא ה-AI לא יודע מי את ולא יכול להמליץ בצורה מדויקת. ההשקעה הראשונית מחזירה את עצמה בכל שלב הבא.",
    ctaLabel: "פתחי את הפרופיל",
  },
  {
    href: "/skills",
    label: "מיומנויות",
    title: "🌟 שלב 2 — דרכון קריירה",
    body: "ענה על שאלון קצר — המערכת מנתחת חוזקות, פערים ותפקידים מומלצים לפי הפרופיל שלך.",
    ctaLabel: "לדרכון הקריירה",
  },
  {
    href: "/jobs",
    label: "משרות",
    title: "💼 שלב 3 — משרות מותאמות",
    body: "כל משרה מקבלת ציון התאמה אישי על בסיס הפרופיל והדרכון. המשרות המתאימות ביותר מופיעות בראש הרשימה.",
    ctaLabel: "לדף המשרות",
  },
  {
    href: "/coaching",
    label: "מאמן AI",
    title: "💬 שלב 4 — מאמן AI",
    body: "תשובה מיידית 24/7 לשאלות שלרוב אין למי לפנות איתן — כדאי להגיש? איך לנסח? איך להציג חוסר ניסיון?",
    ctaLabel: "פתחי שיחה עם המאמן",
  },
  {
    href: "/tools",
    label: "כלים",
    title: "🛠 שלב 5 — סט הכלים",
    body: "תבניות קורות חיים, מחולל הודעות למגייסים, מאגרי לינקים, וכל מה שצריך כדי לרוץ עצמאית מהיום הזה.",
    ctaLabel: "לסט הכלים",
  },
];

function readStep(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(WALKTHROUGH_KEY);
    if (raw === "done") return STEPS.length; // finished
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeStep(step: number) {
  try {
    window.localStorage.setItem(
      WALKTHROUGH_KEY,
      step >= STEPS.length ? "done" : String(step),
    );
  } catch { /* ignore */ }
}

interface Props {
  /** When true, ignore localStorage and start from step 0. */
  forceOpen?: boolean;
}

export function GuidedWalkthrough({ forceOpen }: Props) {
  const pathname = usePathname();
  const [stepIdx, setStepIdx] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);

  // ─── Initial load — figure out where the member is in the walkthrough ──
  useEffect(() => {
    if (forceOpen) {
      try { window.localStorage.removeItem(WALKTHROUGH_KEY); } catch { /* ignore */ }
      setStepIdx(0);
      setClosed(false);
      return;
    }
    setStepIdx(readStep());
  }, [forceOpen]);

  // ─── Auto-advance when the member returns to /dashboard from a step's
  //     destination. We poll `document.referrer` once on mount; if it
  //     matches the current step's href, count it as completed and bump.
  useEffect(() => {
    if (stepIdx === null || closed) return;
    if (stepIdx >= STEPS.length) return;
    if (typeof document === "undefined") return;
    try {
      const referrer = document.referrer;
      if (!referrer) return;
      const step = STEPS[stepIdx];
      const ref = new URL(referrer, window.location.origin);
      if (ref.pathname === step.href) {
        // Member just came back from the step's destination — they probably
        // had a look around. Advance to the next step.
        const next = stepIdx + 1;
        setStepIdx(next);
        writeStep(next);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Highlight the relevant sidebar item with a pulsing teal ring. We
  //     append/remove a class so we don't need to fork the sidebar code.
  useEffect(() => {
    if (stepIdx === null || closed) return;
    if (stepIdx >= STEPS.length) return;
    const step = STEPS[stepIdx];
    const el = document.querySelector<HTMLElement>(
      `[data-walkthrough-target="${step.href}"]`,
    );
    if (!el) return;
    el.classList.add("walkthrough-target-active");
    return () => { el.classList.remove("walkthrough-target-active"); };
  }, [stepIdx, closed]);

  const handleClose = useCallback(() => {
    setClosed(true);
    // Don't mark as done — closing means "remind me later", not "skip".
    // (Members can always re-open via the help / restart-tour link.)
  }, []);

  const handleSkipAll = useCallback(() => {
    writeStep(STEPS.length);
    setStepIdx(STEPS.length);
    setClosed(true);
  }, []);

  // ─── Render gate ────────────────────────────────────────────────────────
  // Only ever show on the dashboard, only when walkthrough is in progress
  // and the member hasn't manually closed it this session.
  if (pathname !== "/dashboard") return null;
  if (stepIdx === null || closed) return null;
  if (stepIdx >= STEPS.length) {
    // Done — show celebration once, then never again.
    return (
      <div className="fixed bottom-6 right-6 z-[9999] w-[min(360px,calc(100vw-32px))] bg-white rounded-2xl shadow-2xl border border-teal/30 animate-fade-in-up pointer-events-auto" dir="rtl">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-teal/15 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-teal" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-black text-navy mb-1">סיימת את הסיור 🎉</h3>
              <p className="text-sm text-navy/70 leading-relaxed">
                את מכירה את הכלים הראשיים. בכל רגע אפשר לחזור לעמוד שמסביר אותם — או לפנות למאמן AI לעזרה.
              </p>
              <button
                type="button"
                onClick={handleSkipAll}
                className="mt-3 text-xs font-bold text-teal hover:text-teal-dark"
              >
                סגירה ←
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const step = STEPS[stepIdx];

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] w-[min(360px,calc(100vw-32px))] bg-white rounded-2xl shadow-2xl border border-teal/30 animate-fade-in-up pointer-events-auto"
      dir="rtl"
      role="region"
      aria-label="סיור הכרות"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-l from-teal-pale via-white to-teal-pale border-b border-teal/15 rounded-t-2xl">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-dark">
          <Sparkles size={11} />
          שלב {stepIdx + 1} מתוך {STEPS.length}
        </span>
        <button
          type="button"
          onClick={handleClose}
          className="text-navy/40 hover:text-navy text-xs font-medium flex items-center gap-1"
          aria-label="סגור (אזכיר שוב בכניסה הבאה)"
        >
          סגור <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-base font-black text-navy mb-1.5">{step.title}</h3>
        <p className="text-sm text-navy/70 leading-relaxed">{step.body}</p>
        <p className="mt-3 text-[12px] text-navy/50">
          רואה את ההדגשה הטורקיז על &quot;{step.label}&quot; בסרגל הימני? לחיצה שם תיקח אותך לשם.
        </p>

        <Link
          href={step.href}
          className="mt-4 inline-flex items-center gap-1.5 bg-gradient-to-l from-teal to-teal-dark text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:shadow-md hover:shadow-teal/30 transition-shadow w-full justify-center"
        >
          {step.ctaLabel}
          <ChevronLeft size={14} />
        </Link>

        <button
          type="button"
          onClick={handleSkipAll}
          className="mt-3 text-[11px] text-navy/40 hover:text-navy underline block w-full text-center"
        >
          אעשה את זה לבד, סגרי את הסיור
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 px-5 pb-3">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-200 ${
              i === stepIdx ? "bg-teal" : i < stepIdx ? "bg-teal/40" : "bg-navy/15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
