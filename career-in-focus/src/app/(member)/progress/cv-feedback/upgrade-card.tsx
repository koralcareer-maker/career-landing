import Link from "next/link";
import { Lock, Sparkles, FileCheck, Target, MessageCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

/**
 * Inline upgrade card shown on /progress/cv-feedback when the
 * member's tier is המsקה (base / MEMBER enum). Differs from the
 * full-page <PremiumGate> in that it only sells THIS feature
 * (deep CV feedback) and links to /pricing rather than the
 * koral-connections lead form.
 */
const FEATURE_BENEFITS = [
  { icon: <FileCheck size={18} className="text-teal" />,    text: "ציון איכות 0-100 + פירוט לפי 8 ממדים" },
  { icon: <Target size={18} className="text-teal" />,       text: "ציון תאימות ATS + רמת סיכון לכל מערכת" },
  { icon: <MessageCircle size={18} className="text-teal" />,text: "תיקונים בעדיפות גבוהה / בינונית / אופציונלית" },
  { icon: <Sparkles size={18} className="text-teal" />,     text: "ניסוח מחדש של משפטי מפתח שלא עובדים" },
  { icon: <CheckCircle2 size={18} className="text-teal" />, text: "מילות מפתח חסרות שמגייסים מחפשים" },
];

export function CvFeedbackUpgradeCard() {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl shadow-navy/5 border border-black/5 overflow-hidden">
        {/* Hero strip */}
        <div className="relative bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a] text-white p-7 sm:p-9 text-center overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-teal/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-teal/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-teal/15 border border-teal/30 text-teal px-4 py-1.5 rounded-full text-xs font-bold mb-5">
              <Lock size={12} />
              פיצ&apos;ר במסלול PRO+
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mb-3 leading-tight">
              ניתוח עומק לקורות החיים שלך
            </h1>
            <p className="text-sm sm:text-base text-white/75 leading-relaxed max-w-md mx-auto">
              ציון איכות, תאימות ATS, ניסוח מחדש ותיקונים מדויקים — הכל מבוסס AI.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8">
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            במסלול ההשקה (₪19/חודש) את יכולה להעלות קורות חיים והמערכת תחלץ ממנו אוטומטית את החוזקות, הפערים והרקע — לטובת דרכון הקריירה ולוח המשרות.
          </p>
          <p className="text-sm text-navy font-bold mb-3">
            ניתוח העומק עם הציונים, ה-ATS והניסוח המחדש — נפתח במסלול PRO:
          </p>

          <ul className="space-y-2.5 mb-6">
            {FEATURE_BENEFITS.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                <span className="shrink-0 mt-0.5">{b.icon}</span>
                <span>{b.text}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/pricing"
            className="w-full flex items-center justify-center gap-2 bg-teal text-white font-black py-4 rounded-xl hover:bg-teal-dark transition-all hover:-translate-y-0.5 shadow-md shadow-teal/30 text-base"
          >
            <Sparkles size={16} />
            לשדרוג ל-PRO
            <ArrowLeft size={16} />
          </Link>

          <p className="text-xs text-gray-400 text-center mt-3">
            ביטול בכל עת · פרטי הקורות חיים שלך נשמרים גם אחרי שדרוג
          </p>
        </div>
      </div>

      {/* Secondary fallback for base members */}
      <div className="mt-5 bg-teal/5 border border-teal/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white shrink-0 flex items-center justify-center">
            <FileCheck size={16} className="text-teal" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-navy mb-1">בינתיים — דרכון הקריירה שלך עובד תקין</p>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              אם עוד לא מילאת — היכנסי לדף הפרופיל, העלי קורות חיים ותקבלי אוטומטית ניתוח חוזקות, פערים וכיווני קריירה (כלול בהשקה).
            </p>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1 text-xs font-bold text-teal hover:text-teal-dark transition-colors"
            >
              לדף הפרופיל
              <ArrowLeft size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
