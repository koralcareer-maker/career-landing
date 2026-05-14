"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles, ExternalLink, Pin, Search,
  Newspaper, ChevronLeft, Clock, Filter,
  RefreshCw, Loader2, CheckCircle2,
} from "lucide-react";

/**
 * Updates feed — redesigned as a newsletter / news-site layout
 * (Coral wanted "כמו ניוזלטר, אתר חדשות"):
 *
 *   1. Newspaper masthead at the top — date, section name, search.
 *   2. Hero — largest article (first pinned, falls back to first
 *      featured, then first by date). One column, big headline,
 *      excerpt, byline.
 *   3. "Top stories" — 2-3 column grid of the next 4-6 stories,
 *      each as a compact card with headline + category + excerpt.
 *   4. "More from this week" — chronological feed of the remaining
 *      articles in a tight list format (no boxes, just dividers).
 *   5. Section dividers ("היום", "אתמול", "השבוע") group items by
 *      relative recency so the page reads top-down like a daily
 *      brief.
 *
 * Removed the heavy multi-coloured boxes that the previous version
 * had under each article ("למה זה חשוב", "תובנה", "הצעד הבא"). Those
 * still exist on the per-article page (/updates/[id]); the feed is
 * now a clean scan view.
 */

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

const CATEGORY_STYLE: Record<string, string> = {
  "שוק העבודה":              "text-teal-dark",
  "בינה מלאכותית ותעסוקה":   "text-purple-700",
  "הייטק וטכנולוגיה":         "text-blue-700",
  "גיוסים ופיטורים":          "text-orange-700",
  "שכר ותנאים":              "text-emerald-700",
  "מגמות קריירה":             "text-amber-700",
  "מיומנויות מבוקשות":        "text-pink-700",
};

const IMPORTANCE_DOT: Record<string, string> = {
  "חשוב למחפשי עבודה":   "bg-red-500",
  "דורש פעולה":          "bg-red-500",
  "משפיע על שוק העבודה": "bg-amber-500",
  "מגמה שכדאי להכיר":    "bg-teal",
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

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function dayBucket(iso: string): "today" | "yesterday" | "this-week" | "earlier" {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 7) return "this-week";
  return "earlier";
}

const BUCKET_LABEL: Record<string, string> = {
  today: "היום",
  yesterday: "אתמול",
  "this-week": "השבוע",
  earlier: "פרסומים קודמים",
};

// ─── Sub-components ─────────────────────────────────────────────────────────

/** The hero article at the top of the page — large headline + excerpt. */
function HeroStory({ a }: { a: ArticleDTO }) {
  const catColor = CATEGORY_STYLE[a.category] ?? "text-slate-700";
  const impDot = a.importanceLabel ? IMPORTANCE_DOT[a.importanceLabel] : null;

  return (
    <article className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
      {/* Headline-only hero — no image. Big number-style headline like a print front page. */}
      <div className="p-6 sm:p-10">
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider mb-4">
          <span className={catColor}>{a.category}</span>
          {a.importanceLabel && impDot && (
            <span className="inline-flex items-center gap-1.5 text-red-700">
              <span className={`w-1.5 h-1.5 rounded-full ${impDot}`} />
              {a.importanceLabel}
            </span>
          )}
          {a.isPinned && (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <Pin size={11} className="fill-amber-700" /> נעוץ
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-navy leading-[1.15] mb-4">
          <Link href={`/updates/${a.id}`} className="hover:text-teal-dark transition-colors">
            {a.hebrewTitle}
          </Link>
        </h1>

        <p className="text-base sm:text-lg text-slate-700 leading-relaxed mb-5 whitespace-pre-line">
          {a.summaryHebrew}
        </p>

        <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-700">{a.sourceName}</span>
            <span className="mx-1.5">·</span>
            {formatDateLong(a.publishedAt)}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href={`/updates/${a.id}`}
              className="inline-flex items-center gap-1 font-bold text-teal-dark hover:text-teal"
            >
              קריאת הכתבה המלאה
              <ChevronLeft size={14} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Medium card for the "top stories" grid — used 4-6 at a time. */
function MediumStory({ a }: { a: ArticleDTO }) {
  const catColor = CATEGORY_STYLE[a.category] ?? "text-slate-700";
  const impDot = a.importanceLabel ? IMPORTANCE_DOT[a.importanceLabel] : null;

  return (
    <article className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-teal/40 hover:shadow-md transition-all h-full flex flex-col">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider mb-2">
        <span className={catColor}>{a.category}</span>
        {a.importanceLabel && impDot && (
          <span className="inline-flex items-center gap-1 text-slate-600">
            <span className={`w-1 h-1 rounded-full ${impDot}`} />
            {a.importanceLabel}
          </span>
        )}
      </div>
      <h3 className="text-lg font-black text-navy leading-snug mb-2">
        <Link href={`/updates/${a.id}`} className="hover:text-teal-dark transition-colors">
          {a.hebrewTitle}
        </Link>
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-3 flex-1">
        {a.summaryHebrew}
      </p>
      <div className="text-[11px] text-slate-500 flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
        <span>
          <span className="font-bold text-slate-700">{a.sourceName}</span>
          <span className="mx-1">·</span>
          {formatDateShort(a.publishedAt)}
        </span>
        <Link
          href={`/updates/${a.id}`}
          className="font-bold text-teal-dark hover:text-teal inline-flex items-center gap-0.5"
        >
          המשך
          <ChevronLeft size={11} />
        </Link>
      </div>
    </article>
  );
}

/** Compact row — used in the "more from this week" list. */
function CompactRow({ a }: { a: ArticleDTO }) {
  const catColor = CATEGORY_STYLE[a.category] ?? "text-slate-700";
  return (
    <Link
      href={`/updates/${a.id}`}
      className="group block py-4 border-b border-slate-100 hover:bg-slate-50/50 -mx-3 px-3 rounded-lg transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span className={catColor}>{a.category}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">{formatDateShort(a.publishedAt)}</span>
          </div>
          <h4 className="text-base font-black text-navy leading-snug group-hover:text-teal-dark transition-colors">
            {a.hebrewTitle}
          </h4>
          <p className="text-sm text-slate-600 line-clamp-2 mt-1">{a.summaryHebrew}</p>
        </div>
        <ChevronLeft size={16} className="text-slate-300 group-hover:text-teal mt-1 shrink-0" />
      </div>
    </Link>
  );
}

/** Pinned admin announcement — pulled out of the news feed visually. */
function AnnouncementBlock({ u }: { u: AnnouncementDTO }) {
  return (
    <div className="bg-gradient-to-l from-amber-50 to-white border border-amber-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Pin size={12} className="fill-amber-700 text-amber-700" />
        <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
          הודעה מקורל
        </span>
      </div>
      <h3 className="text-lg font-black text-navy leading-snug mb-2">{u.title}</h3>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-2">
        {u.content}
      </p>
      {u.ctaUrl && (
        <a
          href={u.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-800 hover:text-amber-900"
        >
          {u.ctaText ?? "לפרטים"}
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function UpdatesClient({
  articles,
  announcements,
  isAdmin = false,
}: {
  articles: ArticleDTO[];
  announcements: AnnouncementDTO[];
  /** Admins see a "רענון תוכן" button that triggers the news +
   *  market-intel crons on demand (helpful when the daily cron hits
   *  a Gemini quota wall and the feed gets stale). */
  isAdmin?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("הכל");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  async function refreshContent() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const r = await fetch("/api/admin/refresh-news", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRefreshError(body.error ?? "הרענון נכשל");
        return;
      }
      setRefreshDone(true);
      // Reload after a beat so the user sees the success state, then
      // gets the fresh server-rendered feed.
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setRefreshError("הרענון נכשל. נסי שוב בעוד דקה.");
    } finally {
      setRefreshing(false);
    }
  }

  const categoriesPresent = new Set(articles.map((a) => a.category));
  const visibleCategories = ALL_CATEGORIES.filter((c) => c === "הכל" || categoriesPresent.has(c));

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (activeCategory !== "הכל" && a.category !== activeCategory) return false;
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
  }, [articles, search, activeCategory]);

  const hasFilters = activeCategory !== "הכל" || !!search;

  // Hero + grid + list split — based on the FILTERED list so the
  // layout adapts when the user narrows by category.
  const hero = filtered[0];
  const topGrid = filtered.slice(1, 7);
  const restList = filtered.slice(7);

  // Group the rest by day-bucket for section dividers.
  const grouped: Record<string, ArticleDTO[]> = {
    today: [],
    yesterday: [],
    "this-week": [],
    earlier: [],
  };
  for (const a of restList) {
    grouped[dayBucket(a.publishedAt)].push(a);
  }

  const today = new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">
      {/* ── Newspaper masthead ───────────────────────────────── */}
      <header className="mb-6">
        <div className="border-t-4 border-b border-navy py-4 mb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Newspaper size={20} className="text-teal-dark" aria-hidden="true" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-navy leading-none">
                  כל מה שקורה עכשיו
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  מהדורת השוק היומית · {today}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs text-slate-500 max-w-md sm:text-end">
                מודיעין שוק קריירה. סקירת הכותרות החשובות לחיפוש העבודה שלך,
                נסרקות אוטומטית כל יום.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={refreshContent}
                  disabled={refreshing || refreshDone}
                  aria-label="רענון תוכן ידני (אדמין)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-bold hover:bg-navy/90 disabled:opacity-60 transition-colors"
                >
                  {refreshDone ? (
                    <>
                      <CheckCircle2 size={12} aria-hidden="true" />
                      רוענן
                    </>
                  ) : refreshing ? (
                    <>
                      <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      סורק
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} aria-hidden="true" />
                      רענון תוכן
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          {refreshError && (
            <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {refreshError}
            </p>
          )}
        </div>

        {/* Search + category bar — looks like a newspaper section nav */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש בכל הכתבות..."
              aria-label="חיפוש בכתבות"
              className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 border border-transparent text-sm focus:bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 shrink-0">
            <Filter size={13} className="text-slate-400 shrink-0" aria-hidden="true" />
            {visibleCategories.map((c) => {
              const active = activeCategory === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
                    active
                      ? "bg-navy text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {hasFilters && (
          <div className="flex items-center justify-between text-xs mt-2 px-1">
            <span className="text-slate-500">{filtered.length} כתבות תואמות</span>
            <button
              type="button"
              onClick={() => { setSearch(""); setActiveCategory("הכל"); }}
              className="text-teal-dark hover:text-teal font-bold"
            >
              ניקוי סינונים
            </button>
          </div>
        )}
      </header>

      {/* ── Pinned admin announcements (above the feed) ──────── */}
      {announcements.length > 0 && (
        <div className="space-y-3 mb-6">
          {announcements.map((u) => <AnnouncementBlock key={u.id} u={u} />)}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {filtered.length === 0 && articles.length === 0 && (
        <div className="bg-white border border-slate-100 rounded-3xl text-center py-16 px-6">
          <div className="w-16 h-16 bg-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Newspaper size={28} className="text-teal-dark" aria-hidden="true" />
          </div>
          <h3 className="font-black text-navy text-lg mb-2">המהדורה הראשונה בדרך</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            המערכת סורקת את מקורות החדשות החשובים כל יום ומפיקה תקציר בעברית עם
            תובנות מעשיות. הכתבות יופיעו כאן ברגע שהסריקה הראשונה מסתיימת.
          </p>
        </div>
      )}

      {/* ── Empty after filter ────────────────────────────────── */}
      {filtered.length === 0 && articles.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-3xl text-center py-12 px-6">
          <p className="text-sm text-slate-600 mb-3">אין כתבות שמתאימות לסינון.</p>
          <button
            type="button"
            onClick={() => { setSearch(""); setActiveCategory("הכל"); }}
            className="text-sm text-teal-dark font-bold hover:text-teal inline-flex items-center gap-1"
          >
            <Sparkles size={14} />
            הצגת כל הכתבות
          </button>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────── */}
      {hero && (
        <div className="mb-6">
          <HeroStory a={hero} />
        </div>
      )}

      {/* ── Top stories grid (4-6 medium cards) ───────────────── */}
      {topGrid.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-2 mb-4">
            כותרות נוספות
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topGrid.map((a) => <MediumStory key={a.id} a={a} />)}
          </div>
        </section>
      )}

      {/* ── Rest — grouped by recency in a tight list ─────────── */}
      {restList.length > 0 && (
        <section className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 mb-6">
          {(["today", "yesterday", "this-week", "earlier"] as const).map((bucket) => {
            const items = grouped[bucket];
            if (items.length === 0) return null;
            return (
              <div key={bucket} className="mb-2 last:mb-0">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 mb-1">
                  <Clock size={11} aria-hidden="true" />
                  {BUCKET_LABEL[bucket]}
                </h3>
                {items.map((a) => <CompactRow key={a.id} a={a} />)}
              </div>
            );
          })}
        </section>
      )}

      {/* ── Footer note ───────────────────────────────────────── */}
      {articles.length > 0 && (
        <p className="text-center text-xs text-slate-400 my-6">
          הכתבות נסרקות אוטומטית ממקורות מובילים, מותאמות לעברית ומוגנות לפי
          רלוונטיות לחיפוש עבודה. רואים כתבה שלא רלוונטית?{" "}
          <Link href="/contact?topic=support" className="text-teal-dark hover:text-teal font-bold">
            הודיעו לנו.
          </Link>
        </p>
      )}
    </div>
  );
}

