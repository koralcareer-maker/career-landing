"use client";

import { useState, useTransition } from "react";
import { MapPin, Building2, ExternalLink, Flame, Briefcase, ChevronDown, CheckCircle2, X, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMatchLabel } from "@/lib/utils";
import { trackApplicationFromJob } from "@/lib/actions/job-tracking";
import { dismissJob } from "@/lib/actions/dismiss-job";
import { JOB_CATEGORIES, mapFieldToCategory } from "@/lib/job-categories";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobItem {
  id: string;
  title: string;
  company: string;
  companyLogo: string | null;
  summary: string | null;
  location: string | null;
  /** One of the seven Hebrew regions, or null when unclassified. */
  region: string | null;
  field: string | null;
  experienceLevel: string | null;
  source: string | null;
  externalUrl: string | null;
  isHot: boolean;
  createdAt: Date | string;
  matchScore: number;
  /** Short human-readable Hebrew reasons explaining the match (max 3). */
  matchReasons?: string[];
}

const REGION_ORDER = ["צפון", "חיפה", "מרכז", "שפלה", "ירושלים", "דרום", "אילת"];

// ─── Open + Save-for-later Button ───────────────────────────────────────────
// Wraps the catalogue's "open external URL" CTA so clicking ALSO saves the
// job to the user's tracker as SAVED (i.e. "interested / to-do"), NOT as
// APPLIED. Coral's feedback after Rachel Zari's audit: too many people were
// just clicking through to read the description, and the old behaviour was
// flooding their trackers with phantom applications. Now they have to
// promote it to "הגשתי מועמדות" manually inside the tracker when they
// actually send a CV. Idempotent — duplicates are detected on the server.
function ApplyAndTrackButton({ job }: { job: JobItem }) {
  const [, startTransition] = useTransition();
  const [tracked, setTracked] = useState<"idle" | "added" | "exists">("idle");

  if (!job.externalUrl) {
    return (
      <Button size="sm" variant="secondary" className="w-full" disabled>
        פרטים בקרוב
      </Button>
    );
  }

  return (
    <a
      href={job.externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        // Fire-and-forget — don't block the link from opening.
        startTransition(async () => {
          try {
            const r = await trackApplicationFromJob(job.id);
            setTracked(r.isNew ? "added" : "exists");
          } catch {
            // Silent failure — link still opened in a new tab.
          }
        });
      }}
      className="w-full inline-flex items-center justify-center gap-2 bg-teal text-white font-semibold py-2.5 rounded-xl hover:bg-teal-dark transition-colors text-sm relative"
    >
      {tracked === "idle" && (
        <>
          לצפייה במשרה
          <ExternalLink size={13} />
        </>
      )}
      {tracked === "added" && (
        <>
          <CheckCircle2 size={14} /> נשמרה לעיון + נפתחה בלשונית
        </>
      )}
      {tracked === "exists" && (
        <>
          <CheckCircle2 size={14} /> כבר במעקב + נפתחה בלשונית
        </>
      )}
    </a>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: JobItem }) {
  const match = getMatchLabel(job.matchScore);
  const [dismissing, startDismiss] = useTransition();
  const [hidden, setHidden] = useState(false);

  function handleDismiss() {
    // Optimistic hide so the card disappears instantly; the server
    // action revalidates /jobs which removes it from the next render
    // entirely. If the action fails the card reappears.
    setHidden(true);
    startDismiss(async () => {
      const r = await dismissJob(job.id);
      if (r && "error" in r && r.error) {
        setHidden(false);
        console.error(r.error);
      }
    });
  }

  if (hidden) return null;

  return (
    <Card hover className="flex flex-col h-full relative overflow-hidden group">
      {/* Hot ribbon */}
      {job.isHot && (
        <div className="absolute top-0 start-0 bg-orange-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-br-xl flex items-center gap-1">
          <Flame size={10} />
          חם
        </div>
      )}

      {/* Dismiss (X) — hides this job for the current user only. Hidden
          until hover on desktop, always visible on touch / mobile. */}
      <button
        type="button"
        onClick={handleDismiss}
        disabled={dismissing}
        aria-label="הסתרת המשרה הזו"
        title="המשרה לא רלוונטית — הסתרה"
        className="absolute top-2 end-2 z-10 w-7 h-7 rounded-full bg-white/80 hover:bg-red-50 hover:text-red-500 text-gray-400 backdrop-blur flex items-center justify-center shadow-sm border border-slate-100 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-40"
      >
        <X size={13} />
      </button>

      <CardContent className="flex flex-col h-full">
        {/* Company logo + name */}
        <div className="flex items-center gap-3 mb-3 mt-1">
          <div className="w-11 h-11 bg-navy/8 rounded-xl flex items-center justify-center shrink-0 border border-gray-100">
            {job.companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={job.companyLogo} alt={job.company} className="w-8 h-8 object-contain rounded" />
            ) : (
              <span className="text-navy font-black text-base">{job.company.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {/* Title wraps to up to 2 lines (was truncated to one — Coral
             *  noted long titles were being cut off and looked broken).
             *  Company name bumped up so it doesn't feel buried. */}
            <h3 className="font-bold text-navy text-sm leading-snug line-clamp-2 break-words">{job.title}</h3>
            <p className="text-sm font-semibold text-navy/70 mt-0.5 break-words">{job.company}</p>
          </div>
          {/* Match score */}
          <div
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0 ${match.color}`}
          >
            <span className="text-sm font-black leading-none">{job.matchScore}%</span>
            <span className="text-[9px] font-medium leading-tight text-center mt-0.5">
              {job.matchScore >= 75 ? "גבוהה" : job.matchScore >= 50 ? "בינונית" : "נמוכה"}
            </span>
          </div>
        </div>

        {/* Summary */}
        {job.summary && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-3 flex-1">
            {job.summary}
          </p>
        )}

        {!job.summary && <div className="flex-1" />}

        {/* Meta badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.location && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 rounded-lg px-2 py-1">
              <MapPin size={11} />
              {job.location}
            </span>
          )}
          {job.field && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 rounded-lg px-2 py-1">
              <Briefcase size={11} />
              {job.field}
            </span>
          )}
          {job.experienceLevel && (
            <Badge variant="gray" size="sm">
              {job.experienceLevel}
            </Badge>
          )}
          {job.source && (
            <Badge variant="teal" size="sm">
              {job.source}
            </Badge>
          )}
        </div>

        {/* CTA — opens external URL AND auto-tracks into /progress */}
        <div className="pt-3 border-t border-gray-100 mt-auto">
          <ApplyAndTrackButton job={job} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-16 col-span-full">
      <div className="w-16 h-16 bg-teal-pale rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Briefcase size={28} className="text-teal" />
      </div>
      <h3 className="font-bold text-navy text-lg mb-2">
        {hasFilters ? "לא נמצאו משרות" : "אין משרות פעילות כרגע"}
      </h3>
      <p className="text-sm text-gray-400 max-w-xs mx-auto">
        {hasFilters
          ? "נסה לשנות את הסינון"
          : "המשרות החדשות יתווספו בקרוב. הפעל התראות כדי לא לפספס"}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function JobsClient({ jobs }: { jobs: JobItem[] }) {
  const [activeField, setActiveField] = useState("הכל");
  const [activeRegion, setActiveRegion] = useState("הכל");
  const [activeLevel, setActiveLevel] = useState("הכל");
  // Free-text search across the visible job text. Coral asked for an
  // open keyword search so members can pull up specific titles or
  // companies that the fixed-category filter doesn't surface.
  const [search, setSearch] = useState("");

  // Categories — fixed taxonomy from Coral (32 entries, sorted
  // alphabetically). We always show ALL of them in the filter, even
  // if currently 0 jobs match, so customers see the full menu and
  // it stays stable across data churn. mapFieldToCategory does
  // best-effort bucketing of the legacy free-form `field` strings
  // (until every job carries a canonical category at import time).
  const fields = ["הכל", ...JOB_CATEGORIES];
  // Regions: only show ones that actually have at least one job, plus "הכל".
  const regionsPresent = new Set(jobs.map((j) => j.region).filter(Boolean) as string[]);
  const regions = [
    "הכל",
    ...REGION_ORDER.filter((r) => regionsPresent.has(r)),
    ...(jobs.some((j) => !j.region) ? ["ללא אזור"] : []),
  ];
  const levels = ["הכל", ...new Set(jobs.map((j) => j.experienceLevel).filter(Boolean))] as string[];

  // Split the search query on whitespace so "data analyst" matches
  // a job whose title says "Data" and summary says "Analyst" — same
  // permissive AND-of-tokens behaviour as a typical job board.
  const queryTokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const filtered = jobs.filter((j) => {
    if (activeField !== "הכל" && mapFieldToCategory(j.field) !== activeField) return false;
    if (activeRegion === "ללא אזור" && j.region) return false;
    if (activeRegion !== "הכל" && activeRegion !== "ללא אזור" && j.region !== activeRegion) return false;
    if (activeLevel !== "הכל" && j.experienceLevel !== activeLevel) return false;
    if (queryTokens.length > 0) {
      const haystack = [j.title, j.company, j.summary, j.field, j.location]
        .filter(Boolean).join(" ").toLowerCase();
      if (!queryTokens.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });

  const hotCount = jobs.filter((j) => j.isHot).length;
  const hasFilters =
    activeField !== "הכל" ||
    activeRegion !== "הכל" ||
    activeLevel !== "הכל" ||
    search.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy mb-1">לוח משרות</h1>
          <p className="text-sm text-gray-500">
            {jobs.length} משרות זמינות
            {hotCount > 0 && (
              <span className="text-orange-500 font-semibold"> · {hotCount} 🔥 חמות</span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        {/* Free-text search — sits above the dropdowns so it reads as the
         *  primary way to find a specific job. The dropdowns narrow
         *  *within* the search result. */}
        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute top-1/2 -translate-y-1/2 end-3.5 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי כותרת, חברה או מילת מפתח…"
            className="w-full pe-10 ps-4 py-2.5 rounded-xl border border-gray-200 bg-white text-navy text-sm placeholder:text-gray-400 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-colors"
            dir="rtl"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="ניקוי החיפוש"
              className="absolute top-1/2 -translate-y-1/2 start-3.5 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Field filter */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">תחום</label>
            <div className="relative">
              <select
                value={activeField}
                onChange={(e) => setActiveField(e.target.value)}
                className="w-full appearance-none px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-colors"
              >
                {fields.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Region filter — coarse-grained location grouping. Most useful
              for "I want jobs near me" since exact-city filters were too
              narrow on a board with ~100s of cities. */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">אזור</label>
            <div className="relative">
              <select
                value={activeRegion}
                onChange={(e) => setActiveRegion(e.target.value)}
                className="w-full appearance-none px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-colors"
              >
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Experience level filter */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">רמת ניסיון</label>
            <div className="relative">
              <select
                value={activeLevel}
                onChange={(e) => setActiveLevel(e.target.value)}
                className="w-full appearance-none px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-colors"
              >
                {levels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">{filtered.length} תוצאות</span>
            <button
              onClick={() => {
                setActiveField("הכל");
                setActiveRegion("הכל");
                setActiveLevel("הכל");
                setSearch("");
              }}
              className="text-sm text-teal hover:underline"
            >
              נקה סינונים
            </button>
          </div>
        )}
      </div>

      {/* Job Cards Grid */}
      {filtered.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
