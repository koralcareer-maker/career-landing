"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, Sparkles, ArrowLeft, X } from "lucide-react";

interface Props {
  level: "green" | "yellow" | "red";
  reasons?: string[];
}

const LEVELS = {
  green: {
    label: "ירוק",
    headline: "עובר/ת רוב מערכות ה-ATS",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
    chipBg: "bg-emerald-100",
  },
  yellow: {
    label: "צהוב",
    headline: "עובר/ת חלק מהמערכות — יש שיפור",
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-800",
    dot: "bg-amber-500",
    chipBg: "bg-amber-100",
  },
  red: {
    label: "אדום",
    headline: "סיכון גבוה לא להגיע למגייס",
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-800",
    dot: "bg-red-500",
    chipBg: "bg-red-100",
  },
} as const;

/**
 * Traffic-light ATS rating shown in the wizard CV uploader after a
 * successful analysis. Free for everyone; the deeper score (0-100,
 * per-system risk, rewrite suggestions) lives behind PRO+ in
 * /progress/cv-feedback.
 *
 * The "?" icon next to "ATS" opens a tiny modal explaining what an
 * ATS is in plain Hebrew — many of Coral's members are non-tech
 * career-changers who haven't met the term.
 */
export function AtsBadge({ level, reasons }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const cfg = LEVELS[level];

  return (
    <>
      <div className={`mt-4 rounded-2xl border-2 p-4 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-start gap-3 mb-2">
          <div className={`w-3 h-3 rounded-full mt-1.5 ${cfg.dot}`} />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`text-xs font-black uppercase tracking-wide ${cfg.text}`}>
                ATS · ציון {cfg.label}
              </span>
              <button
                type="button"
                onClick={() => setShowInfo(true)}
                className={`${cfg.text} hover:opacity-70 transition-opacity`}
                aria-label="מה זה ATS?"
              >
                <Info size={13} />
              </button>
            </div>
            <p className={`text-sm font-bold ${cfg.text}`}>{cfg.headline}</p>
          </div>
        </div>

        {reasons && reasons.length > 0 && (
          <ul className="mt-3 mr-6 space-y-1">
            {reasons.slice(0, 3).map((r, i) => (
              <li key={i} className={`text-xs ${cfg.text} leading-relaxed flex items-start gap-1.5`}>
                <span className={`inline-block w-1 h-1 rounded-full ${cfg.dot} mt-1.5 shrink-0`} />
                {r}
              </li>
            ))}
          </ul>
        )}

        <div className={`mt-4 pt-3 border-t ${cfg.border} flex items-center justify-between gap-3`}>
          <p className={`text-[11px] ${cfg.text} opacity-90`}>
            רוצה לדעת איך להגיע ל-100%?
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-xs font-black bg-white text-teal hover:bg-teal hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-teal/30"
          >
            <Sparkles size={11} />
            לשדרוג
            <ArrowLeft size={11} />
          </Link>
        </div>
      </div>

      {/* "What is ATS?" explainer modal */}
      {showInfo && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-navy">מה זה ATS?</h3>
              <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <p>
                <strong className="text-navy">ATS</strong> (Applicant Tracking System) זו מערכת אוטומטית שחברות
                גדולות משתמשות בה כדי לסנן קורות חיים <em>לפני</em> שאדם בכלל רואה אותם.
              </p>
              <p>
                כשאת שולחת CV — המערכת קוראת אותו ראשונה. אם היא לא מצליחה לקרוא או לזהות
                שאת מתאימה למשרה, הקובץ פשוט <strong>לא יגיע</strong> למגייס.
              </p>
              <div className="bg-cream rounded-xl p-3 space-y-1.5 text-xs">
                <p>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 align-middle ml-1" />
                  <strong>ירוק:</strong> מבנה נקי + מילות מפתח חזקות → עוברת חלק
                </p>
                <p>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 align-middle ml-1" />
                  <strong>צהוב:</strong> עוברת בחלק מהמערכות, יש דברים לתקן
                </p>
                <p>
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 align-middle ml-1" />
                  <strong>אדום:</strong> פורמט/תוכן בעייתי, סיכון לא להגיע למגייס
                </p>
              </div>
              <p className="text-xs text-gray-500 italic pt-2">
                במסלול PRO תקבלי ציון מדויק 0-100, ניתוח לכל מערכת, וניסוח מחדש של החלקים
                שלא עובדים. במסלול VIP — קורל בעצמה תכין לך CV ממגנט.
              </p>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="w-full mt-5 bg-teal text-white font-bold py-2.5 rounded-xl hover:bg-teal-dark transition-colors text-sm"
            >
              הבנתי
            </button>
          </div>
        </div>
      )}
    </>
  );
}
