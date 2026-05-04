"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Briefcase, Calendar, Plus,
  CheckCircle2, AlertTriangle, Sparkles, Bell, ChevronLeft,
  TrendingUp, Target, Trophy, Flame, ArrowUpCircle,
  Search, Zap, Activity, BarChart3, Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Insight } from "@/lib/job-search-insights";
import type { ScoreBreakdown } from "@/lib/job-search-score";
import type { ActionTask } from "@/lib/daily-action-plan";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppDTO {
  id: string;
  company: string;
  role: string;
  status: string;
  source: string | null;
  dateApplied: string | null;
  nextFollowUp: string | null;
  interviewDate: string | null;
  nextStep: string | null;
  priority: number | null;
  archived: boolean;
  notes: string | null;
  jobLink: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReminderDTO {
  id: string;
  title: string;
  dueAt: string;
  type: string;
  completed: boolean;
  application: { id: string; company: string; role: string };
}

interface InterviewDTO {
  id: string;
  company: string;
  role: string;
  interviewDate: string;
}

interface Props {
  applications: AppDTO[];
  upcomingReminders: ReminderDTO[];
  upcomingInterviews: InterviewDTO[];
  insights: Insight[];
  scoreBreakdown: ScoreBreakdown;
  actionPlan: ActionTask[];
  weeklyGoal: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  SAVED: "נשמרה",
  FIT_CHECKED: "נבדקה התאמה",
  APPLIED: "הוגשה",
  PROACTIVE_OUTREACH: "פנייה יזומה",
  FOLLOWUP_SENT: "Follow-up",
  INTERVIEW_SCHEDULED: "ראיון נקבע",
  FIRST_INTERVIEW: "ראיון ראשון",
  ADVANCED_INTERVIEW: "ראיון מתקדם",
  TASK_HOME: "משימת בית",
  OFFER: "הצעה 🎉",
  REJECTED: "נדחתה",
  FROZEN: "מוקפאת",
};

const STATUS_COLORS: Record<string, string> = {
  SAVED: "bg-slate-100 text-slate-600",
  FIT_CHECKED: "bg-slate-100 text-slate-600",
  APPLIED: "bg-blue-100 text-blue-700",
  PROACTIVE_OUTREACH: "bg-orange-100 text-orange-700",
  FOLLOWUP_SENT: "bg-cyan-100 text-cyan-700",
  INTERVIEW_SCHEDULED: "bg-purple-100 text-purple-700",
  FIRST_INTERVIEW: "bg-purple-100 text-purple-700",
  ADVANCED_INTERVIEW: "bg-purple-200 text-purple-800",
  TASK_HOME: "bg-pink-100 text-pink-700",
  OFFER: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-gray-100 text-gray-500",
  FROZEN: "bg-gray-100 text-gray-500",
};

const ACTIVE_STATUSES = new Set([
  "APPLIED", "PROACTIVE_OUTREACH", "FOLLOWUP_SENT", "INTERVIEW_SCHEDULED",
  "FIRST_INTERVIEW", "ADVANCED_INTERVIEW", "TASK_HOME", "OFFER",
]);

// Status group → which statuses fall under each "stage" column
const PIPELINE_GROUPS: { key: string; label: string; statuses: string[] }[] = [
  { key: "saved", label: "שמורות", statuses: ["SAVED", "FIT_CHECKED"] },
  { key: "applied", label: "הוגשו", statuses: ["APPLIED", "PROACTIVE_OUTREACH", "FOLLOWUP_SENT"] },
  { key: "interview", label: "בראיונות", statuses: ["INTERVIEW_SCHEDULED", "FIRST_INTERVIEW", "ADVANCED_INTERVIEW", "TASK_HOME"] },
  { key: "offer", label: "הצעות", statuses: ["OFFER"] },
  { key: "closed", label: "סגורות", statuses: ["REJECTED", "FROZEN"] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TrackerClient({
  applications,
  upcomingReminders,
  upcomingInterviews,
  insights,
  scoreBreakdown,
  actionPlan,
  weeklyGoal,
}: Props) {
  const [filter, setFilter] = useState<"all" | "active" | "archived">("active");
  const [search, setSearch] = useState("");

  // Compute metrics
  const stats = useMemo(() => {
    const live = applications.filter((a) => !a.archived);
    return {
      total: live.length,
      applied: live.filter((a) => ACTIVE_STATUSES.has(a.status)).length,
      interviews: live.filter((a) =>
        ["FIRST_INTERVIEW", "ADVANCED_INTERVIEW", "INTERVIEW_SCHEDULED", "TASK_HOME"].includes(a.status)
      ).length,
      offers: live.filter((a) => a.status === "OFFER").length,
      rejected: live.filter((a) => a.status === "REJECTED").length,
      thisWeek: live.filter((a) => {
        const d = a.createdAt ? daysSince(a.createdAt) : null;
        return d !== null && d <= 7;
      }).length,
    };
  }, [applications]);

  // Filtered list
  const filtered = useMemo(() => {
    return applications.filter((a) => {
      if (filter === "active" && a.archived) return false;
      if (filter === "archived" && !a.archived) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !a.company.toLowerCase().includes(s) &&
          !a.role.toLowerCase().includes(s) &&
          !(a.notes ?? "").toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [applications, filter, search]);

  // Group filtered list by pipeline stage
  const grouped = useMemo(() => {
    return PIPELINE_GROUPS.map((g) => ({
      ...g,
      apps: filtered.filter((a) => g.statuses.includes(a.status)),
    }));
  }, [filtered]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">

      {/* ─── Hero — Effectiveness Score ─── */}
      <ScoreHero
        breakdown={scoreBreakdown}
        weeklyGoal={weeklyGoal}
        thisWeek={stats.thisWeek}
      />

      {/* ─── Daily Action Plan ─── */}
      <DailyActionPlan tasks={actionPlan} />

      {/* ─── KPI strip ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="פעילות" value={stats.applied} icon={<Briefcase size={18} className="text-teal" />} />
        <StatCard label="ראיונות" value={stats.interviews} icon={<Calendar size={18} className="text-purple-500" />} />
        <StatCard
          label="שיעור תגובה"
          value={`${scoreBreakdown.kpis.responseRate}%`}
          icon={<Activity size={18} className="text-orange-500" />}
          sub={
            scoreBreakdown.kpis.totalSubmitted > 0
              ? `מתוך ${scoreBreakdown.kpis.totalSubmitted} הוגשו`
              : "אין מספיק נתונים"
          }
        />
        <StatCard
          label="זמן תגובה ממוצע"
          value={
            scoreBreakdown.kpis.avgResponseDays !== null
              ? `${scoreBreakdown.kpis.avgResponseDays} ימים`
              : "—"
          }
          icon={<Clock size={18} className="text-cyan-500" />}
          sub="חציון מהגשה לתגובה"
        />
      </div>

      {/* ─── Insights ─── */}
      {insights.length > 0 && (
        <div>
          <h2 className="font-bold text-navy mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-teal" />
            תובנות מהמאמן שלך
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins) => <InsightCard key={ins.id} insight={ins} />)}
          </div>
        </div>
      )}

      {/* ─── Upcoming interviews + reminders row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-bold text-navy mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-purple-500" />
            ראיונות קרובים (14 ימים)
          </h2>
          {upcomingInterviews.length > 0 ? (
            <div className="space-y-2">
              {upcomingInterviews.map((iv) => {
                const days = daysUntil(iv.interviewDate);
                return (
                  <Link
                    key={iv.id}
                    href={`/progress/${iv.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-purple-100 bg-purple-50/40 hover:border-purple-200 transition-colors"
                  >
                    <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy text-sm truncate">{iv.role}</p>
                      <p className="text-purple-700 text-xs font-semibold">{iv.company}</p>
                    </div>
                    <div className="text-center shrink-0">
                      <p className="text-sm font-black text-purple-700">
                        {days === 0 ? "היום" : days === 1 ? "מחר" : `+${days}ד׳`}
                      </p>
                      <p className="text-[10px] text-gray-400">{formatDateTime(iv.interviewDate)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">אין ראיונות קרובים. כדאי להגדיר תאריך כשמתאמת.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-bold text-navy mb-3 flex items-center gap-2">
            <Bell size={16} className="text-teal" />
            תזכורות פתוחות
          </h2>
          {upcomingReminders.length > 0 ? (
            <div className="space-y-2">
              {upcomingReminders.slice(0, 5).map((r) => {
                const overdue = !r.completed && new Date(r.dueAt).getTime() < Date.now();
                return (
                  <Link
                    key={r.id}
                    href={`/progress/${r.application.id}`}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      overdue ? "bg-red-50 border-red-200" : "bg-white border-slate-100 hover:border-teal/30"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${overdue ? "bg-red-500 text-white" : "bg-teal/10 text-teal"}`}>
                      <Bell size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy text-sm truncate">{r.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {r.application.company} · {r.application.role}
                      </p>
                    </div>
                    <div className="text-center shrink-0">
                      <p className={`text-xs font-bold ${overdue ? "text-red-600" : "text-teal"}`}>
                        {overdue ? "באיחור" : formatDate(r.dueAt)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">אין תזכורות פתוחות. הוסיפי תזכורות ממסך משרה.</p>
          )}
        </Card>
      </div>

      {/* ─── Filters + search ─── */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1">
            {(["active", "all", "archived"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filter === f ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-navy"
                }`}
              >
                {f === "active" ? "פעילות" : f === "all" ? "הכל" : "ארכיון"}
              </button>
            ))}
          </div>
          <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי חברה / תפקיד / הערה..."
              className="flex-1 bg-transparent text-sm py-2 outline-none"
            />
          </div>
          <Link
            href="/progress/new"
            className="inline-flex items-center justify-center gap-1.5 bg-teal hover:bg-teal/90 text-white font-bold px-4 py-2 rounded-xl text-sm shrink-0"
          >
            <Plus size={14} /> הוסיפי משרה
          </Link>
        </div>
      </Card>

      {/* ─── Pipeline (kanban) ─── */}
      <div className="space-y-5">
        {grouped.map((g) => (
          g.apps.length > 0 && (
            <div key={g.key}>
              <h3 className="font-bold text-navy mb-3 flex items-center gap-2">
                <span>{g.label}</span>
                <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-semibold">
                  {g.apps.length}
                </span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.apps.map((a) => <ApplicationCard key={a.id} app={a} />)}
              </div>
            </div>
          )
        ))}

        {filtered.length === 0 && (
          <Card className="p-10 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Briefcase size={28} className="text-slate-400" />
            </div>
            <h3 className="font-bold text-navy mb-1">
              {applications.length === 0 ? "עוד אין מועמדויות" : "אין תוצאות"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {applications.length === 0
                ? "התחילי לעקוב אחרי כל מועמדות שאת מגישה — חברה, תפקיד, סטטוס."
                : "נסי חיפוש אחר או שני את הסינון."}
            </p>
            {applications.length === 0 && (
              <Link
                href="/progress/new"
                className="inline-flex items-center gap-2 bg-teal text-white font-bold px-5 py-2.5 rounded-xl"
              >
                <Plus size={14} /> הוסיפי משרה ראשונה
              </Link>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const BAND_COPY: Record<ScoreBreakdown["band"], { label: string; tagline: string; color: string; ring: string; pill: string }> = {
  excellent: {
    label: "מצוין",
    tagline: "הקצב והאיכות שלך מעולים. תמשיכ/י לעשות בדיוק את זה.",
    color: "from-emerald-500 to-emerald-600",
    ring: "ring-emerald-300",
    pill: "bg-emerald-100 text-emerald-700",
  },
  strong: {
    label: "חזק",
    tagline: "החיפוש בכיוון הנכון. שיפור קטן באחת מהקומפוננטות יקפיץ אותך לעמוד הבא.",
    color: "from-teal to-teal-dark",
    ring: "ring-teal-300",
    pill: "bg-teal/15 text-teal-dark",
  },
  building: {
    label: "בנייה",
    tagline: "יש בסיס, צריך עקביות. התוכנית היומית למטה היא הצעד הראשון.",
    color: "from-amber-500 to-orange-500",
    ring: "ring-amber-300",
    pill: "bg-amber-100 text-amber-700",
  },
  stalling: {
    label: "תקוע/ה",
    tagline: "הקצב נפל. בלי 1-2 פעולות יומיות עקביות, השוק לא יודע שאת/ה בחיפוש.",
    color: "from-red-500 to-rose-600",
    ring: "ring-red-300",
    pill: "bg-red-100 text-red-700",
  },
};

function ScoreHero({
  breakdown,
  weeklyGoal,
  thisWeek,
}: {
  breakdown: ScoreBreakdown;
  weeklyGoal: number;
  thisWeek: number;
}) {
  const bandInfo = BAND_COPY[breakdown.band];
  const goalPct = Math.min(100, Math.round((thisWeek / Math.max(1, weeklyGoal)) * 100));
  const goalIntent: "ontrack" | "behind" | "met" =
    thisWeek >= weeklyGoal ? "met" : thisWeek >= weeklyGoal * 0.5 ? "ontrack" : "behind";
  const goalBarColor =
    goalIntent === "met"
      ? "bg-emerald-500"
      : goalIntent === "ontrack"
      ? "bg-teal"
      : "bg-amber-500";

  return (
    <div className={`rounded-3xl bg-gradient-to-l ${bandInfo.color} text-white p-6 sm:p-8 relative overflow-hidden shadow-xl`}>
      <div className="absolute -top-16 -left-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-center">
        {/* Score gauge */}
        <div className="flex items-center gap-5">
          <div className={`relative w-28 h-28 rounded-full bg-white/15 backdrop-blur ring-4 ${bandInfo.ring} flex items-center justify-center shrink-0`}>
            <div className="text-center">
              <p className="text-4xl font-black leading-none">{breakdown.score}</p>
              <p className="text-[10px] font-bold opacity-80 mt-0.5">/ 100</p>
            </div>
          </div>
          <div>
            <div className={`inline-flex items-center gap-1.5 ${bandInfo.pill} px-2.5 py-1 rounded-full text-[11px] font-black mb-2`}>
              <Zap size={11} />
              {bandInfo.label}
            </div>
            <h1 className="text-xl sm:text-2xl font-black leading-tight">ציון יעילות חיפוש</h1>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed mt-1 max-w-md">
              {bandInfo.tagline}
            </p>
          </div>
        </div>

        {/* Weekly goal */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold opacity-80 inline-flex items-center gap-1">
              <Target size={11} />
              יעד שבועי
            </span>
            <span className="text-sm font-black">
              {thisWeek} / {weeklyGoal} הגשות
            </span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full ${goalBarColor} transition-all duration-500`}
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="text-[11px] opacity-80 mt-2 leading-relaxed">
            {goalIntent === "met"
              ? "השלמת את היעד השבועי 🎯"
              : goalIntent === "ontrack"
              ? `עוד ${weeklyGoal - thisWeek} הגשות עד סוף השבוע — בקצב טוב.`
              : `נשארו ${weeklyGoal - thisWeek} הגשות. ההמלצה: ${Math.ceil((weeklyGoal - thisWeek) / 5)} ביום עד סוף השבוע.`}
          </p>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.entries(breakdown.components) as Array<[string, ScoreBreakdown["components"][keyof ScoreBreakdown["components"]]]>).map(
          ([key, c]) => (
            <div key={key} className="bg-white/10 rounded-xl p-2.5 border border-white/10">
              <p className="text-[10px] font-bold opacity-80 leading-tight">{c.label}</p>
              <p className="text-lg font-black mt-0.5">{c.score}</p>
              <div className="h-1 bg-white/20 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-white/80" style={{ width: `${c.score}%` }} />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

const ACTION_INTENT_STYLES: Record<ActionTask["intent"], { card: string; pill: string; pillLabel: string }> = {
  urgent:   { card: "border-red-300 bg-red-50",         pill: "bg-red-500 text-white",     pillLabel: "דחוף" },
  behind:   { card: "border-amber-300 bg-amber-50",     pill: "bg-amber-500 text-white",   pillLabel: "מאחור" },
  ontrack:  { card: "border-teal/30 bg-teal-pale/40",   pill: "bg-teal text-white",        pillLabel: "בקצב" },
  momentum: { card: "border-emerald-300 bg-emerald-50", pill: "bg-emerald-500 text-white", pillLabel: "מומנטום" },
};

function DailyActionPlan({ tasks }: { tasks: ActionTask[] }) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-navy text-lg flex items-center gap-2">
          <Sparkles size={18} className="text-teal" />
          תוכנית היום שלך
        </h2>
        <span className="text-xs text-slate-400 font-semibold">
          {tasks.length} משימות
        </span>
      </div>
      <div className="space-y-2.5">
        {tasks.map((t, idx) => {
          const style = ACTION_INTENT_STYLES[t.intent];
          return (
            <div
              key={t.id}
              className={`rounded-2xl border-2 p-4 flex items-start gap-3 ${style.card}`}
            >
              <div className="w-8 h-8 rounded-xl bg-white text-navy font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-black text-navy text-sm leading-snug">{t.title}</p>
                  <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${style.pill}`}>
                    {style.pillLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{t.why}</p>
                {t.cta && (
                  <Link
                    href={t.cta.href}
                    className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-teal hover:underline"
                  >
                    {t.cta.label}
                    <ChevronLeft size={12} />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, sub, highlight,
}: {
  label: string; value: number | string; icon: React.ReactNode; sub?: string; highlight?: boolean;
}) {
  return (
    <Card className={`p-4 ${highlight ? "border-emerald-300 bg-emerald-50/50" : ""}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-navy">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </Card>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const styles: Record<Insight["severity"], string> = {
    good: "bg-emerald-50 border-emerald-200",
    warn: "bg-amber-50 border-amber-200",
    info: "bg-blue-50 border-blue-200",
    alert: "bg-red-50 border-red-200",
  };
  const iconStyles: Record<Insight["severity"], string> = {
    good: "bg-emerald-500 text-white",
    warn: "bg-amber-500 text-white",
    info: "bg-blue-500 text-white",
    alert: "bg-red-500 text-white",
  };
  const Icon = insight.severity === "good" ? CheckCircle2
    : insight.severity === "alert" ? AlertTriangle
    : insight.severity === "warn" ? Sparkles
    : TrendingUp;

  return (
    <div className={`rounded-2xl border p-4 ${styles[insight.severity]}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconStyles[insight.severity]}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-navy text-sm leading-snug">{insight.title}</p>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{insight.body}</p>
          {insight.cta && (
            <Link
              href={insight.cta.href}
              className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-teal hover:underline"
            >
              {insight.cta.label}
              <ChevronLeft size={12} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicationCard({ app }: { app: AppDTO }) {
  const days = daysSince(app.dateApplied ?? app.createdAt);
  const interviewDays = app.interviewDate ? daysUntil(app.interviewDate) : null;
  const interviewSoon = interviewDays !== null && interviewDays >= 0 && interviewDays <= 7;
  const statusLabel = STATUS_LABELS[app.status] ?? app.status;
  const statusColor = STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-600";

  return (
    <Link
      href={`/progress/${app.id}`}
      className="block bg-white rounded-2xl border border-slate-100 p-4 hover:border-teal/30 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-navy text-sm truncate">{app.role}</p>
          <p className="text-teal text-xs font-semibold truncate">{app.company}</p>
        </div>
        {app.priority === 3 && (
          <ArrowUpCircle size={16} className="text-red-500 shrink-0" aria-label="עדיפות גבוהה" />
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${statusColor}`}>
          {statusLabel}
        </span>
        {interviewSoon && (
          <Badge variant="purple" size="sm">
            ראיון בעוד {interviewDays === 0 ? "היום" : `${interviewDays} ימים`}
          </Badge>
        )}
      </div>

      {app.nextStep && (
        <p className="text-xs text-slate-600 leading-snug line-clamp-2 mb-2">
          <span className="text-gray-400 font-semibold">צעד הבא: </span>
          {app.nextStep}
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-slate-50">
        <span>{days !== null ? `${days} ימים` : "—"}</span>
        {app.source && <span className="truncate ml-2">{app.source}</span>}
      </div>
    </Link>
  );
}
