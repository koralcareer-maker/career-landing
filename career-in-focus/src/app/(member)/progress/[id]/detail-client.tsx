"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, Briefcase, Calendar, Clock, Edit3,
  Plus, Trash2, CheckCircle2, Circle, Sparkles, Bell,
  BookText, AlertCircle, ExternalLink, Archive,
  ArrowUpCircle, MessageSquare, PartyPopper, X,
  Search as SearchIcon, BookOpen, Wand2, Loader2, Copy as CopyIcon,
  FileText, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  addJournalEntry, deleteJournalEntry,
  addReminder, toggleReminderComplete, deleteReminder,
  updateApplicationCore, addQuickFollowupReminder,
} from "@/lib/actions/job-tracking";
import {
  analyzeApplication,
  type ApplicationAnalysis,
} from "@/lib/actions/job-application-ai";
import type { PrepStep } from "@/lib/job-search-insights";

// ─── Types from server ───────────────────────────────────────────────────────

interface AppDTO {
  id: string;
  company: string;
  role: string;
  status: string;
  dateApplied: string | null;
  nextFollowUp: string | null;
  interviewDate: string | null;
  nextStep: string | null;
  priority: number | null;
  archived: boolean;
  notes: string | null;
  source: string | null;
  jobLink: string | null;
  contactName: string | null;
  contactLinkedin: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JournalEntryDTO {
  id: string;
  occurredAt: string;
  text: string;
  tag: string | null;
}

interface ReminderDTO {
  id: string;
  dueAt: string;
  type: string;
  title: string;
  notes: string | null;
  completed: boolean;
  completedAt: string | null;
}

interface PrepBlock {
  title: string;
  steps: PrepStep[];
}

interface Props {
  application: AppDTO;
  journal: JournalEntryDTO[];
  reminders: ReminderDTO[];
  prep: PrepBlock | null;
}

// ─── Status / tag labels ─────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  SAVED: "נשמרה",
  FIT_CHECKED: "נבדקה התאמה",
  APPLIED: "הוגשה",
  PROACTIVE_OUTREACH: "פנייה יזומה",
  FOLLOWUP_SENT: "Follow-up נשלח",
  INTERVIEW_SCHEDULED: "ראיון נקבע",
  FIRST_INTERVIEW: "ראיון ראשון",
  ADVANCED_INTERVIEW: "ראיון מתקדם",
  TASK_HOME: "משימת בית",
  OFFER: "הצעת עבודה 🎉",
  REJECTED: "נדחתה",
  FROZEN: "מוקפאת",
};

const STATUS_OPTIONS = [
  "SAVED", "FIT_CHECKED", "APPLIED", "PROACTIVE_OUTREACH", "FOLLOWUP_SENT",
  "INTERVIEW_SCHEDULED", "FIRST_INTERVIEW", "ADVANCED_INTERVIEW", "TASK_HOME",
  "OFFER", "REJECTED", "FROZEN",
];

const TAG_LABELS: Record<string, string> = {
  INTERVIEW: "ראיון",
  FOLLOWUP: "Follow-up",
  NOTE: "הערה",
  FEELING: "תחושה",
  LEARNING: "תובנה",
  OUTREACH: "פנייה",
};

const TAG_COLORS: Record<string, string> = {
  INTERVIEW: "bg-purple-100 text-purple-700",
  FOLLOWUP: "bg-blue-100 text-blue-700",
  NOTE: "bg-gray-100 text-gray-700",
  FEELING: "bg-pink-100 text-pink-700",
  LEARNING: "bg-emerald-100 text-emerald-700",
  OUTREACH: "bg-orange-100 text-orange-700",
};

const REMINDER_TYPE_LABELS: Record<string, string> = {
  FOLLOWUP: "Follow-up",
  INTERVIEW_PREP: "הכנה לראיון",
  THANK_YOU: "מכתב תודה",
  RESEARCH: "מחקר",
  OTHER: "אחר",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("he-IL", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86400000);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ApplicationDetailClient({ application, journal: initialJournal, reminders: initialReminders, prep }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";

  const [app, setApp] = useState(application);
  const [journal, setJournal] = useState(initialJournal);
  const [reminders, setReminders] = useState(initialReminders);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [welcomeOpen, setWelcomeOpen] = useState(isWelcome);
  // AI analysis state — kicked off on demand (one model call per click)
  const [aiPending, setAiPending] = useState(false);
  const [analysis, setAnalysis] = useState<ApplicationAnalysis | null>(null);
  const [copied, setCopied] = useState(false);

  async function runAnalysis() {
    setAiPending(true);
    try {
      const r = await analyzeApplication(application.id);
      setAnalysis(r);
    } catch (e) {
      setAnalysis({
        status: "error",
        message: e instanceof Error ? e.message : "שגיאה בלתי צפויה",
      });
    } finally {
      setAiPending(false);
    }
  }

  async function copyFollowup() {
    if (!analysis?.followupMessage) return;
    try {
      await navigator.clipboard.writeText(analysis.followupMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — silently fail; the text is selectable */
    }
  }
  const [followupSet, setFollowupSet] = useState(false);

  // ─── Quick actions: status change, interview date, next step ───────────
  function changeStatus(newStatus: string) {
    setError("");
    setApp({ ...app, status: newStatus });
    startTransition(async () => {
      try {
        await updateApplicationCore({ applicationId: app.id, status: newStatus });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "עדכון נכשל");
      }
    });
  }

  function updateField<K extends keyof AppDTO>(key: K, value: AppDTO[K]) {
    setError("");
    setApp({ ...app, [key]: value });
    startTransition(async () => {
      try {
        const input: Parameters<typeof updateApplicationCore>[0] = { applicationId: app.id };
        if (key === "nextStep") input.nextStep = (value as string) || null;
        if (key === "interviewDate") input.interviewDate = (value as string) || null;
        if (key === "priority") input.priority = value as number | null;
        if (key === "archived") input.archived = value as boolean;
        await updateApplicationCore(input);
      } catch (e) {
        setError(e instanceof Error ? e.message : "עדכון נכשל");
      }
    });
  }

  // ─── Journal handlers ────────────────────────────────────────────────────
  const [journalText, setJournalText] = useState("");
  const [journalTag, setJournalTag] = useState<string>("NOTE");

  function submitJournal(e: React.FormEvent) {
    e.preventDefault();
    if (!journalText.trim()) return;
    const text = journalText;
    const tag = journalTag;
    setJournalText("");
    startTransition(async () => {
      try {
        const entry = await addJournalEntry({
          applicationId: app.id,
          text,
          tag: tag as "INTERVIEW" | "FOLLOWUP" | "NOTE" | "FEELING" | "LEARNING" | "OUTREACH",
        });
        setJournal([{
          id: entry.id,
          occurredAt: entry.occurredAt.toISOString(),
          text: entry.text,
          tag: entry.tag,
        }, ...journal]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "שמירה נכשלה");
        setJournalText(text); // restore
      }
    });
  }

  function deleteJournal(id: string) {
    if (!window.confirm("למחוק את הרשומה?")) return;
    setJournal(journal.filter((e) => e.id !== id));
    startTransition(async () => {
      try { await deleteJournalEntry(id); } catch { router.refresh(); }
    });
  }

  // ─── Reminder handlers ───────────────────────────────────────────────────
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDue, setReminderDue] = useState("");
  const [reminderType, setReminderType] = useState<string>("FOLLOWUP");

  function submitReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!reminderTitle.trim() || !reminderDue) return;
    const title = reminderTitle;
    const dueAt = reminderDue;
    const type = reminderType;
    setReminderTitle("");
    setReminderDue("");
    startTransition(async () => {
      try {
        const r = await addReminder({
          applicationId: app.id,
          title, dueAt,
          type: type as "FOLLOWUP" | "INTERVIEW_PREP" | "THANK_YOU" | "RESEARCH" | "OTHER",
        });
        setReminders([...reminders, {
          id: r.id, title: r.title, dueAt: r.dueAt.toISOString(), type: r.type,
          notes: r.notes, completed: r.completed,
          completedAt: r.completedAt?.toISOString() ?? null,
        }].sort((a, b) => a.dueAt.localeCompare(b.dueAt)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "שמירה נכשלה");
      }
    });
  }

  function toggleReminder(id: string) {
    setReminders(reminders.map((r) => r.id === id ? { ...r, completed: !r.completed } : r));
    startTransition(async () => {
      try { await toggleReminderComplete(id); } catch { router.refresh(); }
    });
  }

  function removeReminder(id: string) {
    if (!window.confirm("למחוק את התזכורת?")) return;
    setReminders(reminders.filter((r) => r.id !== id));
    startTransition(async () => {
      try { await deleteReminder(id); } catch { router.refresh(); }
    });
  }

  // ─── Computed ────────────────────────────────────────────────────────────
  const interviewCountdown = daysUntil(app.interviewDate);
  const daysSinceApplied = daysSince(app.dateApplied ?? app.createdAt);
  const hasInterviewSoon = interviewCountdown !== null && interviewCountdown >= 0 && interviewCountdown <= 7;

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">

      {/* ─── Header ─── */}
      <div className="flex items-start gap-3">
        <Link href="/progress" className="text-gray-400 hover:text-navy mt-1">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Briefcase size={20} className="text-teal" />
            <h1 className="text-2xl font-black text-navy truncate">{app.role}</h1>
          </div>
          <p className="text-teal font-bold text-sm mt-0.5">{app.company}</p>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
            {app.dateApplied && <span>הוגשה ב-{formatDate(app.dateApplied)}</span>}
            {daysSinceApplied !== null && <span>· לפני {daysSinceApplied} ימים</span>}
            {app.source && <span>· מקור: {app.source}</span>}
            {app.jobLink && (
              <a href={app.jobLink} target="_blank" rel="noopener noreferrer" className="text-teal hover:underline flex items-center gap-1">
                <ExternalLink size={12} /> משרה
              </a>
            )}
          </div>
        </div>
        {app.priority === 3 && <Badge variant="red" size="sm">עדיפות גבוהה</Badge>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* ─── Welcome banner (just submitted) ─── */}
      {welcomeOpen && (
        <Card className="p-6 border-teal/40 bg-gradient-to-l from-teal/5 to-purple-50 relative">
          <button
            type="button"
            onClick={() => setWelcomeOpen(false)}
            aria-label="סגור"
            className="absolute top-3 left-3 text-gray-400 hover:text-gray-700 p-1"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 bg-teal rounded-2xl flex items-center justify-center text-white shrink-0">
              <PartyPopper size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-navy">בשעה טובה — הוגשה ✨</h2>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                <span className="font-bold">{app.role}</span> ב-<span className="font-bold">{app.company}</span> נמצאת עכשיו במעקב.
                בואי נבנה מומנטום — הנה 3 פעולות שלוקחות פחות מדקה ועושות את ההבדל:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">

            {/* Action 1: Research the company via AI coach */}
            <a
              href={`/coaching?prompt=${encodeURIComponent(
                `מה כדאי לי לדעת על החברה "${app.company}" לפני שאני מתראיינת לתפקיד "${app.role}"? תני לי 5 נקודות עיקריות: מודל עסקי, חדשות מהחודש האחרון, תרבות ארגונית, אנשים בתפקידים דומים בלינקדאין, ו-2-3 שאלות חכמות שאני יכולה לשאול בראיון.`
              )}`}
              className="group flex flex-col gap-2 p-4 rounded-2xl bg-white border border-slate-100 hover:border-teal/40 hover:shadow-sm transition-all"
            >
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <SearchIcon size={16} />
              </div>
              <p className="font-bold text-navy text-sm">מה כדאי לדעת על {app.company}</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                שיחה ממוקדת עם המאמן — הוא ייתן לך מודל עסקי, תרבות, חדשות, ושאלות לראיון.
              </p>
              <span className="text-teal text-xs font-bold mt-auto group-hover:translate-x-[-3px] transition-transform">
                לשיחה ←
              </span>
            </a>

            {/* Action 2: Quick 7-day follow-up reminder */}
            <button
              type="button"
              disabled={followupSet || pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    const r = await addQuickFollowupReminder(app.id, 7);
                    setReminders([
                      ...reminders,
                      {
                        id: r.id,
                        title: r.title,
                        dueAt: r.dueAt.toISOString(),
                        type: r.type,
                        notes: r.notes,
                        completed: r.completed,
                        completedAt: r.completedAt?.toISOString() ?? null,
                      },
                    ].sort((a, b) => a.dueAt.localeCompare(b.dueAt)));
                    setFollowupSet(true);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "שמירה נכשלה");
                  }
                });
              }}
              className="group text-right flex flex-col gap-2 p-4 rounded-2xl bg-white border border-slate-100 hover:border-teal/40 hover:shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                {followupSet ? <CheckCircle2 size={16} /> : <Bell size={16} />}
              </div>
              <p className="font-bold text-navy text-sm">
                {followupSet ? "תזכורת נשמרה ✓" : "תזכורת follow-up בעוד שבוע"}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {followupSet
                  ? "כל הכבוד — בעוד שבוע אזכיר לך לחזור אל המגייס/ת אם אין תגובה."
                  : "אם אין תגובה תוך שבוע, מומלץ לשלוח follow-up קצר. אני אזכיר לך."}
              </p>
              {!followupSet && (
                <span className="text-teal text-xs font-bold mt-auto group-hover:translate-x-[-3px] transition-transform">
                  הוסיפי ←
                </span>
              )}
            </button>

            {/* Action 3: Interview prep course */}
            <a
              href="https://my.schooler.biz/s/106543/1765824391549?utm_source=HryKqw"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2 p-4 rounded-2xl bg-gradient-to-l from-navy to-[#1a3a4a] text-white hover:shadow-md transition-shadow"
            >
              <div className="w-9 h-9 bg-teal rounded-xl flex items-center justify-center shrink-0">
                <BookOpen size={16} className="text-white" />
              </div>
              <p className="font-bold text-sm">קורס ההכנה לראיונות שלי</p>
              <p className="text-xs text-white/70 leading-relaxed">
                סיפורי הצלחה, תרגול שאלות קשות, משוב חי. הכי טוב לעשות ימים לפני שמזמינים אותך.
              </p>
              <span className="text-teal text-xs font-bold mt-auto group-hover:translate-x-[-3px] transition-transform">
                לקורס ←
              </span>
            </a>
          </div>
        </Card>
      )}

      {/* ─── Interview countdown (when soon) ─── */}
      {hasInterviewSoon && (
        <Card className="p-5 border-purple-200 bg-gradient-to-l from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center text-white shrink-0">
              <Calendar size={22} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-purple-700">ראיון קרוב</p>
              <p className="text-xl font-black text-navy">
                {interviewCountdown === 0 ? "היום" :
                 interviewCountdown === 1 ? "מחר" :
                 `בעוד ${interviewCountdown} ימים`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(app.interviewDate)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Quick actions row ─── */}
      <Card className="p-5">
        <h2 className="font-bold text-navy mb-4 flex items-center gap-2">
          <Edit3 size={16} className="text-teal" />
          ניהול מהיר
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">סטטוס</label>
            <select
              value={app.status}
              onChange={(e) => changeStatus(e.target.value)}
              disabled={pending}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">תאריך ראיון</label>
            <input
              type="datetime-local"
              value={app.interviewDate ? new Date(app.interviewDate).toISOString().slice(0, 16) : ""}
              onChange={(e) => updateField("interviewDate", e.target.value || null)}
              disabled={pending}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">הצעד הבא שלך</label>
            <input
              type="text"
              value={app.nextStep ?? ""}
              onChange={(e) => setApp({ ...app, nextStep: e.target.value })}
              onBlur={(e) => updateField("nextStep", e.target.value || null)}
              placeholder="לדוגמה: לשלוח follow-up בעוד 4 ימים, להכין סיפור על מקרה X..."
              disabled={pending}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => updateField("priority", app.priority === 3 ? null : 3)}
              disabled={pending}
              className={`h-10 px-3 rounded-xl border text-xs font-bold ${
                app.priority === 3
                  ? "bg-red-500 text-white border-red-500 hover:bg-red-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-red-300"
              }`}
            >
              <ArrowUpCircle size={14} className="ml-1" />
              {app.priority === 3 ? "סמני כלא דחוף" : "סמני כעדיפות גבוהה"}
            </Button>
            <Button
              type="button"
              onClick={() => updateField("archived", !app.archived)}
              disabled={pending}
              className={`h-10 px-3 rounded-xl border text-xs font-bold ${
                app.archived
                  ? "bg-gray-200 text-gray-700 border-gray-200"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              <Archive size={14} className="ml-1" />
              {app.archived ? "שחזרי" : "ארכבי"}
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── AI Analysis ─── */}
      <Card className="p-5 border-purple-200 bg-gradient-to-l from-purple-50/40 to-pink-50/40">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="font-bold text-navy flex items-center gap-2">
            <Wand2 size={16} className="text-purple-600" />
            ניתוח AI של המועמדות הזו
          </h2>
          {analysis?.generatedAt && (
            <span className="text-[11px] text-slate-400">
              נוצר ב-{new Date(analysis.generatedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          הצעת follow-up מוכנה לשליחה, התאמות ספציפיות לקו״ח, וצעד הבא הכי משפיע — מותאם לפרופיל ולסטטוס הנוכחי.
        </p>

        {!analysis && (
          <button
            type="button"
            onClick={runAnalysis}
            disabled={aiPending}
            className="inline-flex items-center gap-2 bg-gradient-to-l from-purple-600 to-pink-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:shadow-md hover:shadow-purple-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {aiPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {aiPending ? "מנתח..." : "נתח/י את המועמדות"}
          </button>
        )}

        {analysis?.status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
            <p>{analysis.message ?? "שגיאה לא ידועה"}</p>
          </div>
        )}

        {analysis?.status === "missing_key" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <p>{analysis.message ?? "ה-AI לא זמין כרגע"}</p>
          </div>
        )}

        {analysis?.status === "ok" && (
          <div className="space-y-3">
            {/* Next action — most important, top */}
            {analysis.nextAction && (
              <div className="bg-white rounded-xl border border-purple-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowRight size={14} className="text-purple-600" />
                  <p className="text-xs font-black text-purple-700 uppercase tracking-wide">צעד הבא</p>
                </div>
                <p className="text-sm font-bold text-navy leading-relaxed">{analysis.nextAction}</p>
              </div>
            )}

            {/* Follow-up message — copy-ready */}
            {analysis.followupMessage && (
              <div className="bg-white rounded-xl border border-teal/30 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-teal" />
                    <p className="text-xs font-black text-teal-dark uppercase tracking-wide">הודעת follow-up מוכנה</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyFollowup}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal hover:underline"
                  >
                    <CopyIcon size={12} />
                    {copied ? "הועתק ✓" : "העתק/י"}
                  </button>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {analysis.followupMessage}
                </p>
              </div>
            )}

            {/* CV suggestions */}
            {analysis.cvSuggestions && analysis.cvSuggestions.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} className="text-amber-600" />
                  <p className="text-xs font-black text-amber-700 uppercase tracking-wide">התאמות לקו״ח עבור המשרה הזו</p>
                </div>
                <ul className="space-y-1.5">
                  {analysis.cvSuggestions.map((s, i) => (
                    <li key={i} className="text-sm text-slate-700 leading-relaxed flex gap-2">
                      <span className="text-amber-600 font-black shrink-0">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={runAnalysis}
              disabled={aiPending}
              className="text-xs text-slate-500 hover:text-teal font-semibold inline-flex items-center gap-1 disabled:opacity-50"
            >
              {aiPending ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              ייצר/י מחדש
            </button>
          </div>
        )}
      </Card>

      {/* ─── Interview prep block (only when stage is interview-related) ─── */}
      {prep && (
        <Card className="p-5 border-teal/30 bg-teal/5">
          <h2 className="font-bold text-navy mb-1 flex items-center gap-2">
            <Sparkles size={16} className="text-teal" />
            {prep.title}
          </h2>
          <p className="text-xs text-gray-500 mb-4">צ&apos;קליסט מותאם לשלב הנוכחי. סמני כל פעולה כשסיימת.</p>
          <div className="space-y-2">
            {prep.steps.map((step) => (
              <PrepStepItem key={step.id} step={step} appId={app.id} />
            ))}
          </div>

          {/* High-intent moment for the interview-prep course */}
          <a
            href="https://my.schooler.biz/s/106543/1765824391549?utm_source=HryKqw"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a] text-white hover:shadow-lg transition-shadow group"
          >
            <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">רוצה הכנה עמוקה יותר?</p>
              <p className="text-xs text-white/70 mt-0.5">
                קורס ההכנה לראיונות של קורל — שאלות, סיפורי הצלחה, משוב חי. מוכרים בעצמם.
              </p>
            </div>
            <span className="text-teal text-xs font-bold shrink-0 group-hover:translate-x-[-3px] transition-transform">
              לקורס ←
            </span>
          </a>
        </Card>
      )}

      {/* ─── Two-column: Reminders + Journal ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Reminders */}
        <Card className="p-5">
          <h2 className="font-bold text-navy mb-3 flex items-center gap-2">
            <Bell size={16} className="text-teal" />
            תזכורות
          </h2>

          <form onSubmit={submitReminder} className="space-y-2 mb-4 pb-4 border-b border-slate-100">
            <input
              type="text"
              value={reminderTitle}
              onChange={(e) => setReminderTitle(e.target.value)}
              placeholder="לדוגמה: לשלוח follow-up"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
            />
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={reminderDue}
                onChange={(e) => setReminderDue(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
              />
              <select
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value)}
                className="border border-gray-200 rounded-xl px-2 py-2 text-sm bg-white"
              >
                <option value="FOLLOWUP">{REMINDER_TYPE_LABELS.FOLLOWUP}</option>
                <option value="INTERVIEW_PREP">{REMINDER_TYPE_LABELS.INTERVIEW_PREP}</option>
                <option value="THANK_YOU">{REMINDER_TYPE_LABELS.THANK_YOU}</option>
                <option value="RESEARCH">{REMINDER_TYPE_LABELS.RESEARCH}</option>
                <option value="OTHER">{REMINDER_TYPE_LABELS.OTHER}</option>
              </select>
            </div>
            <Button
              type="submit"
              disabled={pending || !reminderTitle || !reminderDue}
              className="w-full h-9 bg-teal hover:bg-teal/90 text-white rounded-xl border-0 text-sm font-bold disabled:opacity-50"
            >
              <Plus size={14} className="ml-1" /> הוסיפי תזכורת
            </Button>
          </form>

          {reminders.length > 0 ? (
            <div className="space-y-2">
              {reminders.map((r) => {
                const overdue = !r.completed && new Date(r.dueAt).getTime() < Date.now();
                return (
                  <div
                    key={r.id}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors ${
                      r.completed ? "bg-gray-50 border-gray-100" : overdue ? "bg-red-50 border-red-200" : "bg-white border-slate-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleReminder(r.id)}
                      className="text-teal hover:text-teal/80 mt-0.5"
                      aria-label={r.completed ? "לא הושלם" : "הושלם"}
                    >
                      {r.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${r.completed ? "line-through text-gray-400" : "text-navy"}`}>
                        {r.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <Clock size={10} />
                        {formatDateTime(r.dueAt)}
                        <span className="text-gray-300">·</span>
                        <span>{REMINDER_TYPE_LABELS[r.type] ?? r.type}</span>
                        {overdue && !r.completed && <span className="text-red-600 font-bold">· באיחור</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeReminder(r.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                      aria-label="מחקי"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">אין תזכורות פעילות.</p>
          )}
        </Card>

        {/* Journal */}
        <Card className="p-5">
          <h2 className="font-bold text-navy mb-3 flex items-center gap-2">
            <BookText size={16} className="text-teal" />
            יומן
          </h2>

          <form onSubmit={submitJournal} className="space-y-2 mb-4 pb-4 border-b border-slate-100">
            <textarea
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              placeholder="מה קרה היום במשרה הזו? תחושה? משוב? תובנה?"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white resize-none"
            />
            <div className="flex gap-2">
              <select
                value={journalTag}
                onChange={(e) => setJournalTag(e.target.value)}
                className="border border-gray-200 rounded-xl px-2 py-2 text-sm bg-white"
              >
                <option value="NOTE">{TAG_LABELS.NOTE}</option>
                <option value="INTERVIEW">{TAG_LABELS.INTERVIEW}</option>
                <option value="FOLLOWUP">{TAG_LABELS.FOLLOWUP}</option>
                <option value="OUTREACH">{TAG_LABELS.OUTREACH}</option>
                <option value="FEELING">{TAG_LABELS.FEELING}</option>
                <option value="LEARNING">{TAG_LABELS.LEARNING}</option>
              </select>
              <Button
                type="submit"
                disabled={pending || !journalText.trim()}
                className="flex-1 h-9 bg-teal hover:bg-teal/90 text-white rounded-xl border-0 text-sm font-bold disabled:opacity-50"
              >
                <Plus size={14} className="ml-1" /> הוסיפי רשומה
              </Button>
            </div>
          </form>

          {journal.length > 0 ? (
            <div className="space-y-3">
              {journal.map((j) => (
                <div key={j.id} className="border-r-2 border-teal/30 pr-3 group">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {j.tag && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TAG_COLORS[j.tag] ?? "bg-gray-100 text-gray-600"}`}>
                          {TAG_LABELS[j.tag] ?? j.tag}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{formatDateTime(j.occurredAt)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteJournal(j.id)}
                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="מחקי"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{j.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">עדיין לא רשמת כלום על המשרה הזו.</p>
          )}
        </Card>
      </div>

      {/* ─── Notes ─── */}
      <Card className="p-5">
        <h2 className="font-bold text-navy mb-3 flex items-center gap-2">
          <MessageSquare size={16} className="text-teal" />
          הערות חופשיות
        </h2>
        <textarea
          value={app.notes ?? ""}
          onChange={(e) => setApp({ ...app, notes: e.target.value })}
          onBlur={(e) => updateField("notes", e.target.value || null)}
          rows={4}
          placeholder="פרטי קשר, רקע על החברה, ציטוטים מהמראיינ/ת, כל מה שתרצי לזכור..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white resize-y"
        />
      </Card>

      {/* ─── Meta ─── */}
      <p className="text-xs text-gray-400 text-center">
        עודכנה לאחרונה ב-{formatDateTime(app.updatedAt)}
      </p>
    </div>
  );
}

function PrepStepItem({ step, appId }: { step: PrepStep; appId: string }) {
  const [done, setDone] = useState(false);
  // Local state only — no persistence yet. Keeps the UI lightweight; we can
  // wire up storage later if users want to track prep across sessions.
  void appId;

  return (
    <button
      type="button"
      onClick={() => setDone(!done)}
      className={`w-full flex items-start gap-2.5 p-3 rounded-xl border text-right transition-colors ${
        done ? "bg-teal/10 border-teal/30" : "bg-white border-slate-100 hover:border-teal/30"
      }`}
    >
      <div className="text-teal mt-0.5 shrink-0">
        {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${done ? "line-through text-gray-400" : "text-slate-700"}`}>
          {step.text}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">~{step.minutes} דקות</p>
      </div>
    </button>
  );
}
