"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight, Upload, Loader2, FileCheck2, AlertCircle, RefreshCcw,
  ShieldCheck, ShieldAlert, ShieldX, CheckCircle2, AlertTriangle, Sparkles,
  ArrowLeft, ListChecks, Tags,
} from "lucide-react";
import type { CvFeedbackResult } from "@/lib/cv-feedback-types";

interface Props {
  initial: { fileName: string; result: CvFeedbackResult; createdAt: string } | null;
  targetRole: string | null;
}

type Phase = "idle" | "uploading" | "analyzing" | "done" | "error";

export function CvFeedbackClient({ initial, targetRole }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>(initial ? "done" : "idle");
  const [result, setResult] = useState<CvFeedbackResult | null>(initial?.result ?? null);
  const [fileName, setFileName] = useState(initial?.fileName ?? "");
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 6 * 1024 * 1024) {
      setError("הקובץ גדול מדי (מקסימום 6MB). נסי PDF דחוס יותר.");
      setPhase("error");
      e.target.value = "";
      return;
    }

    setError("");
    setFileName(file.name);
    setPhase("uploading");

    try {
      const b64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      setPhase("analyzing");
      const resp = await fetch("/api/cv-feedback/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Data: b64,
          mimeType: file.type || "application/pdf",
          fileName: file.name,
          targetRole: targetRole ?? undefined,
        }),
      });
      const data = (await resp.json()) as
        | { result: CvFeedbackResult; cached: boolean; fileName: string }
        | { error: string };

      if ("error" in data) {
        setError(data.error);
        setPhase("error");
        return;
      }

      setResult(data.result);
      setFileName(data.fileName);
      setPhase("done");
    } catch {
      setError("שגיאת רשת — נסי שוב.");
      setPhase("error");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/progress" className="hover:text-navy transition-colors">
          התקדמות
        </Link>
        <ChevronRight size={14} />
        <span className="text-navy font-bold">ניתוח קורות חיים</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-navy mb-2">ניתוח קורות חיים</h1>
        <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
          העלי את קורות החיים, ובתוך ~20 שניות תקבלי משוב כמו ממגייסת מקצועית — ציון איכות,
          סיכון ATS, ומה לתקן עכשיו כדי להשיג יותר ראיונות.
        </p>
      </div>

      {/* Hidden file input — shared across all phases */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFile}
      />

      {phase === "idle" && (
        <UploadZone onClick={() => fileRef.current?.click()} />
      )}

      {(phase === "uploading" || phase === "analyzing") && (
        <LoadingPanel phase={phase} fileName={fileName} />
      )}

      {phase === "error" && (
        <ErrorPanel
          message={error}
          onRetry={() => {
            setError("");
            setPhase(result ? "done" : "idle");
          }}
        />
      )}

      {phase === "done" && result && (
        <ResultsView
          result={result}
          fileName={fileName}
          onReupload={() => fileRef.current?.click()}
        />
      )}
    </div>
  );
}

// ─── Upload zone (idle) ──────────────────────────────────────────────────────

function UploadZone({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex flex-col items-center justify-center gap-3 px-6 py-16 rounded-2xl border-2 border-dashed border-gray-300 bg-white hover:border-teal hover:bg-teal/5 transition-all group"
    >
      <div className="w-14 h-14 rounded-2xl bg-teal/10 flex items-center justify-center group-hover:bg-teal/20 transition-colors">
        <Upload size={24} className="text-teal" />
      </div>
      <div className="text-center">
        <p className="font-black text-navy text-base">לחצי להעלאת קורות חיים</p>
        <p className="text-xs text-gray-400 mt-1">PDF או Word · מקסימום 6MB</p>
      </div>
    </button>
  );
}

// ─── Loading state ───────────────────────────────────────────────────────────

function LoadingPanel({ phase, fileName }: { phase: "uploading" | "analyzing"; fileName: string }) {
  const steps = [
    { id: "uploading", label: "מעלה קובץ...", active: phase === "uploading" },
    { id: "analyzing", label: "סורקת ומנתחת — מגייסת AI עוברת על הקורות חיים", active: phase === "analyzing" },
  ];
  return (
    <div className="bg-white border border-teal/20 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 size={18} className="text-teal animate-spin" />
        <p className="font-bold text-navy text-sm">{fileName}</p>
      </div>
      <ul className="space-y-2 mr-1">
        {steps.map((s) => (
          <li key={s.id} className={`text-sm ${s.active ? "text-teal font-bold" : "text-gray-400"}`}>
            {s.active ? "● " : "○ "}{s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
      <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-bold text-red-800 text-sm mb-1">לא הצלחנו להשלים את הניתוח</p>
        <p className="text-sm text-red-700 mb-3">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
          <RefreshCcw size={12} />
          ניסיון נוסף
        </button>
      </div>
    </div>
  );
}

// ─── Results ─────────────────────────────────────────────────────────────────

function ResultsView({
  result, fileName, onReupload,
}: {
  result: CvFeedbackResult;
  fileName: string;
  onReupload: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* File strip */}
      <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm min-w-0">
          <FileCheck2 size={15} className="shrink-0" />
          <span className="truncate">{fileName}</span>
        </div>
        <button
          type="button"
          onClick={onReupload}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 shrink-0"
        >
          <Upload size={12} />
          העלאת קובץ אחר
        </button>
      </div>

      {/* Scores side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScoreCard
          score={result.qualityScore}
          title="איכות קורות חיים"
          subtitle="בהירות · הישגים · מבנה · ניסוח"
          accent="teal"
        />
        <AtsScoreCard
          score={result.atsScore}
          riskLevel={result.atsRiskLevel}
        />
      </div>

      {/* Quality breakdown */}
      <SectionCard title="פירוט הציון" icon={ListChecks}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "בהירות",            value: result.qualityBreakdown.clarity },
            { label: "מיצוב מקצועי",       value: result.qualityBreakdown.positioning },
            { label: "הישגים",            value: result.qualityBreakdown.achievements },
            { label: "מבנה",              value: result.qualityBreakdown.structure },
            { label: "רלוונטיות",          value: result.qualityBreakdown.relevance },
            { label: "ניסוח",             value: result.qualityBreakdown.wording },
            { label: "נראות מיומנויות",    value: result.qualityBreakdown.skillsVisibility },
            { label: "פוטנציאל לראיון",    value: result.qualityBreakdown.interviewPotential },
          ].map((axis) => (
            <div key={axis.label} className="bg-cream/50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">{axis.label}</p>
              <p className={`text-lg font-black ${scoreColor(axis.value)}`}>{axis.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ATS risk breakdown */}
      <SectionCard title="סיכון במערכות ATS" icon={ShieldCheck}>
        <div className="space-y-3">
          {result.atsRiskReasons.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-800 mb-1.5">למה הסיכון הזה:</p>
              <ul className="space-y-1">
                {result.atsRiskReasons.map((r, i) => (
                  <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SystemBucket
              label="סיכון נמוך"
              icon={ShieldCheck}
              tone="emerald"
              systems={result.atsSystems.low}
            />
            <SystemBucket
              label="סיכון בינוני"
              icon={ShieldAlert}
              tone="amber"
              systems={result.atsSystems.medium}
            />
            <SystemBucket
              label="סיכון גבוה"
              icon={ShieldX}
              tone="rose"
              systems={result.atsSystems.high}
            />
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            * הסיווג הוא הערכה. אין דרך להבטיח מעבר חלק בכל מערכת ATS.
          </p>
        </div>
      </SectionCard>

      {/* Summary */}
      <SectionCard title="סיכום מהיר" icon={Sparkles} accent="teal">
        <p className="text-sm text-navy leading-relaxed whitespace-pre-line">{result.summary}</p>
      </SectionCard>

      {/* Works well + Weakens — side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="מה עובד טוב" icon={CheckCircle2} accent="emerald">
          <BulletList items={result.worksWell} tone="emerald" />
        </SectionCard>
        <SectionCard title="מה מחליש את הקורות חיים" icon={AlertTriangle} accent="amber">
          <BulletList items={result.weakens} tone="amber" />
        </SectionCard>
      </div>

      {/* Fixes (prioritized) */}
      <SectionCard title="מה לתקן קודם" icon={ListChecks}>
        <ul className="space-y-2">
          {result.fixes.map((f, i) => (
            <li key={i} className="flex items-start gap-3 bg-cream/50 rounded-xl p-3">
              <PriorityBadge priority={f.priority} />
              <p className="flex-1 text-sm text-navy">{f.text}</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Missing keywords */}
      {result.missingKeywords.length > 0 && (
        <SectionCard title="מילות מפתח חסרות" icon={Tags}>
          <div className="flex flex-wrap gap-2">
            {result.missingKeywords.map((k, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200">
                {k}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Suggested titles */}
      {result.suggestedTitles.length > 0 && (
        <SectionCard title="תפקידים מומלצים" icon={Tags}>
          <div className="flex flex-wrap gap-2">
            {result.suggestedTitles.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-teal/10 text-teal text-xs font-bold px-3 py-1.5 rounded-full border border-teal/20">
                {t}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Next action */}
      <div className="bg-gradient-to-br from-navy to-[#1a3a4a] text-white rounded-2xl p-6">
        <p className="text-xs font-bold text-teal uppercase tracking-wider mb-2">הצעד הבא</p>
        <p className="text-base font-bold leading-relaxed">{result.nextAction}</p>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 mt-4 text-sm font-bold text-teal hover:text-white transition-colors"
        >
          לעבור על המשרות שלי
          <ArrowLeft size={14} />
        </Link>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-red-600";
}

function ScoreCard({
  score, title, subtitle, accent,
}: {
  score: number; title: string; subtitle: string; accent: "teal" | "navy";
}) {
  const accentClass = accent === "teal" ? "from-teal to-teal-dark" : "from-navy to-[#1a3a4a]";
  return (
    <div className={`bg-gradient-to-br ${accentClass} text-white rounded-2xl p-6`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">{title}</p>
      <p className="text-5xl font-black leading-none mb-1">{score}<span className="text-2xl opacity-50">/100</span></p>
      <p className="text-xs opacity-80 mt-2">{subtitle}</p>
    </div>
  );
}

function AtsScoreCard({ score, riskLevel }: { score: number; riskLevel: "low" | "medium" | "high" }) {
  const riskMap = {
    low:    { label: "סיכון נמוך",   icon: ShieldCheck, color: "text-emerald-300" },
    medium: { label: "סיכון בינוני", icon: ShieldAlert, color: "text-amber-300" },
    high:   { label: "סיכון גבוה",   icon: ShieldX,     color: "text-rose-300" },
  } as const;
  const r = riskMap[riskLevel];
  const Icon = r.icon;
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-2xl p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wider opacity-80">תאימות ATS</p>
        <span className={`inline-flex items-center gap-1 text-xs font-bold ${r.color}`}>
          <Icon size={14} />
          {r.label}
        </span>
      </div>
      <p className="text-5xl font-black leading-none mb-1">{score}<span className="text-2xl opacity-50">/100</span></p>
      <p className="text-xs opacity-80 mt-2">קריאות במערכות סינון אוטומטיות</p>
    </div>
  );
}

function SystemBucket({
  label, icon: Icon, tone, systems,
}: {
  label: string;
  icon: typeof ShieldCheck;
  tone: "emerald" | "amber" | "rose";
  systems: string[];
}) {
  const toneMap = {
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", iconColor: "text-emerald-600" },
    amber:   { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-800",   iconColor: "text-amber-600" },
    rose:    { bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-800",    iconColor: "text-rose-600" },
  } as const;
  const t = toneMap[tone];
  return (
    <div className={`${t.bg} ${t.border} border rounded-xl p-3`}>
      <div className={`flex items-center gap-1.5 ${t.text} text-xs font-bold mb-2`}>
        <Icon size={13} className={t.iconColor} />
        {label}
      </div>
      {systems.length > 0 ? (
        <ul className="space-y-1">
          {systems.map((s, i) => (
            <li key={i} className={`text-xs ${t.text}`}>• {s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400">—</p>
      )}
    </div>
  );
}

function SectionCard({
  title, icon: Icon, accent, children,
}: {
  title: string;
  icon: typeof ListChecks;
  accent?: "teal" | "emerald" | "amber";
  children: React.ReactNode;
}) {
  const iconColor =
    accent === "emerald" ? "text-emerald-600" :
    accent === "amber"   ? "text-amber-600" :
    accent === "teal"    ? "text-teal" :
    "text-navy";
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <h2 className={`flex items-center gap-2 text-sm font-black mb-3 ${iconColor}`}>
        <Icon size={16} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function BulletList({ items, tone }: { items: string[]; tone: "emerald" | "amber" }) {
  const dot = tone === "emerald" ? "text-emerald-500" : "text-amber-500";
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="text-sm text-navy flex items-start gap-2">
          <span className={`${dot} mt-0.5`}>•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "optional" }) {
  const map = {
    high:     { label: "עדיפות גבוהה",   bg: "bg-rose-100",    text: "text-rose-700" },
    medium:   { label: "בינונית",         bg: "bg-amber-100",   text: "text-amber-800" },
    optional: { label: "אופציונלי",      bg: "bg-slate-100",   text: "text-slate-600" },
  } as const;
  const m = map[priority];
  return (
    <span className={`inline-flex items-center text-[11px] font-bold ${m.bg} ${m.text} px-2 py-0.5 rounded-md shrink-0`}>
      {m.label}
    </span>
  );
}
