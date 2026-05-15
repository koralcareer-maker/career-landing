"use client";

import { useState } from "react";
import { Gift, Share2, Copy, CheckCircle2 } from "lucide-react";

/**
 * Referral card — server-renders the user's unique signup link and a
 * copy/share button set. Sits on the dashboard so every member sees
 * their referral asset on day one.
 *
 * The reward mechanics live server-side (CardCom webhook credits a
 * free month to the referrer on the new user's first payment). The
 * card is pure presentation + a couple of share intents.
 *
 * Coral asked to push aggressively toward 500 paying members; the
 * link is positioned with a clear "your reward" line so members
 * actually click share instead of skipping it.
 */
export function ReferralCard({
  referralCode,
  referralCount,
  appUrl = "https://app.careerinfocus.co.il",
}: {
  referralCode: string | null;
  referralCount: number;
  appUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!referralCode) return null; // shouldn't happen post-backfill

  const link = `${appUrl}/signup?ref=${referralCode}`;
  const shareMessage =
    `הצטרפתי לקריירה בפוקוס — קהילה מקצועית למחפשי עבודה בישראל עם דרכון קריירה AI, ` +
    `מאמן AI אישי, אלפי משרות מעודכנות ולוח משרות עם ציון התאמה אישי. ` +
    `הצטרפו דרך הקישור שלי ותקבלו את החודש הראשון ב-19 ש"ח בלבד 👇\n${link}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers — fall back to prompt so the user can copy manually.
      window.prompt("העתיקי את הקישור:", link);
    }
  }

  function shareWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function shareNative() {
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      nav.share({
        title: "קריירה בפוקוס",
        text: shareMessage,
        url: link,
      }).catch(() => {
        // User cancelled or share failed silently — no-op.
      });
    } else {
      copyLink();
    }
  }

  return (
    <section
      dir="rtl"
      className="rounded-2xl border-2 border-teal/30 bg-gradient-to-br from-teal-pale via-white to-white p-5 sm:p-6 shadow-sm"
    >
      <header className="flex items-start gap-3 mb-3">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-teal text-white shadow-sm shrink-0">
          <Gift size={20} aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-navy">
            הזמיני חברות — קבלי חודש חינם
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed mt-0.5">
            על כל הצטרפות דרך הקישור שלך — חברה חדשה מקבלת מנוי ב-19 ש&quot;ח לחודש,
            ואת מקבלת חודש חינם נוסף למנוי שלך.
          </p>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2 overflow-hidden">
        <code
          className="text-xs sm:text-sm text-navy font-mono flex-1 min-w-0 truncate text-left direction-ltr"
          style={{ direction: "ltr" }}
        >
          {link}
        </code>
        <button
          type="button"
          onClick={copyLink}
          aria-label="העתקת קישור ההפניה"
          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors shrink-0 ${
            copied
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 hover:bg-slate-200 text-navy"
          }`}
        >
          {copied ? (
            <>
              <CheckCircle2 size={12} aria-hidden="true" />
              הועתק
            </>
          ) : (
            <>
              <Copy size={12} aria-hidden="true" />
              העתקה
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={shareWhatsApp}
          className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1eb955] text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
        >
          <Share2 size={14} aria-hidden="true" />
          שיתוף בוואטסאפ
        </button>
        <button
          type="button"
          onClick={shareNative}
          className="inline-flex items-center gap-1.5 bg-navy hover:bg-navy/90 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
        >
          <Share2 size={14} aria-hidden="true" />
          שיתוף
        </button>
        {referralCount > 0 && (
          <span className="text-xs text-slate-600 mr-auto">
            עד עכשיו: <strong className="text-navy">{referralCount}</strong> הצטרפו דרכך
          </span>
        )}
      </div>
    </section>
  );
}
