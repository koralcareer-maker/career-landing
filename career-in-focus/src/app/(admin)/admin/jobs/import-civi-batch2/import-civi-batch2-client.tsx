"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Loader2, CheckCircle2, AlertCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ImportResult {
  total?: number;
  createdCount?: number;
  skippedCount?: number;
  created?: { title: string; id: string }[];
  skipped?: { url: string; reason: string }[];
  error?: string;
}

export function ImportCiviBatch2Client() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function trigger() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/import-civi-jobs-batch2", { method: "POST" });
      const data = (await res.json()) as ImportResult;
      setResult(data);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "שגיאת רשת" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/jobs" className="text-gray-400 hover:text-navy">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-navy">ייבוא משרות מ-civi.co.il (אצווה 2)</h1>
          <p className="text-gray-500 text-sm">10 משרות נוספות שקורל בחרה. הכותרת והתיאור נסרקים אוטומטית מ-civi.</p>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center shrink-0">
            <Briefcase size={20} className="text-teal" />
          </div>
          <div>
            <h2 className="font-bold text-navy">פעולה חד-פעמית</h2>
            <p className="text-sm text-gray-500 mt-1">
              לחיצה תיצור עד 10 משרות. אם משרה כבר קיימת לפי ה-URL היא תדולג, אז אפשר ללחוץ שוב בבטחה.
              לאחר הייבוא, ה-cron של 8:00 בבוקר ישלח לכל חבר שהמשרה תואמת לפרופיל שלו ב-60%+ מייל אוטומטי.
            </p>
          </div>
        </div>

        <Button
          onClick={trigger}
          disabled={loading}
          className="w-full h-11 bg-teal hover:bg-teal/90 text-white rounded-xl border-0 font-bold disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              מייבא משרות...
            </span>
          ) : (
            <span>הפעלי ייבוא</span>
          )}
        </Button>
      </Card>

      {result && !result.error && (
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <CheckCircle2 size={20} className="text-green-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-navy">סיום</h3>
              <p className="text-sm text-gray-500">
                סך הכל: {result.total} · נוצרו: {result.createdCount} · דולגו: {result.skippedCount}
              </p>
            </div>
          </div>

          {result.created && result.created.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-green-700 mb-2">נוצרו:</p>
              <ul className="space-y-1">
                {result.created.map((j) => (
                  <li key={j.id} className="text-sm text-slate-600 truncate">
                    ✓ {j.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.skipped && result.skipped.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-amber-700 mb-2">דולגו:</p>
              <ul className="space-y-1">
                {result.skipped.map((j, i) => (
                  <li key={i} className="text-sm text-slate-600 truncate">
                    – {j.url} <span className="text-xs text-gray-400">({j.reason})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <Link
              href="/jobs"
              className="px-4 py-2 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy/90"
            >
              לדף המשרות
            </Link>
            <Link
              href="/admin/jobs"
              className="px-4 py-2 border border-gray-200 text-slate-600 text-sm font-bold rounded-xl hover:border-teal/40"
            >
              לפאנל המשרות
            </Link>
          </div>
        </Card>
      )}

      {result?.error && (
        <Card className="p-5 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-700">שגיאה</h3>
              <p className="text-sm text-red-600 mt-1">{result.error}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
