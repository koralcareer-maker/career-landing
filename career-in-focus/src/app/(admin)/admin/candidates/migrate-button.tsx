"use client";

/**
 * One-shot button on /admin/candidates that hits the
 * /api/admin/migrate-candidate-table endpoint to create the Candidate
 * table + indexes in Turso. Idempotent on the server side so Coral can
 * click it more than once without harm.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Database, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface MigrateResult {
  ok?: boolean;
  results?: Array<{ label: string; ok: boolean; error?: string }>;
  rowCount?: number | null;
  error?: string;
}

export function MigrateCandidateTableButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MigrateResult | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/migrate-candidate-table", { method: "POST" });
        const data = (await r.json().catch(() => ({}))) as MigrateResult;
        setResult(data);
        if (data.ok) router.refresh();
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
        title="יוצר את טבלת המועמדים ב-Turso. בטוח להריץ פעמיים, יש IF NOT EXISTS."
        className="inline-flex items-center gap-1.5 bg-teal hover:bg-teal-dark text-white font-bold text-sm px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
        {pending ? "מריץ migration..." : "הפעלת migration"}
      </button>
      {result?.ok && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700 max-w-md">
          <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
          <span>
            הטבלה מוכנה. {result.rowCount != null ? `יש בה ${result.rowCount} שורות.` : ""} רענני את הדף.
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
