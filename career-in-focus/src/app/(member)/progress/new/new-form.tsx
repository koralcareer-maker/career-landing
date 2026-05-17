"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Briefcase,
  Sparkles,
  Wand2,
  Edit3,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { addJobApplication } from "@/lib/actions/progress";
import { APPLICATION_STATUS_LABELS } from "@/lib/utils";

const STATUS_OPTIONS = Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => ({ value, label }));

interface Prefill {
  company?: string | null;
  role?: string | null;
  location?: string | null;
  notes?: string | null;
  source?: string | null;
  jobLink?: string | null;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Stage 1 — paste a link and let AI auto-fill, or skip to manual entry.      */
/* ─────────────────────────────────────────────────────────────────────────── */

function UrlStage({
  onPrefill,
  onSkip,
  gender = null,
}: {
  onPrefill: (data: Prefill, autoFilledFields: Set<keyof Prefill>) => void;
  onSkip: () => void;
  gender?: string | null;
}) {
  const isM = gender === "m";
  const t = (f: string, m: string) => (isM ? m : f);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = url.trim().startsWith("http");

  async function handleExtract() {
    if (!isValidUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/applications/extract-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as Prefill & { ok?: boolean; error?: string; reason?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || t("לא הצלחתי לקרוא את הלינק. נסי קישור אחר או הכניסי ידנית.", "לא הצלחתי לקרוא את הלינק. נסה קישור אחר או הכנס ידנית."));
        setLoading(false);
        return;
      }
      const filled = new Set<keyof Prefill>();
      (["company", "role", "location", "notes", "source", "jobLink"] as const).forEach((k) => {
        if (data[k]) filled.add(k);
      });
      // Sites like LinkedIn block server-side scraping, so the API can
      // come back ok:true but with most fields null and reason="fetch-failed".
      // Surface a short heads-up so the user isn't confused why so few
      // fields auto-filled. We still proceed to Stage 2 — the URL itself
      // and the source were captured, which is half the work.
      if (data.reason === "fetch-failed" && !data.company && !data.role) {
        setError(
          t(
            "האתר חוסם קריאה אוטומטית (קורה בעיקר בלינקדאין). הקישור נשמר — תמלאי בעצמך את החברה והתפקיד.",
            "האתר חוסם קריאה אוטומטית (קורה בעיקר בלינקדאין). הקישור נשמר — תמלא בעצמך את החברה והתפקיד.",
          ),
        );
        // Brief pause so the user notices the message before stage 2 loads
        setTimeout(() => onPrefill(data, filled), 1500);
        setLoading(false);
        return;
      }
      onPrefill(data, filled);
    } catch {
      setError(t("שגיאת רשת. נסי שוב, או הכניסי ידנית.", "שגיאת רשת. נסה שוב, או הכנס ידנית."));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero card with gradient */}
      <Card className="relative overflow-hidden p-0 border-0 shadow-xl">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal/15 via-cream to-navy/5" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative px-6 py-10 sm:py-12 text-center">
          {/* Floating sparkle icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal to-teal/70 shadow-lg shadow-teal/30 mb-4">
            <Wand2 size={28} className="text-white" strokeWidth={2.2} />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-navy mb-2 tracking-tight">
            הוספת מועמדות חדשה
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            יש לך קישור למשרה? <strong className="text-navy">הדביקי כאן</strong> והבינה המלאכותית תמלא את הפרטים בשבילך תוך כמה שניות ✨
          </p>

          {/* URL input + magic button */}
          <div className="max-w-xl mx-auto mt-7">
            <div className="relative group">
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <Link2 size={18} className={`transition-colors ${loading ? "text-teal" : "text-gray-400 group-focus-within:text-teal"}`} />
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleExtract()}
                disabled={loading}
                dir="ltr"
                placeholder="https://linkedin.com/jobs/view/..."
                className="w-full h-14 pr-12 pl-4 text-sm font-mono bg-white border-2 border-gray-200 rounded-2xl shadow-sm focus:border-teal focus:ring-4 focus:ring-teal/15 focus:outline-none transition-all placeholder:text-gray-300 disabled:opacity-50"
              />
            </div>

            <button
              type="button"
              onClick={handleExtract}
              disabled={!isValidUrl || loading}
              className="mt-3 w-full h-14 inline-flex items-center justify-center gap-2 bg-gradient-to-br from-teal to-teal/85 text-white font-bold text-base rounded-2xl shadow-lg shadow-teal/30 hover:shadow-xl hover:shadow-teal/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none transition-all"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span className="flex items-center gap-2">
                    קוראים את המשרה
                    <span className="inline-flex gap-0.5">
                      <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  {t("מלאי לי את הפרטים", "מלא לי את הפרטים")}
                </>
              )}
            </button>

            {error && (
              <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-right">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">{error}</p>
              </div>
            )}
          </div>

          {/* Divider + manual option */}
          <div className="flex items-center gap-3 max-w-xs mx-auto mt-8 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">או</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-navy font-semibold py-2 px-4 rounded-xl hover:bg-white/60 transition-colors disabled:opacity-50"
          >
            <Edit3 size={15} />
            אין לי לינק — אני אכניס ידנית
          </button>
        </div>
      </Card>

      {/* Source hints */}
      <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> LinkedIn
        </span>
        <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> Civi
        </span>
        <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" /> AllJobs
        </span>
        <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Drushim
        </span>
        <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" /> אתרי חברות
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Stage 2 — review + edit + save. Pre-filled or blank based on stage 1.      */
/* ─────────────────────────────────────────────────────────────────────────── */

function FormStage({
  prefill,
  autoFilled,
  onBack,
  gender = null,
}: {
  prefill: Prefill;
  autoFilled: Set<keyof Prefill>;
  onBack: () => void;
  gender?: string | null;
}) {
  const isM = gender === "m";
  const t = (f: string, m: string) => (isM ? m : f);
  const [state, formAction, pending] = useActionState(addJobApplication, null);
  const router = useRouter();

  useEffect(() => {
    if (state && "success" in state && state.success && "id" in state && state.id) {
      router.push(`/progress/${state.id}?welcome=1`);
    }
  }, [state, router]);

  const isAuto = (key: keyof Prefill) => autoFilled.has(key);
  const fieldClass = (key: keyof Prefill) =>
    isAuto(key)
      ? "bg-teal/5 border-teal/30 ring-1 ring-teal/10"
      : "";

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      {/* Banner when AI filled */}
      {autoFilled.size > 0 && (
        <div className="flex items-start gap-3 bg-gradient-to-l from-teal/10 to-emerald-50 border border-teal/20 rounded-2xl p-4">
          <div className="w-9 h-9 rounded-xl bg-teal/15 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-teal" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-navy text-sm">{t("מילאתי בשבילך — תעברי לבדוק", "מילאתי בשבילך — עבור לבדוק")}</p>
            <p className="text-xs text-gray-600 mt-1">{t("השדות עם הרקע הירקרק מולאו אוטומטית. כל מה שלא מדויק, את יכולה לערוך לפני שמירה.", "השדות עם הרקע הירקרק מולאו אוטומטית. כל מה שלא מדויק, אתה יכול לערוך לפני שמירה.")}</p>
          </div>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
              חברה <span className="text-red-500">*</span>
              {isAuto("company") && <Sparkles size={11} className="text-teal" />}
            </label>
            <Input name="company" required defaultValue={prefill.company ?? ""} placeholder="Google, Wix, ..." className={fieldClass("company")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
              תפקיד <span className="text-red-500">*</span>
              {isAuto("role") && <Sparkles size={11} className="text-teal" />}
            </label>
            <Input name="role" required defaultValue={prefill.role ?? ""} placeholder="Product Manager, Senior Designer..." className={fieldClass("role")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">תאריך הגשה</label>
            <Input
              name="dateApplied"
              type="date"
              defaultValue={today}
              onClick={(e) => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch {} }}
              className="cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">סטטוס</label>
            <Select name="status" defaultValue="APPLIED" options={STATUS_OPTIONS} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
              מקור
              {isAuto("source") && <Sparkles size={11} className="text-teal" />}
            </label>
            <Input name="source" defaultValue={prefill.source ?? ""} placeholder="LinkedIn / חבר / אתר חברה..." className={fieldClass("source")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">איש קשר</label>
            <Input name="contactName" placeholder={t("שם המראיינת או המגייסת", "שם המראיין או המגייס")} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
              קישור למשרה
              {isAuto("jobLink") && <Sparkles size={11} className="text-teal" />}
            </label>
            <Input name="jobLink" type="url" defaultValue={prefill.jobLink ?? ""} placeholder="https://..." className={fieldClass("jobLink")} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
              הערות
              {isAuto("notes") && <Sparkles size={11} className="text-teal" />}
            </label>
            <Textarea
              name="notes"
              rows={3}
              defaultValue={prefill.notes ?? ""}
              placeholder="פרטים על המשרה / איש הקשר / מה ידוע עד כה..."
              className={fieldClass("notes")}
            />
          </div>
        </div>

        {state && "error" in state && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle size={16} />
            {state.error}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={pending}
            className="h-11 px-4 inline-flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:border-gray-300 transition-colors"
          >
            <ArrowLeft size={15} className="rotate-180" />
            חזרה
          </button>
          <Button
            type="submit"
            disabled={pending}
            className="flex-1 h-11 bg-gradient-to-br from-teal to-teal/85 hover:from-teal hover:to-teal text-white rounded-xl border-0 font-bold shadow-lg shadow-teal/25 hover:shadow-xl hover:shadow-teal/35 disabled:opacity-50 transition-all inline-flex items-center justify-center gap-2"
          >
            {pending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                שומרת...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                {t("הוסיפי מועמדות", "הוסף מועמדות")}
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Top-level — manages stage state.                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

export function NewApplicationForm({ gender = null }: { gender?: string | null }) {
  const [stage, setStage] = useState<"url" | "form">("url");
  const [prefill, setPrefill] = useState<Prefill>({});
  const [autoFilled, setAutoFilled] = useState<Set<keyof Prefill>>(new Set());

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/progress" className="text-gray-400 hover:text-navy transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <Briefcase size={20} className="text-teal" />
          <h1 className="text-2xl font-black text-navy">הוספת מועמדות</h1>
        </div>
      </div>

      {stage === "url" ? (
        <UrlStage
          gender={gender}
          onPrefill={(data, filled) => {
            setPrefill(data);
            setAutoFilled(filled);
            setStage("form");
          }}
          onSkip={() => {
            setPrefill({});
            setAutoFilled(new Set());
            setStage("form");
          }}
        />
      ) : (
        <FormStage
          prefill={prefill}
          autoFilled={autoFilled}
          gender={gender}
          onBack={() => setStage("url")}
        />
      )}
    </div>
  );
}
