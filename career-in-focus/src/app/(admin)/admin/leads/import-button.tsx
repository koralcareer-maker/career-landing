"use client";

/**
 * One-click import button for the 81 historical leads from the old
 * marketing site (see lib/data/old-site-leads.ts). Hits the admin-only
 * POST /api/admin/import-old-leads, shows a result toast, then reloads
 * the page so the new rows appear in the lead list.
 *
 * Idempotent — re-clicking after a successful import only adds new
 * entries, never duplicates existing ones (see the dedup check in the
 * route handler).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Result = {
  ok?: boolean;
  total?: number;
  inserted?: number;
  skipped?: number;
  error?: string;
};

export function ImportOldLeadsButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const router = useRouter();

  function runImport() {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/import-old-leads", { method: "POST" });
        const data = (await r.json()) as Result;
        setResult(data);
        if (data.ok) router.refresh();
      } catch (e) {
        setResult({ error: String(e instanceof Error ? e.message : e) });
      }
    });
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-bold text-amber-900">ייבוא לידים היסטוריים מהאתר הישן</p>
          <p className="text-xs text-amber-700 mt-0.5">
            ייבוא חד-פעמי של 81 פניות שהשארת ב-Gmail מאז יוני 2025. בטוח להריץ שוב — לא ייוצרו כפילויות.
          </p>
        </div>
        <button
          type="button"
          onClick={runImport}
          disabled={pending}
          className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {pending ? "מייבא..." : "ייבא לידים"}
        </button>
      </div>

      {result?.ok && (
        <div className="mt-3 flex items-center gap-2 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={14} />
          <span>
            נוספו <strong>{result.inserted}</strong> לידים חדשים · דילגתי על <strong>{result.skipped}</strong>{" "}
            (כבר היו במערכת)
          </span>
        </div>
      )}
      {result?.error && (
        <div className="mt-3 flex items-center gap-2 bg-white border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">
          <AlertCircle size={14} />
          <span>שגיאה: {result.error}</span>
        </div>
      )}
    </div>
  );
}
