"use client";

import { useState, useTransition } from "react";
import { FileText, Clock, Phone, CheckCircle2, XCircle, Mail, Loader2, Save } from "lucide-react";
import { updateCvRequestStatus, updateCvRequestNotes } from "@/lib/actions/cv-requests";

interface Row {
  id: string;
  status: string;
  createdAt: string;
  scheduledAt: string | null;
  deliveredAt: string | null;
  adminNotes: string | null;
  user: {
    name: string;
    email: string;
    phone: string | null;
    targetRole: string | null;
  };
}

const STATUS_FLOW = [
  { key: "PENDING",     label: "חדש",        color: "bg-amber-100 text-amber-800",     icon: Clock },
  { key: "SCHEDULED",   label: "שיחה תואמה", color: "bg-sky-100 text-sky-800",         icon: Phone },
  { key: "IN_PROGRESS", label: "בעבודה",     color: "bg-purple-100 text-purple-800",   icon: FileText },
  { key: "DELIVERED",   label: "נמסר",       color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  { key: "CANCELLED",   label: "בוטל",       color: "bg-gray-100 text-gray-600",       icon: XCircle },
] as const;

function statusBadge(status: string) {
  return STATUS_FLOW.find((s) => s.key === status) ?? STATUS_FLOW[0];
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CvRequestsClient({ rows }: { rows: Row[] }) {
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<string>("ALL");

  const visible = filter === "ALL" ? rows : rows.filter((r) => r.status === filter);
  const counts = STATUS_FLOW.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = rows.filter((r) => r.status === s.key).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy mb-1 flex items-center gap-2">
          <FileText size={20} className="text-teal" />
          בקשות לכתיבת קוח (VIP)
        </h1>
        <p className="text-sm text-gray-500">
          {rows.length} בקשות · {counts.PENDING ?? 0} ממתינות לטיפול
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
            filter === "ALL" ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-gray-200 hover:border-navy/40"
          }`}
        >
          הכל ({rows.length})
        </button>
        {STATUS_FLOW.map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
              filter === s.key ? `${s.color} border-transparent` : "bg-white text-gray-600 border-gray-200 hover:border-teal/40"
            }`}
          >
            {s.label} ({counts[s.key] ?? 0})
          </button>
        ))}
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
          <FileText size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {filter === "ALL"
              ? "אין בקשות עדיין. ברגע שמשתמש/ת ילחץ על 'קורל תכין לי קוח' אחרי שדרוג ל-VIP, היא תופיע כאן."
              : "אין בקשות בסטטוס זה."}
          </p>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {visible.map((r) => (
          <RequestCard key={r.id} row={r} disabled={pending} startTransition={startTransition} />
        ))}
      </div>
    </div>
  );
}

function RequestCard({
  row, disabled, startTransition,
}: {
  row: Row;
  disabled: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const badge = statusBadge(row.status);
  const Icon = badge.icon;
  const [notes, setNotes] = useState(row.adminNotes ?? "");
  const [savedTick, setSavedTick] = useState(false);

  const waText = row.user.phone
    ? encodeURIComponent(
        `שלום ${row.user.name?.split(" ")[0] ?? ""}!\nזאת קורל מקריירה בפוקוס. קיבלתי את הבקשה שלך לכתיבת קורות חיים.\nמתי נוח לך לדבר 30 דק' בטלפון לאבחון? יש לי זמינות בקרוב.`,
      )
    : "";
  const waLink = row.user.phone ? `https://wa.me/972${row.user.phone.replace(/\D/g, "").replace(/^0/, "")}?text=${waText}` : "";

  function setStatus(next: string) {
    startTransition(async () => {
      try { await updateCvRequestStatus(row.id, next); } catch { /* ignore */ }
    });
  }

  function saveNotes() {
    startTransition(async () => {
      try {
        await updateCvRequestNotes(row.id, notes);
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 2000);
      } catch { /* ignore */ }
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-navy text-base">{row.user.name}</h3>
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badge.color}`}>
              <Icon size={11} /> {badge.label}
            </span>
          </div>
          <div className="text-xs text-gray-500 space-y-0.5" dir="ltr">
            <div>📧 {row.user.email}</div>
            <div>📱 {row.user.phone ?? "(לא צוין)"}</div>
            <div className="text-right" dir="rtl">🎯 {row.user.targetRole ?? "(לא צוין תפקיד יעד)"}</div>
          </div>
        </div>
        <div className="text-xs text-gray-400 text-left">
          <div>נוצר: {formatDate(row.createdAt)}</div>
          {row.scheduledAt && <div>שיחה: {formatDate(row.scheduledAt)}</div>}
          {row.deliveredAt && <div>נמסר: {formatDate(row.deliveredAt)}</div>}
        </div>
      </div>

      {/* Status actions */}
      <div className="flex flex-wrap gap-2 mb-3 pt-3 border-t border-slate-100">
        {STATUS_FLOW.filter((s) => s.key !== row.status).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStatus(s.key)}
            disabled={disabled}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:border-teal hover:text-teal transition-colors disabled:opacity-50"
          >
            {disabled ? <Loader2 size={11} className="inline animate-spin ml-1" /> : null}
            {s.label === "חדש" ? "החזר ל'חדש'" : `סמן: ${s.label}`}
          </button>
        ))}

        {row.user.phone && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            💬 וואטסאפ ללקוח
          </a>
        )}
        <a
          href={`mailto:${row.user.email}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold border border-gray-200 text-navy px-3 py-1.5 rounded-lg hover:border-navy/40"
        >
          <Mail size={11} /> מייל
        </a>
      </div>

      {/* Notes */}
      <div className="pt-3 border-t border-slate-100">
        <label className="text-[11px] font-black text-gray-500 uppercase tracking-wide block mb-1.5">הערות פנימיות</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="סיכום שיחה, נושאים מרכזיים, תאריך משלוח מתוכנן..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none resize-none"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={saveNotes}
            disabled={disabled || notes === (row.adminNotes ?? "")}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-navy text-white px-3 py-1.5 rounded-lg hover:bg-navy/90 disabled:opacity-40"
          >
            <Save size={11} /> שמירה
          </button>
          {savedTick && <span className="text-xs text-emerald-700 font-bold">נשמר ✓</span>}
        </div>
      </div>
    </div>
  );
}
