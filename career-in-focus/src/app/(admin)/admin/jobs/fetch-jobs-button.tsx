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
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Bucket = "all" | "social" | "tech" | "management" | "professional";

const BUCKET_LABELS: Record<Bucket, string> = {
  all:          "הכל",
  social:       "חברה וקהילה",
  tech:         "טכנולוגיה",
  management:   "ניהול",
  professional: "מקצועי",
};

interface FetchResult {
  ok?: boolean;
  bucket?: string;
  companyCareers?: { inserted: number } | null;
  geminiFallback?: { totalInserted: number; totalSkipped: number };
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

      {result?.ok && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700 max-w-md">
          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
          <span>
            הוספו <strong>{totalInserted}</strong> משרות חדשות
            {result.geminiFallback?.totalSkipped ? `, דילגתי על ${result.geminiFallback.totalSkipped} (כפילויות)` : ""}.
            הקטלוג רוענן.
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
