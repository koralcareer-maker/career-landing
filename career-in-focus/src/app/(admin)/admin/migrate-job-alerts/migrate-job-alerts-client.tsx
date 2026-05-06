"use client";

import { useState } from "react";
import Link from "next/link";
import { Database, Loader2, CheckCircle2, AlertCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface MigrateResult {
  ok?: boolean;
  log?: string[];
  error?: string;
}

export function MigrateJobAlertsClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrateResult | null>(null);

  async function trigger() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/migrate-job-alerts", { method: "POST" });
      const data = (await res.json()) as MigrateResult;
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
          <h1 className="text-2xl font-black text-navy">מיגרציה: התראות משרות</h1>
          <p className="text-gray-500 text-sm">פעולה חד-פעמית להוספת טבלת JobAlert וההגדרה לקבלת אימיילים.</p>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center shrink-0">
            <Database size={20} className="text-teal" />
          </div>
          <div>
            <h2 className="font-bold text-navy">מה זה עושה?</h2>
            <p className="text-sm text-gray-500 mt-1">
              מוסיף ל-DB את הטבלה שזוכרת אילו משרות כבר נשלחו לאיזה חבר, ושדה <code>emailJobAlerts</code>
              למשתמשים. ללא הפעלה — ה-cron של 8 בבוקר יקרוס. אחרי הפעלה אחת מוצלחת אין צורך לחזור.
              הפעולה אידמפוטנטית, אז גם אם תפעילי שוב לא יקרה כלום.
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
              מריץ מיגרציה...
            </span>
          ) : (
            <span>הפעלי מיגרציה</span>
          )}
        </Button>
      </Card>

      {result && result.ok && (
        <Card className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <CheckCircle2 size={20} className="text-green-600 mt-0.5" />
            <div>
              <h3 className="font-bold text-navy">סיום</h3>
              <p className="text-sm text-gray-500">המיגרציה רצה בהצלחה.</p>
            </div>
          </div>
          {result.log && (
            <ul className="mt-3 space-y-1">
              {result.log.map((step, i) => (
                <li key={i} className="text-sm text-slate-600">{step}</li>
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
