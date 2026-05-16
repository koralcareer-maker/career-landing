"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Sparkles, Upload, FileText, Loader2, CheckCircle2,
  ArrowLeft, Trophy, XCircle,
} from "lucide-react";
import { QUESTIONNAIRE, type CvMatchResult } from "@/lib/cv-match-analyzer";

/**
 * CV-Match — questionnaire-driven readiness assessment.
 *
 * Flow:
 *   1. Upload CV (or paste text)
 *   2. Target role (short name or full job description)
 *   3. 8 multiple-choice questions about the job search itself
 *   4. Submit → instant score (no LLM call) + one of two templates
 *
 * Templates are pre-written by Coral. High score → "you're on the
 * right track" + 5 community benefits. Low score → "time to do things
 * differently" + 7 community benefits.
 */

export function CvMatchClient() {
  // Inputs
  const [cvText, setCvText] = useState("");
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobText, setJobText] = useState("");
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  // 8 answers — undefined means not yet picked. UI requires all 8.
  const [answers, setAnswers] = useState<(number | undefined)[]>(
    () => new Array(QUESTIONNAIRE.length).fill(undefined),
  );

  // Output state
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

  function pickAnswer(qIdx: number, value: number) {
    setAnswers((arr) => {
      const next = [...arr];
      next[qIdx] = value;
      return next;
    });
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
    if (jobText.trim().length < 3) {
      setError("הזיני שם תפקיד יעד");
      return;
    }
    const missing = answers.findIndex((a) => a === undefined);
    if (missing !== -1) {
      setError(`חסרה תשובה לשאלה ${missing + 1}: ${QUESTIONNAIRE[missing].title}`);
      // Scroll to the missing question for mobile UX.
      const el = document.getElementById(`q-${missing}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (inputMode === "upload" && cvFile) formData.append("cv", cvFile);
      else formData.append("cvText", cvText);
      formData.append("jobText", jobText);
      formData.append("answers", JSON.stringify(answers));

      const res = await fetch("/api/cv-match", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "ניתוח נכשל. נסי שוב.");
        return;
      }
      setResult(data.result);
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
    setAnswers(new Array(QUESTIONNAIRE.length).fill(undefined));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-white to-cream" dir="rtl">
      {/* Top nav */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-black/5 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center text-white font-bold text-sm">ק</div>
            <span className="font-bold text-navy text-sm sm:text-base">קריירה בפוקוס</span>
          </Link>
          <Link
            href="/pricing"
            className="text-xs sm:text-sm font-semibold text-navy hover:text-teal-dark"
          >
            על הפלטפורמה
          </Link>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────── */}
      {!result && (
        <section className="px-4 sm:px-5 pt-8 sm:pt-12 pb-4 sm:pb-6 max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 bg-teal/10 text-teal-dark font-bold text-[11px] sm:text-xs px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={12} />
            כלי AI חינמי · ללא הרשמה
          </span>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-navy leading-[1.15] sm:leading-[1.1] mb-4">
            איפה את באמת עומדת<br />
            <span className="bg-gradient-to-l from-teal-dark to-teal bg-clip-text text-transparent">
              בחיפוש העבודה שלך?
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            ⚡ ניתוח ע&quot;י AI מקצועי על בסיס 15 שנות ניסיון בגיוס בישראל. ללא הרשמה. ללא מייל.
          </p>
        </section>
      )}

      {/* ─── Form ─────────────────────────────── */}
      {!result && (
        <section className="px-4 sm:px-5 pb-10 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-7">
            {/* ── Step 1: CV ──────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <StepNumber n={1} />
                <h2 className="text-base sm:text-lg font-black text-navy">קורות החיים שלך</h2>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 mb-3 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => setInputMode("upload")}
                  aria-pressed={inputMode === "upload"}
                  className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg font-semibold transition-colors ${
                    inputMode === "upload" ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  📎 העלאת קובץ
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("paste")}
                  aria-pressed={inputMode === "paste"}
                  className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg font-semibold transition-colors ${
                    inputMode === "paste" ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ✍ הדבקת טקסט
                </button>
              </div>

              {inputMode === "upload" ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null); }}
                  className={`border-2 border-dashed rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-colors ${
                    cvFileName ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-teal hover:bg-teal/5"
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
                      <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={26} aria-hidden="true" />
                      <p className="font-bold text-emerald-900 text-sm break-all">{cvFileName}</p>
                      <p className="text-xs text-emerald-700 mt-1">לחיצה להחלפה</p>
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto mb-2 sm:mb-3 text-slate-400" size={26} aria-hidden="true" />
                      <p className="font-bold text-navy text-sm sm:text-base">העלי PDF או DOCX</p>
                      <p className="text-xs text-slate-500 mt-1">לחיצה לבחירה · עד 8MB</p>
                    </>
                  )}
                </div>
              ) : (
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  placeholder="העתיקי את כל תוכן הקורות חיים — שם, תפקידים, ניסיון, השכלה, מיומנויות..."
                  rows={8}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none text-sm resize-y"
                />
              )}
            </div>

            {/* ── Step 2: Target role ──────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <StepNumber n={2} />
                <h2 className="text-base sm:text-lg font-black text-navy">תפקיד היעד</h2>
              </div>
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder='לדוגמה: "מנהל פרויקטים בכיר", "Senior Product Manager", "מנהלת חשבונות"...'
                rows={2}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-300 focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none text-sm resize-y min-h-[56px]"
              />
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5">
                💡 שם התפקיד מספיק. תיאור משרה מלא ייתן ניתוח מדויק יותר.
              </p>
            </div>

            {/* ── Step 3: Questionnaire ────────── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StepNumber n={3} />
                <h2 className="text-base sm:text-lg font-black text-navy">
                  {QUESTIONNAIRE.length} שאלות על חיפוש העבודה שלך
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
                סמני את התשובה שמתארת הכי טוב את המצב שלך. אין תשובה נכונה — זה המקור לציון.
              </p>

              <div className="space-y-4 sm:space-y-5">
                {QUESTIONNAIRE.map((q, qIdx) => {
                  const picked = answers[qIdx];
                  return (
                    <div
                      key={q.id}
                      id={`q-${qIdx}`}
                      className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-teal/10 text-teal-dark text-xs font-bold shrink-0 mt-0.5">
                          {qIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-teal-dark uppercase tracking-wider mb-0.5">
                            {q.title}
                          </p>
                          <p className="text-sm sm:text-base font-black text-navy leading-snug">
                            {q.prompt}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-3">
                        {q.options.map((opt, optIdx) => {
                          // Value resolution priority:
                          //   1. q.scoreMap[i] — explicit per-option (used for
                          //      categorical questions like "where stuck?")
                          //   2. q.reversed     — first option = best
                          //   3. default        — option index 0 = 1pt, 4 = 5pts
                          const value = q.scoreMap?.[optIdx]
                            ?? (q.reversed ? 5 - optIdx : optIdx + 1);
                          const active = picked === value;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => pickAnswer(qIdx, value)}
                              aria-pressed={active}
                              className={`w-full text-right flex items-start gap-2.5 px-3 py-2.5 rounded-lg sm:rounded-xl border-2 text-xs sm:text-sm font-semibold transition-colors ${
                                active
                                  ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                                  : "bg-white border-slate-200 text-slate-700 hover:border-teal/50 active:bg-slate-50"
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                  active ? "bg-emerald-500 border-emerald-500" : "border-slate-300 bg-white"
                                }`}
                              >
                                {active && <span className="block w-2 h-2 bg-white rounded-full" />}
                              </span>
                              <span className="flex-1 leading-relaxed">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="w-full bg-gradient-to-l from-navy to-teal-dark hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base sm:text-lg px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl shadow-teal/20 transition-all focus:outline-none focus:ring-4 focus:ring-teal/40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                  מנתחים…
                </>
              ) : (
                <>קבלי את הציון שלך</>
              )}
            </button>

            <p className="text-[10px] sm:text-[11px] text-center text-slate-500">
              הקובץ שלך לא נשמר אצלנו. הניתוח רץ באופן אנונימי.
            </p>
          </div>
        </section>
      )}

      {/* ─── Result ──────────────────────────── */}
      {result && (
        <>
          <div id="result-anchor" />
          <ResultView result={result} onReset={reset} />
        </>
      )}
    </div>
  );
}

// ─── UI bits ─────────────────────────────────────────────────────────

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal text-white text-sm font-bold shrink-0">
      {n}
    </span>
  );
}

// ─── Result view ─────────────────────────────────────────────────────

function ResultView({ result, onReset }: { result: CvMatchResult; onReset: () => void }) {
  const scoreColor =
    result.score >= 80 ? "stroke-emerald-500" :
    result.score >= 65 ? "stroke-teal" :
    result.score >= 50 ? "stroke-amber-500" :
    "stroke-rose-500";

  const labelColor =
    result.score >= 70 ? "text-emerald-600" :
    result.score >= 50 ? "text-amber-600" :
    "text-rose-600";

  return (
    <div className="px-4 sm:px-5 py-6 sm:py-10 max-w-3xl mx-auto space-y-5 sm:space-y-6" dir="rtl">
      {/* Score ring */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-8 lg:p-10 text-center relative overflow-hidden">
        <div aria-hidden="true" className="absolute -top-24 -right-24 w-64 h-64 bg-teal/10 rounded-full blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl" />

        <div className="relative">
          <p className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2 ${labelColor}`}>
            {result.matchLabel}
          </p>
          <div className="relative w-36 h-36 sm:w-48 sm:h-48 lg:w-52 lg:h-52 mx-auto mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="42" stroke="#e2e8f0" strokeWidth="8" fill="none" />
              <circle
                cx="50" cy="50" r="42" strokeWidth="8" fill="none" strokeLinecap="round"
                className={scoreColor}
                style={{
                  strokeDasharray: `${2 * Math.PI * 42}`,
                  strokeDashoffset: `${2 * Math.PI * 42 * (1 - result.score / 100)}`,
                  transition: "stroke-dashoffset 1.2s ease-out",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl sm:text-6xl lg:text-7xl font-black text-navy leading-none">
                {result.score}
              </span>
              <span className="text-sm text-slate-500 mt-1">/100</span>
            </div>
          </div>
          <p className="text-base sm:text-lg text-navy max-w-xl mx-auto leading-relaxed font-medium px-2">
            {result.verdict}
          </p>
        </div>
      </section>

      {/* Template-driven message */}
      {result.template === "high" ? <HighTemplate /> : <LowTemplate />}

      {/* CTA */}
      <section className="bg-gradient-to-l from-teal to-teal-dark rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white text-center shadow-xl">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/80 mb-1">
          מחיר השקה מוגבל
        </p>
        <p className="text-2xl sm:text-3xl lg:text-4xl font-black mb-1">
          <span className="line-through text-white/50 text-xl sm:text-2xl">49₪</span>{" "}
          <span>19 ש&quot;ח</span>
          <span className="text-sm sm:text-base font-normal text-white/80"> / חודש ראשון</span>
        </p>
        <p className="text-xs sm:text-sm text-white/80 mb-4">ביטול בכל עת · ללא התחייבות</p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 bg-white text-navy hover:bg-cream font-black text-sm sm:text-lg px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-xl transition-colors"
        >
          הצטרפי לקהילה
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
      </section>

      <button
        type="button"
        onClick={onReset}
        className="w-full inline-flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-teal hover:bg-teal/5 text-navy font-bold px-5 py-3 rounded-xl sm:rounded-2xl transition-colors"
      >
        <FileText size={16} aria-hidden="true" />
        בדיקה חדשה
      </button>

      <p className="text-center text-[10px] sm:text-[11px] text-slate-500 pt-4">
        קריירה בפוקוס · כלי AI מקצועי. הקובץ שלך לא נשמר במערכת.
      </p>
    </div>
  );
}

// ─── Result templates ────────────────────────────────────────────────

function HighTemplate() {
  return (
    <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7">
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 mb-3">
          <Trophy size={26} aria-hidden="true" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-navy mb-2">
          נראה שאת/ה בכיוון הנכון 🚀
        </h2>
        <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-xl mx-auto">
          יש לך בסיס טוב להתקדם בשוק העבודה, ונראה שאת/ה כבר עושה הרבה דברים נכון.
        </p>
      </div>

      <p className="text-sm sm:text-base text-navy font-bold text-center mb-5">
        ⚡ עכשיו זה בעיקר עניין של התמדה, דיוק והמשך עבודה נכונה.
      </p>
      <p className="text-sm sm:text-base text-slate-700 text-center mb-5">
        תמשיך/י לתת גז — אבל אל תישאר/י מאחור בשוק שמשתנה כל הזמן.
      </p>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl sm:rounded-2xl p-4 sm:p-5">
        <p className="text-sm sm:text-base font-black text-navy mb-3">
          בקהילת קריירה בפוקוס מחכים לך:
        </p>
        <ul className="space-y-2 text-sm sm:text-base text-navy">
          {[
            "משרות מתחת לרדאר",
            "כלי AI מתקדמים",
            "הכנה לראיונות",
            "קורסים מקצועיים",
            "קהילה שמקדמת אותך באמת",
          ].map((b) => (
            <li key={b} className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" aria-hidden="true" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function LowTemplate() {
  return (
    <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7">
      <h2 className="text-2xl sm:text-3xl font-black text-navy mb-3 text-center">
        כנראה שהגיע הזמן לעשות דברים אחרת.
      </h2>
      <p className="text-sm sm:text-base text-slate-700 leading-relaxed mb-5 max-w-xl mx-auto text-center">
        אם חיפוש העבודה שלך תקוע — זה לא בהכרח בגלל שאין לך ניסיון.
      </p>

      <div className="bg-rose-50 border border-rose-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-5">
        <p className="text-sm sm:text-base text-navy font-bold mb-3">
          ברוב המקרים, אנשים פשוט פועלים בלי:
        </p>
        <ul className="space-y-2 text-sm sm:text-base text-rose-900">
          {[
            "אסטרטגיה נכונה",
            "גישה להזדמנויות איכותיות",
            "מיתוג מקצועי חזק",
            "הבנה אמיתית של חוקי המשחק בשוק העבודה של 2026",
          ].map((b) => (
            <li key={b} className="flex items-center gap-2">
              <XCircle size={16} className="text-rose-600 shrink-0" aria-hidden="true" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-base sm:text-lg font-black text-navy text-center mb-4">
        החדשות הטובות? 🚀 אפשר לשנות את זה.
      </p>

      <div className="bg-teal/5 border border-teal/30 rounded-xl sm:rounded-2xl p-4 sm:p-5">
        <p className="text-sm sm:text-base font-black text-navy mb-3">
          בקהילת קריירה בפוקוס תקבל/י את כל מה שצריך כדי להתקדם באמת:
        </p>
        <ul className="space-y-2 text-sm sm:text-base text-navy">
          {[
            "משרות מתחת לרדאר",
            "קורות חיים ולינקדאין",
            "סימולציות ראיונות AI",
            "קורסים להשלמת פערים",
            "מיקוד תעסוקתי",
            "גישה לערוצי גיוס ומגייסים",
            "כלים ושיטות שעובדים בשוק של היום",
          ].map((b) => (
            <li key={b} className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-teal-dark shrink-0" aria-hidden="true" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
