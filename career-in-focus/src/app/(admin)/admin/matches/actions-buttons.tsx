"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Database, Play } from "lucide-react";

/** One-shot Turso migration trigger — shown only when the table is missing. */
export function MigrateMatchesButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/migrate-candidate-matches", { method: "POST" });
      const json = await res.json();
      setMsg(json.ok ? "הטבלה נוצרה ✓" : "שגיאה במיגרציה");
      if (json.ok) router.refresh();
    } catch {
      setMsg("שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={run} disabled={busy} className="border-amber-300 text-amber-700 hover:bg-amber-50">
      <Database size={14} /> {busy ? "יוצרת..." : msg ?? "יצירת טבלה (חד פעמי)"}
    </Button>
  );
}

/**
 * Manual matcher run over candidates from the last 30 days. notify is
 * intentionally false — offers still go out automatically for NEW
 * candidates via the signup hook and the nightly cron; this button is
 * for backfilling the matches screen without emailing anyone.
 */
export function RunMatchingButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/run-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sinceHours: 24 * 30, notify: false }),
      });
      const json = await res.json();
      setMsg(json.ok ? `נמצאו ${json.newMatches ?? 0} התאמות חדשות` : "שגיאה");
      if (json.ok) router.refresh();
    } catch {
      setMsg("שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={run} disabled={busy} className="border-teal/30 text-teal hover:bg-teal-pale">
      <Play size={14} /> {busy ? "מריצה התאמות..." : msg ?? "הרצת התאמות (בלי מיילים)"}
    </Button>
  );
}
