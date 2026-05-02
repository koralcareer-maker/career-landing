"use client";

import { useState } from "react";
import {
  Sparkles, Star, Target, Briefcase, TrendingUp,
  RefreshCw, ChevronDown, ChevronUp, Calendar,
} from "lucide-react";
import { generateCareerPassport } from "@/lib/actions/profile";

/**
 * Visual "career passport" hero — appears at the top of the profile page
 * once the user has generated their passport. The intent is to make this
 * feel like an artefact the user is proud to revisit (photo + match score
 * + the AI's verdict on their fit), not just a section in a settings page.
 *
 * Below the visual block:
 *  - "השתדרגתי? עדכון הדרכון" button to regenerate the passport when the
 *    user has improved their profile (added a course, skill, role, etc.)
 *  - A collapsible deep-dive with skill gaps + recommended actions.
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
}

interface Props {
  passport: PassportData;
  user: UserDisplay;
}

export function PassportHero({ passport, user }: Props) {
  const [regenerating, setRegenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function regenerate() {
    setRegenerating(true);
    const r = await generateCareerPassport();
    setRegenerating(false);
    if (!r?.error) window.location.reload();
  }

  const initials = user.name?.split(" ").map((p) => p[0]).join("").slice(0, 2) || "U";
  const generatedDate = new Date(passport.generatedAt).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const score = passport.jobMatchScore;
  const scoreLabel = score >= 80 ? "מצוין" : score >= 65 ? "טוב מאוד" : score >= 50 ? "בדרך הנכונה" : "מקום לצמיחה";

  return (
    <div className="space-y-3">
      {/* ─── Hero card ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a] text-white shadow-xl">
        {/* Decorative orbs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-teal/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-16 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          {/* Header strip — passport label */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 bg-teal/15 border border-teal/30 text-teal px-3 py-1 rounded-full text-xs font-bold">
              <Sparkles size={12} />
              דרכון הקריירה שלי
            </div>
            <div className="text-xs text-white/50 flex items-center gap-1">
              <Calendar size={11} />
              עודכן לאחרונה: {generatedDate}
            </div>
          </div>

          {/* Two-column hero: photo + identity / score */}
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-6">
            {/* Avatar */}
            <div className="flex justify-center sm:justify-start">
              <div className="relative">
                {user.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.imageUrl}
                    alt={user.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-teal to-teal/60 text-white text-3xl font-black flex items-center justify-center border-2 border-white/20 shadow-lg">
                    {initials}
                  </div>
                )}
                <div className="absolute -bottom-1.5 -left-1.5 w-7 h-7 bg-teal rounded-full border-2 border-navy flex items-center justify-center">
                  <Star size={12} className="text-white" />
                </div>
              </div>
            </div>

            {/* Identity */}
            <div className="text-center sm:text-right">
              <p className="text-xs text-white/50 mb-0.5">פרופיל קריירה של</p>
              <h1 className="text-2xl sm:text-3xl font-black mb-1">{user.name}</h1>
              {user.targetRole && (
                <p className="text-base text-white/80 flex items-center justify-center sm:justify-start gap-1.5">
                  <Target size={14} className="text-teal" />
                  שואפת ל-<span className="font-bold text-teal">{user.targetRole}</span>
                </p>
              )}
              {user.currentRole && !user.targetRole && (
                <p className="text-base text-white/70 flex items-center justify-center sm:justify-start gap-1.5">
                  <Briefcase size={14} className="text-teal" />
                  {user.currentRole}
                </p>
              )}
            </div>

            {/* Match score */}
            <div className="text-center sm:text-left">
              <p className="text-xs text-white/50 mb-1">ציון התאמה</p>
              <div className="text-5xl sm:text-6xl font-black text-teal leading-none">{score}%</div>
              <p className="text-sm text-white/70 mt-1">{scoreLabel}</p>
            </div>
          </div>

          {/* Summary */}
          {passport.summary && (
            <p className="text-sm text-white/75 leading-relaxed mt-6 max-w-2xl">
              &ldquo;{passport.summary}&rdquo;
            </p>
          )}

          {/* Quick chips: top 3 strengths + roles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {passport.strengths.length > 0 && (
              <div>
                <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp size={12} /> חוזקות מובילות
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {passport.strengths.slice(0, 4).map((s, i) => (
                    <span
                      key={i}
                      className="text-xs bg-white/10 border border-white/20 rounded-full px-3 py-1"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {passport.likelyFitRoles.length > 0 && (
              <div>
                <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Briefcase size={12} /> תפקידים שמתאימים לך
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {passport.likelyFitRoles.slice(0, 4).map((r, i) => (
                    <span
                      key={i}
                      className="text-xs bg-teal/15 border border-teal/30 text-teal rounded-full px-3 py-1 font-semibold"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Action row: regenerate + expand ─── */}
      <div className="flex items-center gap-2 px-1 flex-wrap">
        <button
          type="button"
          onClick={regenerate}
          disabled={regenerating}
          className="flex items-center gap-2 bg-teal hover:bg-teal/90 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
        >
          {regenerating ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              מעדכן את הדרכון...
            </>
          ) : (
            <>
              <Sparkles size={13} />
              השתדרגתי? עדכוני דרכון
            </>
          )}
        </button>

        {(passport.skillGaps.length > 0 || passport.recommendedIndustries.length > 0 ||
          passport.nextBestActions.length > 0 || passport.recommendations.length > 0) && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 bg-white border border-slate-100 hover:border-teal/40 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp size={13} />
                סגור פירוט
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                פירוט מלא — פערים, תחומים, פעולות מומלצות
              </>
            )}
          </button>
        )}

        <p className="text-xs text-gray-400 mr-auto hidden sm:inline">
          📚 השלמת קורס או מיומנות תעדכן את הדרכון אוטומטית
        </p>
      </div>

      {/* ─── Expanded deep-dive ─── */}
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {passport.skillGaps.length > 0 && (
            <DeepBlock
              title="פערי מיומנויות"
              icon={<Target size={14} className="text-amber-500" />}
              items={passport.skillGaps}
              accent="amber"
            />
          )}
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
              title="פעולות הבא המומלצות"
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
