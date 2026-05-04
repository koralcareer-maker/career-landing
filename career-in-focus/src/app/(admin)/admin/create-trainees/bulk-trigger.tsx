"use client";

import { useState } from "react";
import { Sparkles, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { bulkCreateTrainees, type BulkResult } from "@/lib/actions/admin-imports";

export function BulkTrigger() {
  const [pending, setPending] = useState(false);
  const [result, setResult]   = useState<BulkResult | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function run() {
    setPending(true);
    setResult(null);
    setError(null);
    try {
      const r = await bulkCreateTrainees();
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה לא ידועה");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 bg-gradient-to-l from-teal to-teal-dark text-white font-black px-6 py-3.5 rounded-xl hover:shadow-lg hover:shadow-teal/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            רגע, יוצרת...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            צרי / תקני את כולם עכשיו
          </>
        )}
      </button>

      {error && (
        <div className="rounded-xl p-4 border bg-red-50 border-red-200 text-red-800 flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {result && (
        <div className="rounded-xl p-4 border bg-green-50 border-green-200 text-green-800 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle size={18} className="mt-0.5 shrink-0" />
            <p className="font-bold">
              {result.created > 0 && <>נוצרו: {result.created}, </>}
              {result.repaired > 0 && <>תוקנו: {result.repaired}, </>}
              {result.alreadyOk > 0 && <>בסדר כבר: {result.alreadyOk}</>}
              <span className="text-xs opacity-70"> (סה״כ {result.total})</span>
            </p>
          </div>

          <ul className="text-xs space-y-0.5 mt-2 ms-7">
            {result.details.map((d) => {
              const emoji = d.action === "created" ? "✨" :
                            d.action === "repaired" ? "🔧" :
                            d.action === "ok"       ? "✅" : "❌";
              const text = d.action === "created" ? "נוצר" :
                           d.action === "repaired" ? "תוקנה הסיסמה" :
                           d.action === "ok"       ? "כבר עובד" : `שגיאה: ${d.message}`;
              return (
                <li key={d.email}>
                  {emoji} <span className="font-mono">{d.email}</span> — {text}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
