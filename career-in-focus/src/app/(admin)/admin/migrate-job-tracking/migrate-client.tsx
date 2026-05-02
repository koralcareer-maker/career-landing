"use client";

import { useState } from "react";
import Link from "next/link";
import { Database, Loader2, CheckCircle2, AlertCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface StepResult {
  step: string;
  ok: boolean;
  tolerated?: boolean;
  error?: string;
}

interface MigrateResponse {
  total?: number;
  ok?: number;
  failed?: number;
  results?: StepResult[];
  error?: string;
}

export function MigrateClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrateResponse | null>(null);

  async function trigger() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/migrate-job-tracking", { method: "POST" });
      const data = (await res.json()) as MigrateResponse;
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
        <Link href="/admin" className="text-gray-400 hover:text-navy">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-navy">מיגרציית מעקב חיפוש עבודה</h1>
          <p className="text-gray-500 text-sm">פעולה חד-פעמית — יוצרת טבלאות יומן ותזכורות לכל משרה.</p>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center shrink-0">
            <Database size={20} className="text-teal" />
          </div>
          <div>
            <h2 className="font-bold text-navy">מה הפעולה הזו עושה?</h2>
            <ul className="text-sm text-gray-500 mt-2 space-y-1 list-disc pr-5">
              <li>מוסיפה עמודות חדשות ל-JobApplication: <code>interviewDate</code>, <code>nextStep</code>, <code>priority</code>, <code>archived</code></li>
              <li>יוצרת טבלה <code>JobApplicationJournalEntry</code> (יומן רשומות לכל משרה)</li>
              <li>יוצרת טבלה <code>JobApplicationReminder</code> (תזכורות לכל משרה)</li>
              <li>פעולה אידמפוטנטית — אם משהו כבר קיים, פשוט מדלגים</li>
            </ul>
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
              מבצע מיגרציה...
            </span>
          ) : (
            <span>הפעלי מיגרציה</span>
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
                סה״כ: {result.total} · הצליחו: {result.ok} · נכשלו: {result.failed}
              </p>
            </div>
          </div>
          {result.results && (
            <ul className="space-y-1 mt-4">
              {result.results.map((r, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className={r.ok ? "text-green-600" : "text-red-600"}>
                    {r.ok ? (r.tolerated ? "↺" : "✓") : "✗"}
                  </span>
                  <span className={r.ok ? "text-slate-600" : "text-red-700"}>
                    {r.step}
                    {r.tolerated && <span className="text-gray-400 text-xs"> (כבר היה קיים)</span>}
                    {r.error && <span className="text-red-500 text-xs block">{r.error}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
