"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { seedRoleCourses, type SeedCoursesResult } from "@/lib/actions/admin-imports";

const TAG_LABELS: Record<string, string> = {
  procurement:         "רכש",
  "financial-analyst": "אנליסט פיננסי",
  logistics:           "לוגיסטיקה",
  "import-export":     "ייבוא ייצוא",
};

export function SeedTrigger() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SeedCoursesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setResult(null);
    setError(null);
    try {
      const r = await seedRoleCourses();
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
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {pending ? "זורעת קורסים..." : "הוסיפי / עדכני את כל הקורסים"}
      </button>

      {error && (
        <div className="rounded-xl p-4 border bg-red-50 border-red-200 text-red-800 flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {result && (
        <div className="rounded-2xl p-5 border-2 bg-emerald-50 border-emerald-200">
          <div className="flex items-start gap-3 mb-3">
            <CheckCircle size={20} className="text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-lg font-black text-navy">{result.message}</p>
              <p className="text-sm text-slate-600 mt-0.5">
                {result.created > 0 && <>נוצרו <strong>{result.created}</strong> קורסים חדשים. </>}
                {result.updated > 0 && <>עודכנו <strong>{result.updated}</strong> קורסים קיימים.</>}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 mt-3 text-xs">
            <p className="font-black text-slate-500 mb-2">לפי תפקיד:</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(result.byTag).map(([tag, counts]) => (
                <div key={tag} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <span className="font-bold text-navy">{TAG_LABELS[tag] ?? tag}</span>
                  <span className="text-slate-600">
                    {counts.created > 0 && <span className="text-emerald-700 font-black">+{counts.created} </span>}
                    {counts.updated > 0 && <span className="text-amber-700 font-black">~{counts.updated}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-1 mt-3 text-sm font-bold text-teal hover:underline"
          >
            לעדכן קישורי CTA →
          </Link>
        </div>
      )}
    </div>
  );
}
