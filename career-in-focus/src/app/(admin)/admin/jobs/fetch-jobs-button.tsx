"use client";

/**
 * Manual job-fetch trigger for the admin /admin/jobs page.
 *
 * Coral wants a one-click way to refresh the catalogue without
 * waiting for the nightly cron. The button POSTs to the existing
 * /api/admin/fetch-jobs endpoint with a bucket selector:
 *   all          - everything (company-board feed + every Gemini category)
 *   social       - the new חברה-וקהילה bucket only (fastest, smallest)
 *   tech         - tech queries only
 *   management   - management queries only
 *   professional - sales / marketing / CSM / etc.
 *
 * The endpoint can take ~5 minutes for the full run, so the button
 * shows a spinner and disables until the call resolves. Results
 * (inserted / skipped counts) are surfaced as a small banner below.
 *
 * SeedSocialJobsButton is a sibling component for when Gemini's
 * free-tier quota is exhausted — it inserts a curated set of 35
 * pre-vetted social-sector entries directly, no LLM call required.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, CheckCircle2, AlertCircle, Sprout, Flame } from "lucide-react";

type Bucket = "all" | "social" | "tech" | "management" | "professional";

const BUCKET_LABELS: Record<Bucket, string> = {
  all:          "הכל",
  social:       "חברה וקהילה",
  tech:         "טכנולוגיה",
  management:   "ניהול",
  professional: "מקצועי",
};

interface PerCategory {
  query: string;
  fetched: number;
  inserted: number;
  skipped: number;
  errors: string[];
}
interface FetchResult {
  ok?: boolean;
  bucket?: string;
  companyCareers?: { inserted: number } | null;
  geminiFallback?: {
    totalInserted: number;
    totalSkipped: number;
    perCategory?: PerCategory[];
  };
  error?: string;
}

export function FetchJobsButton() {
  const router = useRouter();
  const [bucket, setBucket] = useState<Bucket>("social");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FetchResult | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await fetch(`/api/admin/fetch-jobs?bucket=${bucket}`, {
          method: "POST",
        });
        const data: FetchResult = await r.json().catch(() => ({}));
        if (!r.ok) {
          setResult({ error: data.error ?? `שגיאה ${r.status}` });
          return;
        }
        setResult(data);
        router.refresh();
      } catch (e) {
        setResult({ error: String(e instanceof Error ? e.message : e) });
      }
    });
  }

  // Sum up inserted across both code paths for a single human number.
  const totalInserted =
    (result?.companyCareers?.inserted ?? 0) +
    (result?.geminiFallback?.totalInserted ?? 0);

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex items-center gap-2">
        <select
          value={bucket}
          onChange={(e) => setBucket(e.target.value as Bucket)}
          disabled={pending}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none disabled:opacity-50"
        >
          {(Object.keys(BUCKET_LABELS) as Bucket[]).map((b) => (
            <option key={b} value={b}>{BUCKET_LABELS[b]}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex items-center gap-1.5 bg-teal hover:bg-teal-dark text-white font-bold text-sm px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {pending ? "מושך, עד 5 דקות..." : "משוך משרות עכשיו"}
        </button>
      </div>

      {result?.ok && totalInserted > 0 && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700 max-w-md">
          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
          <span>
            הוספו <strong>{totalInserted}</strong> משרות חדשות
            {result.geminiFallback?.totalSkipped ? `, דילגתי על ${result.geminiFallback.totalSkipped} (כפילויות / קישורים מתים)` : ""}.
            הקטלוג רוענן.
          </span>
        </div>
      )}
      {result?.ok && totalInserted === 0 && (
        // Zero new jobs — most likely Gemini's grounded-search couldn't
        // find fresh listings, OR every candidate URL was a duplicate
        // or failed the URL-reachability probe. Surface the per-query
        // breakdown so Coral can see WHY without digging into Vercel
        // logs.
        <details className="bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 max-w-2xl" open>
          <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer font-bold">
            <AlertCircle size={14} />
            לא נוספו משרות חדשות. הקליקי לראות פירוט
          </summary>
          <div className="px-3 pb-3 space-y-1.5 max-h-72 overflow-y-auto">
            {result.geminiFallback?.perCategory?.length ? (
              result.geminiFallback.perCategory.map((c, i) => (
                <div key={i} className="bg-white rounded-lg px-3 py-2 border border-amber-100">
                  <div className="font-mono text-[11px] text-slate-500 mb-0.5" dir="ltr">{c.query}</div>
                  <div className="flex gap-3 text-[11px]">
                    <span>נמצאו: <strong>{c.fetched}</strong></span>
                    <span>נוספו: <strong className="text-emerald-700">{c.inserted}</strong></span>
                    <span>דולגו: <strong className="text-slate-500">{c.skipped}</strong></span>
                  </div>
                  {c.errors.length > 0 && (
                    <ul className="text-[11px] text-red-600 mt-1 font-mono break-all space-y-0.5 list-disc list-inside">
                      {c.errors.map((err, ei) => <li key={ei}>{err}</li>)}
                    </ul>
                  )}
                </div>
              ))
            ) : (
              <p className="text-[11px]">אין נתוני per-category. ייתכן ש-GEMINI_API_KEY חסר או שה-quota מוצה.</p>
            )}
          </div>
        </details>
      )}
      {result?.error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600 max-w-md">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{result.error}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Manual fallback when Gemini's quota is exhausted: insert 35 curated
 * social-sector entries from a hard-coded list. Each entry points at
 * either a Drushim/AllJobs/JobMaster/LinkedIn keyword-filtered search
 * (always fresh) or a major Israeli social-sector employer's career
 * landing page. Idempotent — re-clicking just skips duplicates.
 */
export function SeedSocialJobsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ inserted?: number; skipped?: number; error?: string } | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/seed-social-jobs", { method: "POST" });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setResult({ error: data.error ?? `שגיאה ${r.status}` });
          return;
        }
        setResult({ inserted: data.inserted, skipped: data.skipped });
        router.refresh();
      } catch (e) {
        setResult({ error: String(e instanceof Error ? e.message : e) });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        title="מייבא 35 משרות חברה וקהילה ידנית מ-Drushim/AllJobs/LinkedIn ועמותות. שמיש כש-Gemini במכסה."
        className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Sprout size={14} />}
        {pending ? "מייבא..." : "זרע חברה וקהילה (35)"}
      </button>
      {result?.inserted !== undefined && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700 max-w-md">
          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
          <span>
            נוספו <strong>{result.inserted}</strong> משרות, דולגו <strong>{result.skipped}</strong> כפילויות.
          </span>
        </div>
      )}
      {result?.error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600 max-w-md">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{result.error}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Imports Coral's hand-picked URLs as FEATURED jobs (isHot=true).
 * Calls /api/admin/seed-featured-jobs which holds the URL set she
 * pasted in chat. Idempotent — already-fetched URLs get PROMOTED to
 * isHot rather than skipped. Featured jobs sort to the top of /jobs
 * automatically via the existing orderBy chain.
 */
export function SeedFeaturedJobsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ inserted?: number; promoted?: number; error?: string } | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/seed-featured-jobs", { method: "POST" });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setResult({ error: data.error ?? `שגיאה ${r.status}` });
          return;
        }
        setResult({ inserted: data.inserted, promoted: data.promoted });
        router.refresh();
      } catch (e) {
        setResult({ error: String(e instanceof Error ? e.message : e) });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        title="מייבא את משרות ה-Civi שקורל בחרה ידנית, מסמן אותן כ'חמות' שיופיעו ראשונות בקטגוריה."
        className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Flame size={14} />}
        {pending ? "מייבא..." : "ייבא מועדפים של קורל"}
      </button>
      {result?.inserted !== undefined && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700 max-w-md">
          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
          <span>
            נוספו <strong>{result.inserted}</strong> מועדפות,
            {" "}<strong>{result.promoted}</strong> כבר היו במערכת וסומנו עכשיו כחמות.
          </span>
        </div>
      )}
      {result?.error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600 max-w-md">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{result.error}</span>
        </div>
      )}
    </div>
  );
}
