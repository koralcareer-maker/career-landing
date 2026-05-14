"use client";

import { useState } from "react";
import {
  Sparkles, Calendar, MapPin, Loader2, RefreshCw,
  ChevronDown, ChevronUp, Heart, Target, Compass,
  Award, TrendingUp, Wallet, Lightbulb,
} from "lucide-react";
import type { PersonalAnalysisResult } from "@/lib/personal-analysis";

/**
 * Personal Analysis card — sits inside /profile. Two states:
 *
 *  - **Empty**: birthDate + birthPlace fields, "צור/י ניתוח" CTA.
 *    POSTs both to /api/profile/personal-analysis which persists
 *    them AND runs the analysis in one round-trip.
 *
 *  - **Filled**: full 10-section reading in a collapsible layout.
 *    Sections are shown closed by default so the page doesn't drown
 *    in text; "התרחבי לקריאה מלאה" expands the whole thing.
 *
 * The result is also cached server-side (Profile.personalAnalysis) so
 * a page refresh shows the same content without re-billing the LLM.
 */

interface Props {
  /** Existing analysis JSON (Profile.personalAnalysis), if any. */
  initialAnalysis: PersonalAnalysisResult | null;
  /** When the cached analysis was generated. */
  initialAnalysedAt: string | null;
  /** Current Profile.birthDate (ISO) — pre-fills the input. */
  initialBirthDate: string | null;
  /** Current Profile.birthPlace — pre-fills the input. */
  initialBirthPlace: string | null;
}

export function PersonalAnalysisCard({
  initialAnalysis,
  initialAnalysedAt,
  initialBirthDate,
  initialBirthPlace,
}: Props) {
  const [analysis, setAnalysis] = useState<PersonalAnalysisResult | null>(initialAnalysis);
  const [analysedAt, setAnalysedAt] = useState<string | null>(initialAnalysedAt);
  const [birthDate, setBirthDate] = useState<string>(
    initialBirthDate ? initialBirthDate.slice(0, 10) : "",
  );
  const [birthPlace, setBirthPlace] = useState<string>(initialBirthPlace ?? "ישראל");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function generate() {
    if (!birthDate) {
      setError("תאריך לידה הוא שדה חובה");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/personal-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, birthPlace }),
      });
      const data = (await res.json()) as
        | { ok: true; analysis: PersonalAnalysisResult; generatedAt: string }
        | { error: string; message?: string };
      if (!res.ok || !("ok" in data)) {
        const msg = "message" in data && data.message ? data.message : "התרחשה שגיאה ביצירת הניתוח";
        setError(msg);
        return;
      }
      setAnalysis(data.analysis);
      setAnalysedAt(data.generatedAt);
      setExpanded(true);
    } catch {
      setError("לא הצלחנו ליצור את הניתוח כעת. נסי שוב בעוד דקה.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Empty state ────────────────────────────────────────────────
  if (!analysis) {
    return (
      <section
        dir="rtl"
        className="rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6 sm:p-8 shadow-md"
      >
        <header className="flex items-start gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow">
            <Sparkles size={22} />
          </span>
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-wide text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md mb-1.5">
              שכבה נוספת מעבר לדרכון
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-navy">
              ניתוח אישי מעמיק
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              דרכון הקריירה שלך מוכן — זה הצעד הבא. שילוב של נומרולוגיה ופסיכולוגיה
              תעסוקתית שמתבסס על תאריך ומקום הלידה, ומחזיר ניתוח עומק עם המלצה
              לתפקידים שמתאימים לך באמת. ההמלצות יוזרמו אוטומטית לאלגוריתם
              ההתאמה שכבר עובד בדרכון.
            </p>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-purple-600" />
              תאריך לידה
            </span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-purple-600" />
              מקום לידה (עיר ומדינה)
            </span>
            <input
              type="text"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder="לדוגמה: תל אביב, ישראל"
              className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none"
            />
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={generate}
          disabled={loading || !birthDate}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-2xl shadow-lg transition-all hover:shadow-xl"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              יוצרים ניתוח עבורך — זה לוקח כדקה
            </>
          ) : (
            <>
              <Sparkles size={18} />
              צור ניתוח אישי
            </>
          )}
        </button>

        <p className="text-xs text-slate-500 mt-3">
          הנתונים נשמרים בפרופיל ולא חשופים לאף משתמש אחר. אפשר ליצור ניתוח חדש בכל עת.
        </p>
      </section>
    );
  }

  // ─── Filled state ───────────────────────────────────────────────
  return (
    <section
      dir="rtl"
      className="rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6 sm:p-8 shadow-md space-y-5"
    >
      <header className="flex flex-col sm:flex-row sm:items-start gap-3">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow shrink-0">
          <Sparkles size={22} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-navy">
            הניתוח האישי שלך
          </h2>
          {analysedAt && (
            <p className="text-xs text-slate-500 mt-1">
              נוצר ב-{new Date(analysedAt).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-bold text-purple-700 hover:text-purple-900 bg-white border border-purple-200 hover:border-purple-400 px-4 py-2 rounded-xl transition-colors"
          title="צור ניתוח חדש"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          רענון
        </button>
      </header>

      {/* Header line + numbers strip */}
      <div className="bg-white/70 rounded-2xl p-4 border border-purple-100">
        <p className="text-base text-navy leading-relaxed">{analysis.headerLine}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <NumberChip label="Life Path" value={analysis.numbers.lifePath} />
          <NumberChip label="Day Number" value={analysis.numbers.dayNumber} />
          <NumberChip label={`Personal Year ${analysis.yearAnalysed}`} value={analysis.numbers.personalYear} />
        </div>
      </div>

      {/* Summary tiles — always visible, big takeaway */}
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryTile
          icon={<Award size={16} />}
          title="החוזקה הגדולה ביותר"
          body={analysis.summary.biggestStrength}
          color="emerald"
        />
        <SummaryTile
          icon={<Target size={16} />}
          title="הסיכון הגדול ביותר"
          body={analysis.summary.biggestRisk}
          color="amber"
        />
        <SummaryTile
          icon={<Lightbulb size={16} />}
          title="הדבר היחיד לשנות השבוע"
          body={analysis.summary.oneThingToChange}
          color="purple"
        />
        <SummaryTile
          icon={<Wallet size={16} />}
          title="פוטנציאל הכנסה"
          body={analysis.summary.salaryPotential}
          color="teal"
        />
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 text-sm font-bold text-purple-700 hover:text-purple-900 py-2"
      >
        {expanded ? "סגירת הניתוח המלא" : "התרחבות לקריאה המלאה (10 פרקים)"}
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="space-y-5 pt-2 border-t border-purple-100">
          {/* Year theme */}
          <Section icon={<Compass size={18} />} title="המסר של השנה הנוכחית">
            <p className="text-navy leading-relaxed whitespace-pre-line">{analysis.yearTheme}</p>
          </Section>

          {/* 01 Core */}
          <Section icon={<Heart size={18} />} title="01 · הליבה">
            <p className="text-navy leading-relaxed whitespace-pre-line">{analysis.core}</p>
          </Section>

          {/* 02 Purpose */}
          <Section icon={<Target size={18} />} title="02 · מה את/ה עושה בעולם">
            <p className="text-navy leading-relaxed whitespace-pre-line">{analysis.purpose}</p>
          </Section>

          {/* 03 Strengths */}
          <Section icon={<Award size={18} />} title="03 · החוזקות שלך">
            <ul className="space-y-2">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-navy">
                  <span className="text-emerald-600 font-bold shrink-0">•</span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* 04 Weaknesses */}
          <Section icon={<TrendingUp size={18} />} title="04 · החולשות שלך + איך לנצח אותן">
            <div className="space-y-3">
              {analysis.weaknesses.map((w, i) => (
                <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="font-bold text-amber-900">{w.weakness}</p>
                  <p className="text-amber-800 text-sm mt-1">
                    <span className="font-semibold">פתרון: </span>
                    {w.solution}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* 05 Bloom environment */}
          <Section icon={<Sparkles size={18} />} title="05 · איפה את/ה פורח/ת">
            <p className="text-navy leading-relaxed whitespace-pre-line">{analysis.bloomEnvironment}</p>
          </Section>

          {/* 06 Career paths */}
          <Section icon={<Compass size={18} />} title="06 · עבודה וקריירה">
            <div className="space-y-3">
              {analysis.careerPaths.map((p, i) => (
                <div key={i} className="bg-white border border-purple-100 rounded-xl p-4">
                  <p className="font-bold text-navy">{p.name}</p>
                  <p className="text-slate-700 text-sm mt-1 leading-relaxed">{p.description}</p>
                  {(p.salaryEmployed || p.salaryFreelance) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {p.salaryEmployed && (
                        <span className="px-2 py-1 rounded-lg bg-teal/10 text-teal font-semibold">
                          שכיר/ה: {p.salaryEmployed}
                        </span>
                      )}
                      {p.salaryFreelance && (
                        <span className="px-2 py-1 rounded-lg bg-purple-100 text-purple-700 font-semibold">
                          עצמאי/ת: {p.salaryFreelance}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {analysis.rolesNotFit && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm">
                <p className="font-bold text-red-900 mb-1">מה לא מתאים לך</p>
                <p className="text-red-800 leading-relaxed whitespace-pre-line">{analysis.rolesNotFit}</p>
              </div>
            )}
          </Section>

          {/* Money */}
          <Section icon={<Wallet size={18} />} title="07 · כסף והצלחה">
            <div className="space-y-2 text-navy">
              <p><span className="font-bold">בשלב הנוכחי:</span> {analysis.money.currentStage}</p>
              <p><span className="font-bold">שלב הבא (3-5 שנים):</span> {analysis.money.nextStage}</p>
              <p className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                <span className="font-bold">⚠ אזהרה: </span>{analysis.money.warning}
              </p>
            </div>
          </Section>

          {/* 09 Calling */}
          <Section icon={<Target size={18} />} title="08 · הייעוד">
            <p className="text-navy leading-relaxed whitespace-pre-line font-medium">{analysis.calling}</p>
          </Section>

          {/* 10 Remember this */}
          <Section icon={<Heart size={18} />} title="09 · מה חשוב לזכור">
            <ul className="space-y-2">
              {analysis.rememberThis.map((r, i) => (
                <li key={i} className="bg-white border border-purple-100 rounded-xl p-3 text-navy leading-relaxed">
                  {r}
                </li>
              ))}
            </ul>
          </Section>

          {/* Recommended roles — chips that link to /jobs filter */}
          <Section icon={<Compass size={18} />} title="10 · התפקידים שמתאימים לך">
            <p className="text-sm text-slate-600 mb-3">
              התפקידים האלה הוזרמו לאלגוריתם ההתאמה — בלוח המשרות הם יקבלו ציון התאמה גבוה יותר.
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.recommendedRoles.map((role, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 text-sm font-semibold border border-purple-200"
                >
                  {role}
                </span>
              ))}
            </div>
          </Section>

          {/* Year message — final */}
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl p-5 shadow-lg">
            <p className="text-base font-bold mb-1">המסר של השנה</p>
            <p className="text-lg leading-relaxed">{analysis.summary.yearMessage}</p>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Small bits ─────────────────────────────────────────────────────

function NumberChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 font-semibold">
      <span className="opacity-70">{label}</span>
      <span className="font-extrabold">{value}</span>
    </span>
  );
}

const COLOR_CLASSES = {
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
  amber: "bg-amber-50 border-amber-200 text-amber-900",
  purple: "bg-purple-50 border-purple-200 text-purple-900",
  teal: "bg-teal/5 border-teal/30 text-navy",
} as const;

function SummaryTile({
  icon, title, body, color,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  color: keyof typeof COLOR_CLASSES;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${COLOR_CLASSES[color]}`}>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide opacity-75 mb-1.5">
        {icon}
        {title}
      </p>
      <p className="text-sm leading-relaxed font-medium">{body}</p>
    </div>
  );
}

function Section({
  icon, title, children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-base font-extrabold text-purple-900 mb-2">
        {icon}
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}
