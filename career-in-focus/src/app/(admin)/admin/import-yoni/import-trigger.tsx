"use client";

import { useState } from "react";
import { Sparkles, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { importYoniData, type ImportResult } from "@/lib/actions/admin-imports";

export function ImportTrigger() {
  const [pending, setPending] = useState(false);
  const [result, setResult]   = useState<ImportResult | null>(null);

  async function run() {
    setPending(true);
    setResult(null);
    try {
      const r = await importYoniData();
      setResult(r);
    } catch (e) {
      setResult({
        ok: false,
        message: e instanceof Error ? e.message : "שגיאה לא ידועה",
      });
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
            רגע, מייבאת...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            הפעילי ייבוא
          </>
        )}
      </button>

      {result && (
        <div
          className={`rounded-xl p-4 border flex items-start gap-3 ${
            result.ok
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {result.ok ? <CheckCircle size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
          <div className="flex-1">
            <p className="font-bold">{result.message}</p>
            {result.details && (
              <ul className="mt-2 text-xs space-y-0.5 opacity-90">
                <li>✓ פרופיל עודכן</li>
                {result.details.cvSet    && <li>✓ קורות חיים הוגדרו</li>}
                {result.details.photoSet && <li>✓ תמונת פרופיל הוגדרה</li>}
                <li>✓ {result.details.applicationsCreated} מועמדויות חדשות נוצרו</li>
                {result.details.applicationsSkipped > 0 && (
                  <li>↻ {result.details.applicationsSkipped} מועמדויות דולגו (כבר קיימות)</li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
