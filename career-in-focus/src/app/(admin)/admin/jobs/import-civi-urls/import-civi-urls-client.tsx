"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

interface ImportResult {
  ok?: boolean;
  importedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  imported?: { title: string; id: string; category: string }[];
  skipped?: { url: string; reason: string }[];
  failed?: { url: string; reason: string }[];
  categoriesCovered?: string[];
  error?: string;
}

export function ImportCiviUrlsClient() {
  const [urlsText, setUrlsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const urls = urlsText
    .split(/\n+/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http"));

  async function trigger() {
    if (urls.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/import-civi-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = (await res.json()) as ImportResult;
      setResult(data);
      if (data.ok) setUrlsText(""); // clear textarea on success
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "שגיאת רשת" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-xs text-gray-400" aria-label="ניווט">
        <Link href="/admin" className="hover:text-teal">אדמין</Link>
        <ChevronLeft size={12} />
        <Link href="/admin/jobs" className="hover:text-teal">משרות</Link>
        <ChevronLeft size={12} />
        <span className="text-gray-600">ייבוא URLs</span>
      </nav>

      <div>
        <h1 className="text-2xl font-black text-navy mb-1 flex items-center gap-2">
          <Briefcase size={20} className="text-teal" />
          ייבוא משרות מהדבקת URLs
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          הדביקי כתובות URL של משרות (כל אחת בשורה נפרדת). המערכת תוריד אוטומטית את התוכן של כל משרה,
          תזהה תפקיד / חברה / מיקום / קטגוריה — ותוסיף את המשרות לאתר.
          <br />
          <strong>תומכת בעד 50 כתובות בפעם אחת.</strong> משרות שכבר קיימות יידלגו אוטומטית.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <label htmlFor="urls" className="text-xs font-bold text-navy mb-2 block">
          הדביקי כאן URLs (אחד בכל שורה)
        </label>
        <textarea
          id="urls"
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          dir="ltr"
          rows={10}
          placeholder="https://app.civi.co.il/promo/id=123456&src=16379
https://app.civi.co.il/promo/id=789012&src=16379
..."
          className="w-full font-mono text-sm rounded-xl border-2 border-gray-200 bg-white text-navy p-3 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
        />
        <p className="mt-2 text-xs text-gray-500">
          זוהו <strong className="text-teal">{urls.length}</strong> כתובות תקינות
        </p>

        <button
          type="button"
          onClick={trigger}
          disabled={loading || urls.length === 0}
          className="mt-4 inline-flex items-center gap-2 bg-teal text-white font-bold px-5 py-3 rounded-xl hover:bg-teal-dark disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading
            ? `מייבא ${urls.length} משרות...`
            : urls.length === 0
              ? "הדביקי URLs כדי להתחיל"
              : `ייבוא ${urls.length} משרות`}
        </button>
        <p className="mt-2 text-[11px] text-gray-400">
          ⏱ ~3 שניות לכל URL (החיפוש + ה-AI). 50 URLs ייקחו עד דקה.
        </p>
      </div>

      {result?.ok && (
        <>
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 mt-0.5" />
              <div>
                <p className="font-black text-emerald-800">סיום בהצלחה</p>
                <p className="text-sm text-emerald-700 mt-1">
                  נוצרו <strong>{result.importedCount}</strong> ·
                  דולגו <strong>{result.skippedCount}</strong> ·
                  נכשלו <strong>{result.failedCount}</strong>
                </p>
                {result.categoriesCovered && result.categoriesCovered.length > 0 && (
                  <p className="text-xs text-emerald-700 mt-2">
                    קטגוריות שהתווספו: {result.categoriesCovered.join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {result.imported && result.imported.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-black text-emerald-700 mb-2">משרות חדשות:</p>
              <ul className="space-y-1.5">
                {result.imported.map((j) => (
                  <li key={j.id} className="text-sm text-navy flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span className="flex-1">
                      <strong>{j.title}</strong>
                      <span className="text-xs text-gray-500"> — {j.category}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.failed && result.failed.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-black text-amber-800 mb-2">משרות שנכשלו:</p>
              <ul className="space-y-1.5">
                {result.failed.map((f, i) => (
                  <li key={i} className="text-xs text-amber-700 break-all">
                    <span className="font-mono">{f.url.slice(0, 60)}…</span> — {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/jobs"
              className="px-4 py-2 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy/90"
            >
              לדף המשרות הציבורי ←
            </Link>
            <Link
              href="/admin/jobs"
              className="px-4 py-2 border border-gray-200 text-slate-600 text-sm font-bold rounded-xl hover:border-teal/40"
            >
              לפאנל המשרות
            </Link>
          </div>
        </>
      )}

      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5" />
            <div>
              <p className="font-black text-red-700">שגיאה</p>
              <p className="text-sm text-red-600 mt-1">{result.error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
