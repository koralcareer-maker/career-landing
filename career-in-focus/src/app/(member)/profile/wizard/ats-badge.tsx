"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Info, Sparkles, X, FileSearch, UserCheck, CheckCircle2, Loader2, TrendingUp, AlertTriangle } from "lucide-react";
import { requestCvWriting } from "@/lib/actions/cv-requests";

interface Props {
  level: "green" | "yellow" | "red";
  reasons?: string[];
  // ChatGPT-level depth on the free tier — shown alongside the
  // traffic light. Gemini already produces these every analysis;
  // we just surface them in the wizard so the user gets meaningful
  // feedback before deciding whether to upgrade.
  summary?: string;
  strengths?: string[];
  skillGaps?: string[];
  cvFeedback?: string[];
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
export function AtsBadge({ level, reasons, summary, strengths, skillGaps, cvFeedback }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  // Confirmation state for the "קורל תכין לי קוח" flow.
  // 'idle' → user can click. 'sending' → server action in flight.
  // 'sent'  → request created, customer + admin emailed; show success card.
  const [vipPhase, setVipPhase] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [vipError, setVipError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cfg = LEVELS[level];

  function handleVipClick() {
    setVipError(null);
    setVipPhase("sending");
    startTransition(async () => {
      try {
        const r = await requestCvWriting();
        if (r?.success) {
          setVipPhase("sent");
        } else {
          setVipError(r?.error ?? "משהו השתבש. נסי שוב.");
          setVipPhase("error");
        }
      } catch (e) {
        setVipError(e instanceof Error ? e.message : "משהו השתבש. נסי שוב.");
        setVipPhase("error");
      }
    });
  }

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

        {/* Professional analysis layer — Gemini produces all of this
            anyway, surfacing it free gives users ChatGPT-level value
            on the base tier. The PRO upgrade is still differentiated
            by quality score / per-system ATS / rewrites / keywords. */}
        {summary && summary.length > 0 && (
          <div className={`mt-4 pt-4 border-t ${cfg.border}`}>
            <p className={`text-[11px] font-black uppercase tracking-wide ${cfg.text} mb-1.5`}>
              📊 הניתוח שלי
            </p>
            <p className={`text-sm ${cfg.text} leading-relaxed opacity-90`}>{summary}</p>
          </div>
        )}

        {strengths && strengths.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/30 bg-white/40 -mx-4 -mb-4 rounded-b-2xl px-4 pb-3 pt-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700 mb-2 flex items-center gap-1">
              <TrendingUp size={11} />
              נקודות חזקות שזיהינו
            </p>
            <ul className="space-y-1">
              {strengths.slice(0, 3).map((s, i) => (
                <li key={i} className="text-xs text-emerald-800 leading-relaxed flex items-start gap-1.5">
                  <CheckCircle2 size={11} className="mt-0.5 shrink-0 text-emerald-600" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(cvFeedback && cvFeedback.length > 0) || (skillGaps && skillGaps.length > 0) ? (
          <div className="mt-3 bg-white/40 -mx-4 rounded-2xl px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-orange-700 mb-2 flex items-center gap-1">
              <AlertTriangle size={11} />
              מה לתקן עכשיו
            </p>
            <ul className="space-y-1">
              {(cvFeedback ?? skillGaps ?? []).slice(0, 3).map((s, i) => (
                <li key={i} className="text-xs text-orange-800 leading-relaxed flex items-start gap-1.5">
                  <span className="inline-block w-1 h-1 bg-orange-500 rounded-full mt-1.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Two upgrade CTAs — visible for ALL ratings (per Coral). The
            ones who just got "green" might still want a deeper review
            or a Coral-prepared CV; the ones who got "red" need it. */}
        {vipPhase !== "sent" ? (
          <div className={`mt-4 pt-4 border-t ${cfg.border} space-y-2`}>
            <p className={`text-xs font-bold ${cfg.text} mb-2`}>
              {level === "green" ? "רוצה לקחת את הקוח לרמה הבאה?" : "איך לשפר את הציון:"}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* PRO — full feedback */}
              <Link
                href="/pricing?upgrade=pro&from=cv"
                className="group bg-white border border-teal/30 hover:border-teal hover:bg-teal hover:text-white rounded-xl p-3 transition-all"
              >
                <div className="flex items-start gap-2">
                  <FileSearch size={18} className="text-teal group-hover:text-white shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-navy group-hover:text-white leading-tight">
                      פידבק מלא לשיפור הקוח
                    </p>
                    <p className="text-[11px] text-gray-500 group-hover:text-white/85 mt-0.5 leading-snug">
                      שדרוג ל-PRO · ניסוחים מדויקים, שיפור מבנה ו-ATS
                    </p>
                  </div>
                </div>
              </Link>

              {/* VIP — Coral writes the CV */}
              <button
                type="button"
                onClick={handleVipClick}
                disabled={pending || vipPhase === "sending"}
                className="group bg-white border border-purple-300 hover:border-purple-600 hover:bg-purple-600 hover:text-white rounded-xl p-3 transition-all text-right disabled:opacity-60"
              >
                <div className="flex items-start gap-2">
                  {vipPhase === "sending"
                    ? <Loader2 size={18} className="text-purple-600 group-hover:text-white shrink-0 mt-0.5 animate-spin" />
                    : <UserCheck size={18} className="text-purple-600 group-hover:text-white shrink-0 mt-0.5" />}
                  <div>
                    <p className="text-xs font-black text-navy group-hover:text-white leading-tight">
                      קורל תכין לי קורות חיים
                    </p>
                    <p className="text-[11px] text-gray-500 group-hover:text-white/85 mt-0.5 leading-snug">
                      שדרוג ל-VIP · אבחון אישי + קובץ מוכן תוך 7 ימי עסקים
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {vipPhase === "error" && vipError && (
              <p className="text-xs text-red-700 mt-2">{vipError}</p>
            )}
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-emerald-300 bg-white rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-emerald-800 mb-1">
                  קיבלנו את הבקשה שלך 🎯
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">
                  שלחנו לך מייל עם פרטי התהליך. <strong>קורל תיצור איתך קשר תוך 1-2 ימי עסקים</strong> לתיאום
                  שיחת אבחון של 30 דקות. תוך 7 ימי עסקים מהשיחה, קורות החיים החדשים יחכו לך במייל
                  ובמערכת.
                </p>
              </div>
            </div>
          </div>
        )}
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
                במסלול PRO מקבלים ציון מדויק 0-100, ניתוח לכל מערכת, וניסוח מחדש של החלקים
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
