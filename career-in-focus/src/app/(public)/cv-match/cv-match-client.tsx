"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Sparkles, Upload, FileText, Loader2, CheckCircle2, AlertTriangle,
  ArrowLeft, TrendingUp, Lock, Share2, Briefcase, Target,
  Compass, Lightbulb, Award, Zap, Trophy,
} from "lucide-react";
import type { CvMatchResult } from "@/lib/cv-match-analyzer";

/**
 * Free CV-Match UI — the public lead magnet. Three states:
 *
 *   1. Empty — form with two big input zones (CV + job description).
 *      Hero copy frames the value: "תוך 15 שניות תקבלי...".
 *   2. Loading — animated state ("מנתחים את הקורות חיים..."), no
 *      score yet. Designed to feel like AI is genuinely thinking.
 *   3. Result — the money screen: huge animated score ring, verdict
 *      callout, 3 strength tiles, 3 gap tiles with severity colour,
 *      "your biggest lever" panel, and the LOCKED premium teaser
 *      that reveals what the paid platform delivers + a CTA bar.
 *
 * No login wall before results — Coral wants the value to be felt
 * first, then the CTA pulls them in.
 */

const TIER_LABELS: Record<string, string> = {
  "התאמה גבוהה": "text-emerald-600",
  "התאמה חלקית": "text-amber-600",
  "התאמה נמוכה": "text-rose-600",
  "לא מתאים": "text-rose-700",
};

export function CvMatchClient() {
  const [cvText, setCvText] = useState("");
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobText, setJobText] = useState("");
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");

  const [result, setResult] = useState<CvMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | null) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("הקובץ גדול מ-8MB — נסי להמיר ל-PDF דחוס יותר");
      return;
    }
    setCvFile(file);
    setCvFileName(file.name);
    setError(null);
  }

  async function submit() {
    setError(null);
    if (inputMode === "paste" && cvText.trim().length < 50) {
      setError("הדביקי את כל הקו\"ח (לפחות 50 תווים)");
      return;
    }
    if (inputMode === "upload" && !cvFile) {
      setError("יש להעלות קובץ קו\"ח");
      return;
    }
    if (jobText.trim().length < 30) {
      setError("הדביקי את כל תיאור המשרה (לפחות 30 תווים)");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (inputMode === "upload" && cvFile) {
        formData.append("cv", cvFile);
      } else {
        formData.append("cvText", cvText);
      }
      formData.append("jobText", jobText);

      const res = await fetch("/api/cv-match", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "ניתוח נכשל. נסי שוב.");
        return;
      }
      setResult(data.result);
      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch {
      setError("שגיאת רשת. נסי שוב בעוד דקה.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function shareResult() {
    const text = result
      ? `קיבלתי ${result.score}% התאמה למשרה אחרונה בכלי AI חינמי של @קריירה_בפוקוס. בדקו את שלכם 👇 https://app.careerinfocus.co.il/cv-match`
      : "";
    if (navigator.share) {
      navigator.share({ title: "בדיקת התאמת קו\"ח", text }).catch(() => {});
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text)}`,
        "_blank",
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-white to-cream" dir="rtl">
      {/* ─── Top nav ──────────────────────────── */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-black/5 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center text-white font-bold text-sm">ק</div>
            <span className="font-bold text-navy">קריירה בפוקוס</span>
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-semibold text-navy hover:text-teal-dark"
          >
            על הפלטפורמה
          </Link>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────── */}
      {!result && (
        <section className="px-5 pt-12 pb-6 max-w-5xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-teal/10 text-teal-dark font-bold text-xs px-3 py-1.5 rounded-full mb-5">
            <Sparkles size={12} />
            כלי AI חינמי · ללא הרשמה
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-navy leading-[1.1] mb-5">
            הקו&quot;ח שלך באמת<br />
            <span className="bg-gradient-to-l from-teal-dark to-teal bg-clip-text text-transparent">
              מתאימים למשרה?
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
            תוך 15 שניות תקבלי <strong className="text-navy">ציון התאמה אמיתי</strong>,
            את 3 החוזקות הקריטיות, את הפערים שמעכבים אותך, וצעדים קונקרטיים להעלאת
            הסיכוי לראיון.
          </p>
          <p className="text-xs text-slate-500 mt-3 max-w-md mx-auto">
            ⚡ ניתוח ע&quot;י AI מקצועי על בסיס 15 שנות ניסיון בגיוס בישראל. ללא הרשמה. ללא מייל.
          </p>
        </section>
      )}

      {/* ─── Form ─────────────────────────────── */}
      {!result && (
        <section className="px-5 pb-12 max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
            {/* Step 1: CV input */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal text-white text-sm font-bold">
                  1
                </span>
                <h2 className="text-lg font-black text-navy">קורות החיים שלך</h2>
              </div>

              <div className="flex items-center gap-2 mb-3 text-sm">
                <button
                  type="button"
                  onClick={() => setInputMode("upload")}
                  aria-pressed={inputMode === "upload"}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-colors ${
                    inputMode === "upload"
                      ? "bg-navy text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  📎 העלאת קובץ
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("paste")}
                  aria-pressed={inputMode === "paste"}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition-colors ${
                    inputMode === "paste"
                      ? "bg-navy text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ✍ הדבקת טקסט
                </button>
              </div>

              {inputMode === "upload" ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFile(e.dataTransfer.files?.[0] ?? null);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                    cvFileName
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-300 hover:border-teal hover:bg-teal/5"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  {cvFileName ? (
                    <>
                      <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={28} aria-hidden="true" />
                      <p className="font-bold text-emerald-900 text-sm">{cvFileName}</p>
                      <p className="text-xs text-emerald-700 mt-1">לחיצה להחלפה</p>
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto mb-3 text-slate-400" size={28} aria-hidden="true" />
                      <p className="font-bold text-navy">העלי PDF או DOCX</p>
                      <p className="text-xs text-slate-500 mt-1">או גררי לכאן · עד 8MB</p>
                    </>
                  )}
                </div>
              ) : (
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  placeholder="העתיקי את כל תוכן הקורות חיים — שם, תפקידים, ניסיון, השכלה, מיומנויות..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none text-sm resize-y"
                />
              )}
            </div>

            {/* Step 2: Job description */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal text-white text-sm font-bold">
                  2
                </span>
                <h2 className="text-lg font-black text-navy">תיאור המשרה</h2>
              </div>
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="העתיקי את התיאור המלא של המשרה — שם החברה, התפקיד, דרישות, תיאור היום-יום..."
                rows={6}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none text-sm resize-y"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                💡 ככל שתיאור המשרה מלא יותר — הניתוח מדויק יותר
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3"
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="w-full bg-gradient-to-l from-navy to-teal-dark hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg px-6 py-4 rounded-2xl shadow-xl shadow-teal/20 transition-all focus:outline-none focus:ring-4 focus:ring-teal/40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                  מנתחים את הקורות חיים שלך…
                </>
              ) : (
                <>
                  <Zap size={20} aria-hidden="true" />
                  קבלי את הניתוח שלך עכשיו
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-slate-500">
              הקובץ שלך לא נשמר אצלנו. הניתוח רץ באופן אנונימי.
            </p>
          </div>
        </section>
      )}

      {/* ─── Result ─────────────────────────────── */}
      {result && (
        <>
          <div id="result-anchor" />
          <ResultView result={result} onReset={reset} onShare={shareResult} />
        </>
      )}
    </div>
  );
}

// ─── Result view (long, but self-contained) ────────────────────────

function ResultView({
  result, onReset, onShare,
}: {
  result: CvMatchResult;
  onReset: () => void;
  onShare: () => void;
}) {
  const labelClass =
    Object.entries(TIER_LABELS).find(([k]) => result.matchLabel?.includes(k))?.[1] ??
    "text-slate-600";

  const scoreColor =
    result.score >= 80 ? "stroke-emerald-500" :
    result.score >= 65 ? "stroke-teal" :
    result.score >= 50 ? "stroke-amber-500" :
    "stroke-rose-500";

  return (
    <div className="px-5 py-8 max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* ─── Score hero ───────────────────────── */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 text-center relative overflow-hidden">
        {/* Decorative gradient blobs */}
        <div aria-hidden="true" className="absolute -top-24 -right-24 w-64 h-64 bg-teal/10 rounded-full blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl" />

        <div className="relative">
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${labelClass}`}>
            {result.matchLabel}
          </p>

          {/* Animated score ring */}
          <div className="relative w-44 h-44 sm:w-56 sm:h-56 mx-auto mb-5">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="42" stroke="#e2e8f0" strokeWidth="8" fill="none" />
              <circle
                cx="50" cy="50" r="42"
                strokeWidth="8" fill="none"
                strokeLinecap="round"
                className={scoreColor}
                style={{
                  strokeDasharray: `${2 * Math.PI * 42}`,
                  strokeDashoffset: `${2 * Math.PI * 42 * (1 - result.score / 100)}`,
                  transition: "stroke-dashoffset 1.2s ease-out",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl sm:text-7xl font-black text-navy leading-none">
                {result.score}
              </span>
              <span className="text-base text-slate-500 mt-1">/100</span>
            </div>
          </div>

          <p className="text-lg sm:text-xl text-navy max-w-2xl mx-auto leading-relaxed font-medium">
            {result.verdict}
          </p>
          <p className="text-sm text-slate-500 mt-3">
            <Trophy size={14} className="inline-block mb-0.5 ml-1" aria-hidden="true" />
            {result.candidateRank}
          </p>
        </div>
      </section>

      {/* ─── Strengths ───────────────────────── */}
      <section>
        <h2 className="text-lg font-black text-navy mb-3 flex items-center gap-2">
          <Award size={18} className="text-emerald-600" aria-hidden="true" />
          החוזקות שלך
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {result.strengths.map((s, i) => (
            <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="font-black text-emerald-900 text-sm leading-snug">{s.title}</p>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed pr-7">{s.proof}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Gaps ───────────────────────── */}
      <section>
        <h2 className="text-lg font-black text-navy mb-3 flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-600" aria-hidden="true" />
          מה מעכב אותך
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {result.gaps.map((g, i) => {
            const sev =
              g.severity === "high"
                ? { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", icon: "text-rose-600", label: "קריטי" }
                : g.severity === "medium"
                ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", icon: "text-amber-600", label: "חשוב" }
                : { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-900", icon: "text-slate-600", label: "כדאי" };
            return (
              <div key={i} className={`${sev.bg} ${sev.border} border rounded-2xl p-4`}>
                <div className="flex items-start gap-2 mb-1.5">
                  <AlertTriangle size={18} className={`${sev.icon} shrink-0 mt-0.5`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm leading-snug ${sev.text}`}>{g.title}</p>
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider mt-0.5 ${sev.icon}`}>
                      {sev.label}
                    </span>
                  </div>
                </div>
                <p className={`text-xs leading-relaxed mt-2 pr-7 ${sev.text} opacity-80`}>{g.why}</p>
                <p className={`text-xs leading-relaxed mt-2 pr-7 font-semibold ${sev.text}`}>
                  💡 {g.action}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Top lever ───────────────────────── */}
      <section className="bg-gradient-to-l from-teal-dark to-teal text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm shrink-0">
            <TrendingUp size={22} aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
              ההזדמנות הכי גדולה שלך
            </p>
            <p className="text-lg sm:text-xl font-bold leading-relaxed">
              {result.topLever}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Locked premium teaser + CTA ─────── */}
      <section className="bg-white rounded-3xl border-2 border-teal/30 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a] text-white p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-teal mb-2 flex items-center gap-1.5">
            <Lock size={12} aria-hidden="true" />
            הצעד הבא ב-קריירה בפוקוס
          </p>
          <h2 className="text-2xl sm:text-3xl font-black leading-tight mb-3">
            {result.nextStepFraming}
          </h2>
          <p className="text-white/75 text-sm sm:text-base leading-relaxed max-w-2xl">
            המערכת המלאה לוקחת אותך מהניתוח הזה לתוכנית פעולה ממוקדת,
            ומחברת אותך למשרות שאינך מוצא/ת בלוחות הדרושים.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-3">
          {[
            {
              icon: Compass,
              title: "דרכון קריירה מלא",
              desc: "ניתוח עומק AI של ה-CV שלך מול שוק העבודה — חוזקות נסתרות, מסלולים אופטימליים, ופוטנציאל שכר אמיתי.",
            },
            {
              icon: Briefcase,
              title: "1,000+ משרות עם ציון התאמה אישי",
              desc: "כל משרה מקבלת ציון התאמה מ-0 עד 100 מותאם לפרופיל שלך. רואים רק את הרלוונטיות.",
            },
            {
              icon: Target,
              title: "תוכנית פעולה ל-4 שבועות",
              desc: "מסלול שבועי קונקרטי לסגירת הפערים הספציפיים שזיהינו לעיל. צעד אחרי צעד.",
            },
            {
              icon: Sparkles,
              title: "מאמן AI אישי 24/7",
              desc: "שאלה על מכתב מקדים? איך להגיב לדחייה? איך לבקש העלאה? מקבלים תשובה מקצועית תוך שניות.",
            },
            {
              icon: Lightbulb,
              title: "קהילה של 500+ מחפשי עבודה",
              desc: "אנשים בדיוק במצב שלך. תמיכה, נטוורקינג, והפניות פנימיות לחברות.",
            },
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-teal/10 text-teal-dark shrink-0">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-black text-navy text-sm">{feature.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA bar */}
        <div className="bg-gradient-to-l from-teal to-teal-dark p-5 sm:p-7 text-white text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-white/80 mb-1">
            מחיר השקה מוגבל
          </p>
          <p className="text-3xl sm:text-4xl font-black mb-1">
            <span className="line-through text-white/50 text-2xl">49₪</span>{" "}
            <span>19 ש&quot;ח</span>
            <span className="text-base font-normal text-white/80"> / חודש ראשון</span>
          </p>
          <p className="text-sm text-white/80 mb-4">ביטול בכל עת · ללא התחייבות</p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 bg-white text-navy hover:bg-cream font-black text-base sm:text-lg px-7 py-3.5 rounded-2xl shadow-xl transition-colors"
          >
            פתחו את המערכת המלאה
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ─── Footer actions ─────────────────── */}
      <section className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onShare}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-teal hover:bg-teal/5 text-navy font-bold px-5 py-3 rounded-2xl transition-colors"
        >
          <Share2 size={16} aria-hidden="true" />
          שיתוף הציון שלי
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-teal hover:bg-teal/5 text-navy font-bold px-5 py-3 rounded-2xl transition-colors"
        >
          <FileText size={16} aria-hidden="true" />
          בדיקה חדשה
        </button>
      </section>

      <p className="text-center text-[11px] text-slate-500 pt-4">
        קריירה בפוקוס · כלי AI מקצועי. הקובץ שלך לא נשמר במערכת.
      </p>
    </div>
  );
}
