"use client";

import { useState, useTransition } from "react";
import { MapPin, Building2, ExternalLink, Flame, Briefcase, ChevronDown, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMatchLabel } from "@/lib/utils";
import { trackApplicationFromJob } from "@/lib/actions/job-tracking";

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

// ─── Apply + Track Button ───────────────────────────────────────────────────
// Wraps the catalogue's "open external URL" CTA so that clicking it ALSO
// adds the job to the user's /progress tracker (idempotent — duplicates
// are detected and skipped on the server). Uses startTransition so the
// external tab opens immediately without waiting for the server roundtrip.
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
          פרטים ומועמדות
          <ExternalLink size={13} />
        </>
      )}
      {tracked === "added" && (
        <>
          <CheckCircle2 size={14} /> נשמרה במעקב + נפתחה בלשונית
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

  return (
    <Card hover className="flex flex-col h-full relative overflow-hidden">
      {/* Hot ribbon */}
      {job.isHot && (
        <div className="absolute top-0 start-0 bg-orange-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-br-xl flex items-center gap-1">
          <Flame size={10} />
          חם
        </div>
      )}

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
            <h3 className="font-bold text-navy text-sm leading-snug truncate">{job.title}</h3>
            <p className="text-xs text-gray-400 truncate">{job.company}</p>
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

  // Collect unique filter values
  const fields = ["הכל", ...new Set(jobs.map((j) => j.field).filter(Boolean))] as string[];
  // Regions: only show ones that actually have at least one job, plus "הכל".
  const regionsPresent = new Set(jobs.map((j) => j.region).filter(Boolean) as string[]);
  const regions = [
    "הכל",
    ...REGION_ORDER.filter((r) => regionsPresent.has(r)),
    ...(jobs.some((j) => !j.region) ? ["ללא אזור"] : []),
  ];
  const levels = ["הכל", ...new Set(jobs.map((j) => j.experienceLevel).filter(Boolean))] as string[];

  const filtered = jobs.filter((j) => {
    if (activeField !== "הכל" && j.field !== activeField) return false;
    if (activeRegion === "ללא אזור" && j.region) return false;
    if (activeRegion !== "הכל" && activeRegion !== "ללא אזור" && j.region !== activeRegion) return false;
    if (activeLevel !== "הכל" && j.experienceLevel !== activeLevel) return false;
    return true;
  });

  const hotCount = jobs.filter((j) => j.isHot).length;
  const hasFilters = activeField !== "הכל" || activeRegion !== "הכל" || activeLevel !== "הכל";

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
