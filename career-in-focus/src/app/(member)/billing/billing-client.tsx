"use client";

import { useState } from "react";
import {
  CreditCard, CheckCircle2, AlertCircle, Calendar, Loader2,
  X as CloseIcon, Heart, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { CANCELLATION_REASONS, type CancellationReasonCode } from "@/lib/billing";
import { cancelSubscription, reactivateSubscription } from "@/lib/actions/billing";

interface BillingData {
  plan:                "MEMBER" | "VIP" | "PREMIUM";
  planLabel:           string;
  accessStatus:        string;
  subscriptionStatus:  string;
  cardLast4:           string | null;
  nextChargeAt:        string | null;
  lastChargedAt:       string | null;
  nextAmountFormatted: string;
  chargeCount:         number;
  cancelledAt:         string | null;
  cancellationReason:  string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function BillingClient({ data }: { data: BillingData }) {
  const [showCancel, setShowCancel] = useState(false);
  const isCancelled = !!data.cancelledAt || data.subscriptionStatus === "CANCELLED";
  const stillHasAccess = data.accessStatus === "ACTIVE";

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-navy mb-1">המנוי שלך</h1>
          <p className="text-sm text-slate-500">
            ניהול תשלומים, חיובים עתידיים, וביטול בכל עת
          </p>
        </div>

        {/* Cancellation banner — when user has cancelled but still has access */}
        {isCancelled && stillHasAccess && data.nextChargeAt && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-black text-amber-900 mb-1">המנוי בוטל ✓</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                לא תחויב/י יותר. הגישה שלך נשארת פעילה עד {fmtDate(data.nextChargeAt)} —
                אחרי זה החשבון יעבור לסטטוס לא-פעיל. שינית/ה את דעתך?
              </p>
              <button
                type="button"
                onClick={async () => {
                  await reactivateSubscription();
                  window.location.reload();
                }}
                className="mt-3 inline-flex items-center gap-1.5 bg-teal text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-teal-dark transition-colors"
              >
                <Heart size={13} />
                לחזור למנוי
              </button>
            </div>
          </div>
        )}

        {/* Current plan */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
            <div>
              <p className="text-xs font-black text-teal uppercase tracking-wide mb-1">המסלול הנוכחי</p>
              <h2 className="text-xl font-black text-navy">{data.planLabel}</h2>
              {data.plan === "MEMBER" && data.chargeCount < 2 && !isCancelled && (
                <p className="text-xs text-amber-700 font-bold mt-1.5 inline-flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-full">
                  ✨ מבצע השקה — ₪29 לחודש לעוד {2 - data.chargeCount} {2 - data.chargeCount === 1 ? "מחזור" : "מחזורים"}, ואז ₪49 קבוע
                </p>
              )}
            </div>
            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
              stillHasAccess && !isCancelled
                ? "bg-emerald-100 text-emerald-700"
                : isCancelled
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-200 text-slate-700"
            }`}>
              {stillHasAccess && !isCancelled && <CheckCircle2 size={12} />}
              {stillHasAccess && !isCancelled
                ? "פעיל"
                : isCancelled
                ? "בוטל — נשאר עד תום הקיקלוס"
                : "לא פעיל"}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 mb-1 font-semibold">חיוב הבא</p>
              {isCancelled ? (
                <p className="text-navy">— (המנוי בוטל)</p>
              ) : (
                <p className="font-bold text-navy">
                  {data.nextAmountFormatted} ב-{fmtDate(data.nextChargeAt)}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1 font-semibold">חיוב אחרון</p>
              <p className="text-navy">{fmtDate(data.lastChargedAt)}</p>
            </div>
            {data.cardLast4 && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-400 mb-1 font-semibold">אמצעי תשלום</p>
                <p className="text-navy inline-flex items-center gap-2">
                  <CreditCard size={14} className="text-slate-400" />
                  ••••&nbsp;••••&nbsp;••••&nbsp;{data.cardLast4}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Action buttons — only show "cancel" when not already cancelled */}
        {!isCancelled && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowCancel(true)}
              className="text-sm text-slate-400 hover:text-red-600 transition-colors underline"
            >
              ביטול המנוי
            </button>
          </div>
        )}

        {/* FAQ-ish section */}
        <Card className="p-5 bg-slate-50/50 border-slate-100">
          <h3 className="font-black text-navy mb-3">איך הביטול עובד?</h3>
          <div className="space-y-2.5 text-sm text-slate-600 leading-relaxed">
            <div className="flex items-start gap-2">
              <Calendar size={14} className="text-teal mt-0.5 shrink-0" />
              <p>הגישה שלך נשארת מלאה עד תום מחזור החיוב הנוכחי — מה ששילמת עליו.</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-teal mt-0.5 shrink-0" />
              <p>לא יבוצעו חיובים נוספים. בלי החזרים, בלי הפתעות.</p>
            </div>
            <div className="flex items-start gap-2">
              <Heart size={14} className="text-teal mt-0.5 shrink-0" />
              <p>שינית/ה דעת? אפשר לחזור למנוי בכל רגע, באותם תנאים שהיו לך.</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Cancellation modal */}
      {showCancel && <CancelModal onClose={() => setShowCancel(false)} />}
    </div>
  );
}

// ─── Cancellation flow ─────────────────────────────────────────────────────

function CancelModal({ onClose }: { onClose: () => void }) {
  const [reason, setReason] = useState<CancellationReasonCode | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const reasonInfo = CANCELLATION_REASONS.find((r) => r.code === reason);

  async function submit() {
    if (!reason) return;
    setPending(true);
    try {
      await cancelSubscription(reason, note);
      setDone(true);
      // Reload after a short pause so the user sees the confirmation
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      alert(e instanceof Error ? e.message : "אירעה שגיאה");
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 text-slate-400 hover:text-navy transition-colors p-1"
          aria-label="סגירה"
        >
          <CloseIcon size={20} />
        </button>

        {done ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-navy mb-2">המנוי בוטל ✓</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              הגישה שלך נשארת מלאה עד תום מחזור החיוב הנוכחי.
              <br />תודה על השיתוף 💛
            </p>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <h3 className="text-xl font-black text-navy mb-1.5">לפני שתעזב/י…</h3>
            <p className="text-sm text-slate-500 mb-5 leading-relaxed">
              הביטול ייקח 10 שניות. הפידבק שלך עוזר לנו להשתפר ולהתאים את החוויה למשתמשים הבאים.
            </p>

            <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-2">
              מה הסיבה לביטול?
            </p>
            <div className="space-y-2 mb-4">
              {CANCELLATION_REASONS.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setReason(r.code)}
                  className={`w-full text-right rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all flex items-center justify-between ${
                    reason === r.code
                      ? "border-teal bg-teal/5 text-navy"
                      : "border-slate-200 text-slate-600 hover:border-teal/40"
                  }`}
                >
                  <span>{r.label}</span>
                  {reason === r.code && <CheckCircle2 size={14} className="text-teal" />}
                </button>
              ))}
            </div>

            {reasonInfo && (
              <div className="mb-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wide mb-2 block">
                  {reasonInfo.followUp}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="אופציונלי — שורה או שתיים יספיקו"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none resize-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="flex-1 bg-white text-navy font-bold text-sm px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-teal/60 transition-colors disabled:opacity-50"
              >
                <ArrowRight size={14} className="inline ml-1.5" />
                לא, נשארת
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!reason || pending}
                className="flex-1 bg-red-500 text-white font-bold text-sm px-4 py-3 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : null}
                {pending ? "מבטל..." : "אישור ביטול"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
