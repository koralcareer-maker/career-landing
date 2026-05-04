"use client";

import { useMemo, useState } from "react";
import {
  Sparkles, ExternalLink, Pin, Search, ChevronDown,
  TrendingUp, AlertTriangle, Lightbulb, ArrowRight,
  Newspaper, Megaphone,
} from "lucide-react";
import { Card } from "@/components/ui/card";

// ─── Types from server ─────────────────────────────────────────────────────────

interface ArticleDTO {
  id:                string;
  hebrewTitle:       string;
  summaryHebrew:     string;
  whyItMatters:      string;
  jobSearchInsight:  string;
  recommendedAction: string;
  category:          string;
  importanceLabel:   string | null;
  relevanceScore:    number;
  sourceName:        string;
  originalUrl:       string;
  publishedAt:       string;
  isPinned:          boolean;
  isFeatured:        boolean;
}

interface AnnouncementDTO {
  id:        string;
  title:     string;
  content:   string;
  category:  string | null;
  createdAt: string;
  ctaText:   string | null;
  ctaUrl:    string | null;
}

// ─── Category styling ──────────────────────────────────────────────────────────

const CATEGORY_STYLE: Record<string, string> = {
  "שוק העבודה":              "bg-teal/10 text-teal-dark border-teal/30",
  "בינה מלאכותית ותעסוקה":   "bg-purple-100 text-purple-700 border-purple-200",
  "הייטק וטכנולוגיה":         "bg-blue-100 text-blue-700 border-blue-200",
  "גיוסים ופיטורים":          "bg-orange-100 text-orange-700 border-orange-200",
  "שכר ותנאים":              "bg-emerald-100 text-emerald-700 border-emerald-200",
  "מגמות קריירה":             "bg-amber-100 text-amber-700 border-amber-200",
  "מיומנויות מבוקשות":        "bg-pink-100 text-pink-700 border-pink-200",
};

const IMPORTANCE_STYLE: Record<string, string> = {
  "חשוב למחפשי עבודה":   "bg-red-500 text-white",
  "דורש פעולה":          "bg-red-500 text-white",
  "משפיע על שוק העבודה": "bg-amber-500 text-white",
  "מגמה שכדאי להכיר":    "bg-teal text-white",
};

const ALL_CATEGORIES = [
  "הכל",
  "שוק העבודה",
  "בינה מלאכותית ותעסוקה",
  "הייטק וטכנולוגיה",
  "גיוסים ופיטורים",
  "שכר ותנאים",
  "מגמות קריירה",
  "מיומנויות מבוקשות",
];

const IMPORTANCE_FILTERS = ["הכל", "חשוב למחפשי עבודה", "דורש פעולה", "משפיע על שוק העבודה", "מגמה שכדאי להכיר"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Article card ─────────────────────────────────────────────────────────────

function ArticleCard({ a }: { a: ArticleDTO }) {
  const catStyle = CATEGORY_STYLE[a.category] ?? "bg-slate-100 text-slate-700 border-slate-200";
  const impStyle = a.importanceLabel ? IMPORTANCE_STYLE[a.importanceLabel] ?? "bg-slate-500 text-white" : null;

  return (
    <Card
      className={`p-5 ${
        a.isFeatured ? "ring-2 ring-teal/40 bg-gradient-to-l from-teal-pale/30 to-white" : ""
      } ${a.isPinned ? "border-amber-300" : ""}`}
    >
      {/* Category + importance + pinned indicator */}
      <div className="flex items-center gap-2 flex-wrap mb-2.5">
        <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 border ${catStyle}`}>
          {a.category}
        </span>
        {impStyle && a.importanceLabel && (
          <span className={`text-[11px] font-black rounded-full px-2.5 py-1 ${impStyle}`}>
            {a.importanceLabel}
          </span>
        )}
        {a.isPinned && (
          <span className="text-[10px] font-bold inline-flex items-center gap-1 text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
            <Pin size={10} className="fill-amber-700" /> נעוץ
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-black text-navy leading-snug mb-2">
        {a.hebrewTitle}
      </h3>

      {/* Summary */}
      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line mb-4">
        {a.summaryHebrew}
      </p>

      {/* Why it matters */}
      {a.whyItMatters && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-wide mb-0.5">למה זה חשוב לך</p>
              <p className="text-sm text-amber-900 leading-relaxed">{a.whyItMatters}</p>
            </div>
          </div>
        </div>
      )}

      {/* Insight */}
      {a.jobSearchInsight && (
        <div className="bg-teal/8 border border-teal/30 rounded-xl p-3 mb-3" style={{ background: "rgba(62,207,207,0.08)" }}>
          <div className="flex items-start gap-2">
            <Lightbulb size={14} className="text-teal-dark mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-teal-dark uppercase tracking-wide mb-0.5">תובנה לחיפוש העבודה</p>
              <p className="text-sm text-navy leading-relaxed">{a.jobSearchInsight}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommended action */}
      {a.recommendedAction && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-3">
          <div className="flex items-start gap-2">
            <ArrowRight size={14} className="text-purple-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-purple-700 uppercase tracking-wide mb-0.5">הצעד הבא שלך</p>
              <p className="text-sm font-bold text-navy leading-relaxed">{a.recommendedAction}</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
        <div className="text-xs text-slate-400">
          {a.sourceName} · {formatDate(a.publishedAt)}
        </div>
        <a
          href={a.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline"
        >
          לקריאת הכתבה המלאה
          <ExternalLink size={12} />
        </a>
      </div>
    </Card>
  );
}

// ─── Announcement card (legacy admin posts, kept for community broadcasts) ───

function AnnouncementCard({ u }: { u: AnnouncementDTO }) {
  return (
    <Card className="p-5 border-amber-300 bg-gradient-to-l from-amber-50/50 to-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-black rounded-full px-2.5 py-1 bg-amber-200 text-amber-900 inline-flex items-center gap-1">
          <Pin size={10} className="fill-amber-900" />
          הודעה מקורל
        </span>
      </div>
      <h3 className="text-lg font-black text-navy leading-snug mb-2">{u.title}</h3>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-3">{u.content}</p>
      {u.ctaUrl && (
        <a
          href={u.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-teal hover:underline"
        >
          {u.ctaText ?? "לפרטים"}
          <ExternalLink size={12} />
        </a>
      )}
    </Card>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function UpdatesClient({
  articles,
  announcements,
}: {
  articles: ArticleDTO[];
  announcements: AnnouncementDTO[];
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("הכל");
  const [activeImportance, setActiveImportance] = useState("הכל");

  const categoriesPresent = new Set(articles.map((a) => a.category));
  const visibleCategories = ALL_CATEGORIES.filter((c) => c === "הכל" || categoriesPresent.has(c));
  const visibleImportance = IMPORTANCE_FILTERS.filter(
    (i) => i === "הכל" || articles.some((a) => a.importanceLabel === i),
  );

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (activeCategory !== "הכל" && a.category !== activeCategory) return false;
      if (activeImportance !== "הכל" && a.importanceLabel !== activeImportance) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !a.hebrewTitle.toLowerCase().includes(s) &&
          !a.summaryHebrew.toLowerCase().includes(s) &&
          !a.sourceName.toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [articles, search, activeCategory, activeImportance]);

  const hasFilters = activeCategory !== "הכל" || activeImportance !== "הכל" || !!search;

  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a] text-white p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-teal/15 rounded-full blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-teal/15 border border-teal/30 text-teal px-3 py-1 rounded-full text-xs font-bold mb-3">
            <TrendingUp size={12} />
            מודיעין שוק קריירה
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-2">כל מה שקורה עכשיו</h1>
          <p className="text-white/75 text-sm leading-relaxed max-w-xl">
            עדכונים חכמים על שוק העבודה, גיוסים, AI ומגמות קריירה — עם תובנות פרקטיות שיעזרו
            לך לחפש עבודה בצורה מדויקת יותר. המערכת סורקת את המקורות החשובים בעבורך כל 6 שעות.
          </p>
        </div>
      </div>

      {/* Pinned admin announcements (above the feed) */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((u) => <AnnouncementCard key={u.id} u={u} />)}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש בכתבות..."
            className="w-full px-3 ps-9 py-2 rounded-xl border border-slate-200 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">קטגוריה</label>
            <div className="relative">
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="w-full appearance-none px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
              >
                {visibleCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">חשיבות</label>
            <div className="relative">
              <select
                value={activeImportance}
                onChange={(e) => setActiveImportance(e.target.value)}
                className="w-full appearance-none px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
              >
                {visibleImportance.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
        {hasFilters && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">{filtered.length} כתבות</span>
            <button
              type="button"
              onClick={() => { setSearch(""); setActiveCategory("הכל"); setActiveImportance("הכל"); }}
              className="text-teal hover:underline font-semibold"
            >
              ניקוי סינונים
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && articles.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-teal-pale rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Newspaper size={28} className="text-teal" />
          </div>
          <h3 className="font-black text-navy text-lg mb-2">המערכת סורקת את השוק עבורך</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            כתבות חכמות יוצגו כאן ברגע שהסריקה הראשונה מסתיימת. בודק כל 6 שעות.
          </p>
        </div>
      )}

      {/* Empty after filtering */}
      {filtered.length === 0 && articles.length > 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-slate-500 mb-3">אין כתבות שמתאימות לסינון הזה.</p>
          <button
            type="button"
            onClick={() => { setSearch(""); setActiveCategory("הכל"); setActiveImportance("הכל"); }}
            className="text-sm text-teal font-bold hover:underline inline-flex items-center gap-1"
          >
            <Sparkles size={14} />
            הצג הכל
          </button>
        </div>
      )}

      {/* Feed */}
      {filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((a) => <ArticleCard key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
}
