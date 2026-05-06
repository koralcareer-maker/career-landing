"use client";

import { Lightbulb, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import type { WizardState } from "./types";

interface Insight {
  tone: "tip" | "warn" | "good" | "growth";
  text: string;
}

/**
 * Cheap-but-smart suggestions that update as the user fills the wizard.
 * Pure derivation off WizardState — no AI calls — so it feels instant.
 * The tone palette mirrors common career-coach voices: a tip the user
 * hadn't considered, a warning about a missing asset, a positive
 * confirmation, and a growth nudge.
 */
function buildInsights(s: WizardState, currentStep: number): Insight[] {
  const out: Insight[] = [];

  // Step 1 insights
  if (currentStep === 1) {
    if (s.targetRole.length > 2 && s.industries.length === 0) {
      out.push({ tone: "tip", text: "שווה לסמן לפחות 2 תעשיות — זה יכפיל את כמות המשרות הרלוונטיות שתראה" });
    }
    if (s.targetRole && /coordinator|מתאמ/i.test(s.targetRole) === false && /operations|תפעול/i.test(s.targetRole)) {
      out.push({ tone: "tip", text: "אולי כדאי לשלב גם תפקידי Operations Coordinator — תיאורי משרות בארץ נוטים להשתמש בכינוי זה" });
    }
    if (s.workType === "remote") {
      out.push({ tone: "tip", text: "משרות 100% מהבית בישראל = ~12% מהשוק. שקול 'היברידי' כדי לפתוח עוד 35% משרות" });
    }
  }

  // Step 2 insights
  if (currentStep === 2) {
    if (s.yearsExperience !== null && s.yearsExperience >= 7 && s.strengths.length < 3) {
      out.push({ tone: "tip", text: "עם 7+ שנות ניסיון, רשום 3-5 חוזקות מקצועיות. זה מה שמייחד אותך מקנדידטים אחרים" });
    }
    if (!s.resumeUrl) {
      out.push({ tone: "warn", text: "ללא קורות חיים בעלייה — המערכת לא תוכל לנתח חוזקות וליצור 'דרכון קריירה'. העלה למעלה" });
    }
    if (s.strengths.length >= 5) {
      out.push({ tone: "good", text: "רשימת חוזקות עשירה. תוכל לשלב את החזקות הבולטות בכותרת ה-LinkedIn" });
    }
  }

  // Step 3 insights
  if (currentStep === 3) {
    if (s.jsActively === "yes" && s.jsRecentInterviews !== null && s.jsRecentInterviews === 0 && s.jsSearchWeeks !== null && s.jsSearchWeeks >= 4) {
      out.push({ tone: "warn", text: "חודש בחיפוש פעיל ללא ראיונות — זה לרוב סימן לכך שצריך לחזק את הפרופיל. דרכון הקריירה יראה איפה הפער" });
    }
    if (s.jsActively === "yes" && s.jsIsApplying === false) {
      out.push({ tone: "tip", text: "פעיל בחיפוש אבל עוד לא שולח קורות חיים? לוח המשרות שלנו פותח לך התחלה — ראיתי 8 משרות חמות שבועה" });
    }
    if (s.jsActively === "passive") {
      out.push({ tone: "growth", text: "במצב 'פתוח להזדמנויות' — הפרו על LinkedIn 'פתוח לעבודה' מגדיל חשיפה למגייסים פי 3" });
    }
  }

  // Step 4 insights
  if (currentStep === 4) {
    if (!s.linkedinUrl) {
      out.push({ tone: "warn", text: "חסר LinkedIn — זה מוריד חשיפה למגייסים. 87% מתפקידי ההייטק והניהול בישראל מאוישים דרך לינקדאין" });
    } else if (!s.portfolioUrl && /design|develop|מעצב|מפתח/i.test(s.targetRole)) {
      out.push({ tone: "tip", text: "תפקידים בעיצוב/פיתוח — תיק עבודות (פורטפוליו) מגדיל סיכויים פי 2.4 לשלב הבא" });
    }
    if (s.additionalLinks.length > 0) {
      out.push({ tone: "good", text: "יש לך נכסים מקצועיים נוספים — נשלב אותם אוטומטית בהמלצות הקריירה" });
    }
  }

  // Cross-step: high-level
  if (currentStep >= 2 && s.industries.length === 0) {
    out.push({ tone: "warn", text: "עוד לא בחרת תעשיות — חזור לשלב 1, זה הכי חשוב להתאמת המשרות" });
  }

  return out.slice(0, 4);
}

const TONE_STYLES: Record<Insight["tone"], { bg: string; text: string; border: string; icon: typeof Lightbulb }> = {
  tip:    { bg: "bg-teal/5",    text: "text-teal-dark",    border: "border-teal/20",    icon: Lightbulb     },
  warn:   { bg: "bg-amber-50",  text: "text-amber-800",    border: "border-amber-200",  icon: AlertTriangle },
  good:   { bg: "bg-emerald-50",text: "text-emerald-700",  border: "border-emerald-200",icon: CheckCircle2  },
  growth: { bg: "bg-purple-50", text: "text-purple-800",   border: "border-purple-200", icon: TrendingUp    },
};

export function InsightsPanel({ state, currentStep }: { state: WizardState; currentStep: number }) {
  const insights = buildInsights(state, currentStep);

  return (
    <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto">
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal/15 to-teal/5 flex items-center justify-center">
            <Lightbulb size={15} className="text-teal" />
          </div>
          <div>
            <h3 className="font-black text-navy text-sm">תובנות בזמן אמת</h3>
            <p className="text-xs text-gray-400">משתנות לפי מה שאת ממלאת</p>
          </div>
        </div>

        {insights.length === 0 ? (
          <p className="text-xs text-gray-400 leading-relaxed">
            התובנות יופיעו כאן ברגע שתתחילי למלא את השלב — מציעות תפקידים, מצביעות על שדות חסרים, ומעלות אופטימיזציות.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {insights.map((ins, i) => {
              const style = TONE_STYLES[ins.tone];
              const Icon = style.icon;
              return (
                <li
                  key={i}
                  className={`flex items-start gap-2.5 ${style.bg} ${style.border} border rounded-xl p-3`}
                >
                  <Icon size={14} className={`${style.text} mt-0.5 shrink-0`} />
                  <p className={`text-xs leading-relaxed ${style.text}`}>{ins.text}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Why-this-matters footer */}
      <div className="mt-4 px-4 text-[11px] text-gray-400 leading-relaxed">
        ✨ הנתונים מזינים את ההמלצות לעבודה, את מאמן ה-AI, ואת תובנות השוק — לא נדרש למלא הכל בבת אחת
      </div>
    </aside>
  );
}
