"use client";

import { useState } from "react";
import {
  Sparkles, Star, Target, Briefcase, TrendingUp,
  RefreshCw, ChevronDown, ChevronUp, Calendar, Award,
  Zap, GraduationCap, Trophy, ArrowUpRight, Flame,
} from "lucide-react";
import Link from "next/link";
import { generateCareerPassport } from "@/lib/actions/profile";

/**
 * The visual centrepiece of the profile page once a Career Passport
 * exists. A multi-layer dashboard, not a settings card:
 *
 *  1. Large hero — photo + name + target role + a circular score ring
 *     wrapping a massive number, plus the AI summary as a quote.
 *  2. Stat strip — 4 metrics (strengths / fit-roles / completed
 *     courses / acquired skills).
 *  3. Strengths showcase — each strength gets its own card.
 *  4. Fit-roles — large cards.
 *  5. Optional skill-gaps with deep-link to /skills.
 *  6. Action footer — "השתדרגתי" + collapsible deep-dive.
 *
 * Why so much: this is the user's payoff for filling out a long
 * questionnaire. It needs to feel like they earned an artefact, not
 * landed on a form page.
 */

interface PassportData {
  jobMatchScore: number;
  strengths: string[];
  skillGaps: string[];
  recommendations: string[];
  likelyFitRoles: string[];
  recommendedIndustries: string[];
  nextBestActions: string[];
  summary?: string | null;
  generatedAt: string;
}

interface UserDisplay {
  name: string;
  imageUrl?: string | null;
  targetRole?: string | null;
  currentRole?: string | null;
  yearsExperience?: number | null;
}

interface CompletionsCount {
  courses: number;
  skills: number;
}

interface Props {
  passport: PassportData;
  user: UserDisplay;
  completions?: CompletionsCount;
}

export function PassportHero({ passport, user, completions }: Props) {
  const [regenerating, setRegenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function regenerate() {
    setRegenerating(true);
    const r = await generateCareerPassport();
    setRegenerating(false);
    if (!r?.error) window.location.reload();
  }

  const initials =
    user.name?.split(" ").map((p) => p[0]).join("").slice(0, 2) || "U";
  const generatedDate = new Date(passport.generatedAt).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const score = passport.jobMatchScore;
  const scoreLabel =
    score >= 85 ? "מצוין" :
    score >= 70 ? "מאוד טוב" :
    score >= 55 ? "טוב, בדרך" :
    score >= 40 ? "בתחילת הדרך" : "התחלה טובה";

  // Circular progress — SVG sized so it scales nicely
  const ringRadius = 70;
  const ringCircum = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircum * (1 - score / 100);

  return (
    <div className="space-y-3">
      {/* ──────────────────── 1. Massive hero ──────────────────── */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl">
        {/* Layered background */}
        <div className="absolute inset-0 bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(62,207,207,0.25),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.18),transparent_50%)]" />

        {/* Animated decorative orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-20 w-[28rem] h-[28rem] bg-purple-500/15 rounded-full blur-3xl" />

        <div className="relative p-6 sm:p-10 text-white">
          {/* Top row: badge + last updated */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 bg-teal/15 backdrop-blur-sm border border-teal/30 text-teal px-4 py-1.5 rounded-full text-xs font-bold">
              <Sparkles size={12} />
              דרכון קריירה פעיל
            </div>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Calendar size={11} />
              עודכן: {generatedDate}
            </div>
          </div>

          {/* Center: avatar + identity + score ring */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-8 items-center">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar with glow */}
              <div className="relative shrink-0">
                <div className="absolute -inset-1.5 bg-gradient-to-br from-teal via-purple-400 to-teal rounded-3xl blur-md opacity-60" />
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.imageUrl}
                    alt={user.name}
                    className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-3xl object-cover border-2 border-white/20 shadow-2xl"
                  />
                ) : (
                  <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-br from-teal via-teal/80 to-purple-500/60 text-white text-5xl font-black flex items-center justify-center border-2 border-white/20 shadow-2xl">
                    {initials}
                  </div>
                )}
                <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-gradient-to-br from-teal to-purple-500 rounded-2xl border-4 border-navy flex items-center justify-center shadow-lg">
                  <Star size={16} className="text-white" />
                </div>
              </div>

              {/* Identity block */}
              <div className="text-center sm:text-right">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">פרופיל קריירה של</p>
                <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">
                  {user.name}
                </h1>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-x-4 gap-y-1.5 text-white/85 text-sm">
                  {user.targetRole && (
                    <span className="inline-flex items-center gap-1.5">
                      <Target size={14} className="text-teal" />
                      <span className="text-white/60">שואפת ל-</span>
                      <span className="font-bold text-teal">{user.targetRole}</span>
                    </span>
                  )}
                  {user.currentRole && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase size={14} className="text-white/50" />
                      {user.currentRole}
                    </span>
                  )}
                  {typeof user.yearsExperience === "number" && user.yearsExperience > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-white/60">
                      · {user.yearsExperience} שנות ניסיון
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Score ring */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative w-44 h-44">
                <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                  <circle
                    cx="80"
                    cy="80"
                    r={ringRadius}
                    fill="none"
                    stroke="url(#ring-grad)"
                    strokeWidth="10"
                    strokeDasharray={ringCircum}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#3ECFCF" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl sm:text-6xl font-black bg-gradient-to-br from-teal to-purple-300 bg-clip-text text-transparent">{score}</span>
                  <span className="text-xs text-white/60 -mt-1">% התאמה</span>
                </div>
              </div>
              <p className="text-sm font-bold text-teal mt-2">{scoreLabel}</p>
            </div>
          </div>

          {/* AI summary as quote */}
          {passport.summary && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex gap-3 items-start max-w-3xl">
                <div className="text-teal text-3xl leading-none font-serif">&ldquo;</div>
                <p className="text-white/80 text-sm sm:text-base leading-relaxed flex-1">
                  {passport.summary}
                </p>
                <div className="text-teal text-3xl leading-none font-serif self-end">&rdquo;</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────── 2. Stats strip ──────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip
          icon={<TrendingUp size={16} />}
          accent="teal"
          label="חוזקות"
          value={passport.strengths.length}
        />
        <StatChip
          icon={<Briefcase size={16} />}
          accent="blue"
          label="תפקידים מתאימים"
          value={passport.likelyFitRoles.length}
        />
        <StatChip
          icon={<GraduationCap size={16} />}
          accent="purple"
          label="קורסים שהשלמת"
          value={completions?.courses ?? 0}
          highlight={completions ? completions.courses > 0 : false}
        />
        <StatChip
          icon={<Zap size={16} />}
          accent="emerald"
          label="מיומנויות שרכשת"
          value={completions?.skills ?? 0}
          highlight={completions ? completions.skills > 0 : false}
        />
      </div>

      {/* ──────────────────── 3. Strengths showcase ──────────────────── */}
      {passport.strengths.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-teal/10 rounded-xl flex items-center justify-center">
              <Award size={16} className="text-teal" />
            </div>
            <h2 className="font-black text-navy text-base">החוזקות שלך</h2>
            <span className="text-xs bg-teal/10 text-teal rounded-full px-2 py-0.5 font-bold">
              {passport.strengths.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {passport.strengths.map((s, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal/5 to-teal/10 border border-teal/20 p-4 hover:border-teal/40 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-teal text-white rounded-lg flex items-center justify-center font-black text-xs shrink-0">
                    {i + 1}
                  </div>
                  <p className="font-bold text-navy text-sm leading-snug">{s}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──────────────────── 4. Fit roles ──────────────────── */}
      {passport.likelyFitRoles.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
              <Briefcase size={16} className="text-purple-600" />
            </div>
            <h2 className="font-black text-navy text-base">תפקידים שמתאימים לך</h2>
            <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-bold">
              {passport.likelyFitRoles.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {passport.likelyFitRoles.map((role, i) => (
              <Link
                key={i}
                href={`/jobs?q=${encodeURIComponent(role)}`}
                className="group inline-flex items-center gap-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 rounded-2xl px-4 py-2.5 text-sm font-bold text-purple-800 transition-all"
              >
                <span>{role}</span>
                <ArrowUpRight
                  size={12}
                  className="text-purple-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ──────────────────── 5. Skill gaps (with link) ──────────────────── */}
      {passport.skillGaps.length > 0 && (
        <div className="bg-gradient-to-l from-amber-50 to-white rounded-3xl p-5 sm:p-6 border border-amber-200 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                <Target size={16} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-black text-navy text-base">מה כדאי ללמוד הבא</h2>
                <p className="text-xs text-slate-500">סגירת הפערים האלה תעלה את הציון שלך</p>
              </div>
            </div>
            <Link
              href="/skills"
              className="text-amber-700 text-xs font-bold flex items-center gap-1 hover:underline"
            >
              לכל המשאבים
              <ArrowUpRight size={11} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {passport.skillGaps.map((g, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-white border border-amber-200 rounded-2xl px-3 py-1.5 text-xs font-bold text-amber-800"
              >
                <Flame size={10} className="text-amber-500" />
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ──────────────────── 6. Action footer ──────────────────── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={regenerate}
          disabled={regenerating}
          className="flex items-center gap-2 bg-gradient-to-l from-teal to-teal/80 hover:from-teal/90 hover:to-teal/70 disabled:opacity-50 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-sm shadow-teal/30 transition-all"
        >
          {regenerating ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              מעדכן את הדרכון...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              השתדרגתי? עדכוני דרכון
            </>
          )}
        </button>

        {(passport.recommendedIndustries.length > 0 ||
          passport.nextBestActions.length > 0 ||
          passport.recommendations.length > 0) && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp size={13} />
                סגור פירוט
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                פירוט מלא
              </>
            )}
          </button>
        )}

        <p className="text-xs text-gray-400 mr-auto hidden md:flex items-center gap-1">
          <Trophy size={11} className="text-amber-500" />
          השלמת קורס או מיומנות תעדכן את הדרכון אוטומטית
        </p>
      </div>

      {/* ──────────────────── Expanded deep-dive ──────────────────── */}
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {passport.recommendedIndustries.length > 0 && (
            <DeepBlock
              title="תחומים מומלצים"
              icon={<Briefcase size={14} className="text-blue-500" />}
              items={passport.recommendedIndustries}
              accent="blue"
            />
          )}
          {passport.nextBestActions.length > 0 && (
            <DeepBlock
              title="פעולות הבא"
              icon={<Sparkles size={14} className="text-teal" />}
              items={passport.nextBestActions}
              accent="teal"
            />
          )}
          {passport.recommendations.length > 0 && (
            <DeepBlock
              title="המלצות אישיות"
              icon={<Star size={14} className="text-purple-500" />}
              items={passport.recommendations}
              accent="purple"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatChip({
  icon, label, value, accent, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: "teal" | "blue" | "purple" | "emerald";
  highlight?: boolean;
}) {
  const accents = {
    teal: highlight ? "bg-teal/10 border-teal/30" : "bg-white border-slate-100",
    blue: highlight ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100",
    purple: highlight ? "bg-purple-50 border-purple-200" : "bg-white border-slate-100",
    emerald: highlight ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-100",
  };
  const iconBg = {
    teal: "bg-teal/10 text-teal",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    emerald: "bg-emerald-100 text-emerald-600",
  };
  return (
    <div className={`rounded-2xl border p-4 ${accents[accent]}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg[accent]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-black text-navy">{value}</p>
    </div>
  );
}

function DeepBlock({
  title, icon, items, accent,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  accent: "amber" | "blue" | "teal" | "purple";
}) {
  const accentClasses: Record<typeof accent, string> = {
    amber: "border-amber-200 bg-amber-50/40",
    blue: "border-blue-200 bg-blue-50/40",
    teal: "border-teal/30 bg-teal/5",
    purple: "border-purple-200 bg-purple-50/40",
  };
  return (
    <div className={`rounded-2xl border p-4 ${accentClasses[accent]}`}>
      <p className="text-xs font-bold text-navy mb-2 flex items-center gap-1.5">
        {icon}
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-slate-600 leading-relaxed flex items-start gap-1.5">
            <span className="text-slate-300 mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
