"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Loader2, CheckCircle2, Sparkles, Save } from "lucide-react";
import {
  saveWizardStep1,
  saveWizardStep2,
  saveWizardStep3,
  saveWizardStep4,
  completeWizard,
  generateCareerPassport,
} from "@/lib/actions/profile";
import { StepDirection } from "./step-direction";
import { StepBackground } from "./step-background";
import { StepStatus } from "./step-status";
import { StepAssets } from "./step-assets";
import { InsightsPanel } from "./insights-panel";
import { type WizardState, EMPTY_WIZARD_STATE } from "./types";
import type { Gender } from "@/lib/gender";

interface Props {
  /** Pre-filled state from the existing Profile row (if any). */
  initial: Partial<WizardState>;
  firstName: string;
  /** Drives gendered copy across every wizard step. */
  gender: Gender;
}

const STEPS = [
  { id: 1, title: "כיוון מקצועי",     short: "כיוון" },
  { id: 2, title: "רקע מקצועי",       short: "רקע" },
  { id: 3, title: "סטטוס חיפוש",      short: "סטטוס" },
  { id: 4, title: "נכסים מקצועיים",   short: "נכסים" },
] as const;

const STORAGE_KEY = "cif_wizard_v1";

export function JobSearchWizard({ initial, firstName, gender }: Props) {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(() => ({
    ...EMPTY_WIZARD_STATE,
    ...initial,
  }));
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [pending, startTransition] = useTransition();
  const [savedTick, setSavedTick] = useState(false);
  // After step 4 we run completeWizard + generateCareerPassport — this can
  // take 15–30s when Gemini is in the loop. Show a fullscreen overlay
  // ("יוצרים את הדרכון…") so the user knows we're working and doesn't
  // bounce. On success we hard-redirect into /skills which renders the
  // generated passport.
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // localStorage autosave — survives accidental refresh while filling.
  // Only persists fields the user typed (not the AI-loaded resumeUrl).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as Partial<WizardState>;
        setState((s) => ({ ...s, ...cached }));
      }
    } catch {
      /* ignore quota / parse errors */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  function patch(p: Partial<WizardState>) {
    setState((s) => ({ ...s, ...p }));
  }

  async function saveCurrentStep(): Promise<{ ok: boolean; error?: string }> {
    if (step === 1) {
      const r = await saveWizardStep1({
        targetRole: state.targetRole,
        industries: state.industries,
        desiredField: state.desiredField,
        region: state.region,
        workType: state.workType,
      });
      return { ok: !!r.success, error: r.error };
    }
    if (step === 2) {
      const r = await saveWizardStep2({
        currentRole: state.currentRole,
        yearsExperience: state.yearsExperience,
        strengths: state.strengths,
      });
      return { ok: !!r.success, error: r.error };
    }
    if (step === 3) {
      const r = await saveWizardStep3({
        jsActively: state.jsActively,
        jsSearchWeeks: state.jsSearchWeeks,
        jsRecentInterviews: state.jsRecentInterviews,
        jsIsApplying: state.jsIsApplying,
      });
      return { ok: !!r.success, error: r.error };
    }
    if (step === 4) {
      const r = await saveWizardStep4({
        linkedinUrl: state.linkedinUrl,
        portfolioUrl: state.portfolioUrl,
        additionalLinks: state.additionalLinks,
      });
      return { ok: !!r.success, error: r.error };
    }
    return { ok: false, error: "unknown step" };
  }

  function next() {
    startTransition(async () => {
      const r = await saveCurrentStep();
      if (!r.ok) return;
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1500);
      if (step < 4) {
        setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
        return;
      }

      // Final step: mark the wizard complete, then synchronously generate
      // the career passport so the redirect lands on a ready /skills page.
      // The previous flow showed a "well done" screen and *then* asked
      // /skills to fend for itself — but /skills with no passport row
      // sends the user back to the wizard, so Coral saw an endless loop.
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch { /* ignore */ }
      setGenerating(true);
      setGenerationError(null);
      const completeRes = await completeWizard();
      if (completeRes && "error" in completeRes && completeRes.error) {
        setGenerationError(completeRes.error);
        setGenerating(false);
        return;
      }
      const passportRes = await generateCareerPassport();
      if (passportRes && "error" in passportRes && passportRes.error) {
        setGenerationError(passportRes.error);
        setGenerating(false);
        return;
      }
      // Hard navigation so the new server-rendered /skills picks up the
      // freshly inserted CareerPassport row.
      router.replace("/skills");
    });
  }

  function back() {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
  }

  if (generating) {
    return <GeneratingOverlay firstName={firstName} error={generationError} onRetry={next} />;
  }

  // Per-step "can we move forward" gate — keep loose so the user
  // never feels blocked, but require the headline field of each step.
  const canAdvance =
    (step === 1 && state.targetRole.trim().length > 0) ||
    (step === 2 && state.currentRole.trim().length > 0) ||
    (step === 3 && state.jsActively !== "") ||
    (step === 4); // step 4 always optional

  return (
    <div className="max-w-6xl mx-auto" dir="rtl">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-7">
        <p className="text-xs font-bold text-teal uppercase tracking-wider mb-1">הגדרת חיפוש העבודה שלך</p>
        <h1 className="text-3xl font-black text-navy mb-2 leading-tight">
          {STEPS[step - 1].title}
        </h1>
        <p className="text-sm text-gray-500">
          כדי שנוכל להתאים לך משרות, תובנות והכוונה מדויקת.
        </p>
      </div>

      {/* ── Step indicator ─────────────────────────────────────── */}
      <ol className="flex items-center gap-2 mb-7" aria-label="התקדמות">
        {STEPS.map((s) => {
          const active = s.id === step;
          const completed = s.id < step;
          return (
            <li key={s.id} className="flex-1">
              <button
                type="button"
                onClick={() => completed && setStep(s.id)}
                disabled={!completed}
                className={`w-full text-right ${completed ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      active
                        ? "bg-teal text-white shadow-sm shadow-teal/30"
                        : completed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {completed ? <CheckCircle2 size={14} /> : s.id}
                  </div>
                  <span className={`text-xs font-bold hidden sm:inline ${active ? "text-navy" : "text-gray-400"}`}>
                    {s.title}
                  </span>
                </div>
                <div className={`h-1 rounded-full transition-all ${active || completed ? "bg-teal" : "bg-gray-100"}`} />
              </button>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-gray-400 mb-6 -mt-3">
        שלב {step} מתוך 4
      </p>

      {/* ── Body: form (left, ~2/3) + insights (right, ~1/3) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <section className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          {step === 1 && <StepDirection state={state} setState={patch} gender={gender} />}
          {step === 2 && <StepBackground state={state} setState={patch} gender={gender} />}
          {step === 3 && <StepStatus state={state} setState={patch} gender={gender} />}
          {step === 4 && <StepAssets state={state} setState={patch} gender={gender} />}
          {/* StepBackground takes only state+setState now; CV uploader is internal */}

          {/* Footer: nav buttons */}
          <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={back}
              disabled={step === 1 || pending}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-navy disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={15} />
              חזרה
            </button>

            <div className="flex items-center gap-3">
              {savedTick && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold">
                  <Save size={12} />
                  נשמר
                </span>
              )}
              <button
                type="button"
                onClick={next}
                disabled={!canAdvance || pending}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal text-white font-black text-sm shadow-md shadow-teal/30 hover:bg-teal-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {pending ? <Loader2 size={15} className="animate-spin" /> : null}
                {step === 4 ? "ליצירת דרכון הקריירה" : "המשך"}
                <ChevronLeft size={15} />
              </button>
            </div>
          </div>
        </section>

        <InsightsPanel state={state} currentStep={step} />
      </div>
    </div>
  );
}

// ─── Generating overlay ───────────────────────────────────────────────────────
//
// Replaces the old CompletionScreen. The user just finished the wizard and
// we're calling Gemini to build their career-passport — that's the heaviest
// AI call in the app (10–30s). A full-screen reassuring state is better
// than dropping them on a half-rendered /skills page with a "you need to
// fill the profile first" message.

function GeneratingOverlay({
  firstName,
  error,
  onRetry,
}: {
  firstName: string;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center" dir="rtl">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-3xl mb-4">
          <Sparkles size={28} className="text-rose-500" />
        </div>
        <h1 className="text-2xl font-black text-navy mb-2">משהו השתבש</h1>
        <p className="text-gray-500 leading-relaxed mb-6">
          לא הצלחנו ליצור את דרכון הקריירה עכשיו. הנתונים שלך נשמרו — אפשר לנסות שוב.
        </p>
        <p className="text-xs text-gray-400 mb-6 break-words">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-teal text-white font-black text-sm px-6 py-3 rounded-xl hover:bg-teal-dark transition-colors"
        >
          לנסות שוב
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-16 text-center" dir="rtl">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal to-emerald-400 rounded-3xl shadow-xl shadow-teal/30 mb-5">
        <Sparkles size={36} className="text-white animate-pulse" />
      </div>
      <h1 className="text-2xl font-black text-navy mb-2">
        {firstName ? `${firstName}, ` : ""}יוצרים את דרכון הקריירה שלך
      </h1>
      <p className="text-gray-500 leading-relaxed max-w-md mx-auto">
        ה-AI עובר עכשיו על הפרופיל שלך — חוזקות, פערים, התאמות לתפקידים והמלצות. זה לוקח כ-30 שניות.
      </p>
      <div className="flex items-center justify-center gap-2 mt-7 text-teal">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm font-bold">מעבד נתונים</span>
      </div>
    </div>
  );
}
