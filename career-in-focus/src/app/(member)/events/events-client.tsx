"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CalendarDays, Clock, Users, Sparkles,
  CheckCircle2, ChevronDown, Bell, ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  googleCalendarUrl,
  outlookCalendarUrl,
  appleIcsDataUrl,
  type CalendarEvent,
} from "@/lib/calendar-link";

// ─── Types from server ─────────────────────────────────────────────────────────

export interface EventItem {
  id:           string;
  title:        string;
  description:  string | null;
  type:         string;
  startAt:      string;
  endAt:        string | null;
  location:     string | null;
  isOnline:     boolean;
  meetingUrl:   string | null;
  registerUrl:  string | null;
  imageUrl:     string | null;
  audience:     string | null;
  valueBullets: string[];
  host:         string | null;
  hostRole:     string | null;
}

// ─── Date / time formatters ────────────────────────────────────────────────────

const HEBREW_WEEKDAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "שבת"];
const HEBREW_MONTHS = [
  "ינו'", "פבר'", "מרץ", "אפר'", "מאי", "יוני",
  "יולי", "אוג'", "ספט'", "אוק'", "נוב'", "דצמ'",
];

function fmtDateBadge(iso: string): { day: string; month: string; weekday: string } {
  const d = new Date(iso);
  return {
    day:     String(d.getDate()),
    month:   HEBREW_MONTHS[d.getMonth()],
    weekday: HEBREW_WEEKDAYS[d.getDay()],
  };
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

// ─── Add-to-calendar dropdown ──────────────────────────────────────────────────

function AddToCalendar({ ev }: { ev: EventItem }) {
  const [open, setOpen] = useState(false);
  const calEvent: CalendarEvent = {
    title:       ev.title,
    description: [
      ev.description ?? "",
      ev.host ? `\nמנחה: ${ev.host}${ev.hostRole ? ` — ${ev.hostRole}` : ""}` : "",
      ev.meetingUrl ? `\n\nקישור לסדנה: ${ev.meetingUrl}` : "",
    ].filter(Boolean).join(""),
    location:    ev.isOnline ? "אונליין" : (ev.location ?? "לפרטים בהרשמה"),
    startAt:     new Date(ev.startAt),
    endAt:       ev.endAt ? new Date(ev.endAt) : undefined,
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-center gap-1.5 bg-white text-navy font-bold text-sm px-4 py-2.5 rounded-xl border-2 border-slate-200 hover:border-teal/60 transition-colors"
      >
        <CalendarDays size={14} />
        הוסף ליומן
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          {/* Click-outside dismisser */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
            <a
              href={googleCalendarUrl(calEvent)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100"
              onClick={() => setOpen(false)}
            >
              <span className="text-base">📅</span>
              <span className="font-bold text-navy">Google Calendar</span>
            </a>
            <a
              href={appleIcsDataUrl(calEvent)}
              download={`${ev.title}.ics`}
              className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50 border-b border-slate-100"
              onClick={() => setOpen(false)}
            >
              <span className="text-base">🍎</span>
              <span className="font-bold text-navy">Apple Calendar</span>
            </a>
            <a
              href={outlookCalendarUrl(calEvent)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <span className="text-base">📨</span>
              <span className="font-bold text-navy">Outlook</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Workshop card ─────────────────────────────────────────────────────────────

function WorkshopCard({ ev }: { ev: EventItem }) {
  const date = fmtDateBadge(ev.startAt);
  const time = fmtTime(ev.startAt);
  const heroImg = ev.imageUrl ?? "/koral-hero.jpg";

  return (
    <Card className="overflow-hidden flex flex-col bg-white border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      {/* Hero image with date badge + status pill */}
      <div className="relative h-44 sm:h-48 overflow-hidden">
        <Image
          src={heroImg}
          alt={ev.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/50 via-transparent to-transparent pointer-events-none" />

        {/* Status pill */}
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-emerald-500 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow">
          <Users size={11} />
          הרשמה פתוחה
        </div>

        {/* Date badge */}
        <div className="absolute top-3 left-3 bg-white rounded-xl shadow-lg overflow-hidden text-center min-w-[58px]">
          <div className="bg-teal text-white text-[10px] font-black px-2 py-0.5 uppercase">{date.month}</div>
          <div className="px-2 py-1.5">
            <p className="text-2xl font-black text-navy leading-none">{date.day}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">יום {date.weekday}</p>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="text-lg font-black text-navy leading-snug mb-1.5">{ev.title}</h3>

        {/* Time + audience */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {time}
          </span>
          {ev.audience && (
            <>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 text-teal-dark font-semibold">
                {ev.audience}
              </span>
            </>
          )}
        </div>

        {/* Value bullets — the heart of the card */}
        {ev.valueBullets.length > 0 && (
          <div className="space-y-1.5 mb-4 flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">מה תקבל/י בסדנה</p>
            {ev.valueBullets.map((b, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                <CheckCircle2 size={14} className="text-teal mt-0.5 shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        )}

        {/* Host */}
        {ev.host && (
          <div className="bg-slate-50 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-teal text-white flex items-center justify-center text-[10px] font-black shrink-0">
              {ev.host.charAt(0)}
            </div>
            <div className="text-xs">
              <p className="font-bold text-navy leading-tight">{ev.host}</p>
              {ev.hostRole && <p className="text-slate-500 text-[11px]">{ev.hostRole}</p>}
            </div>
          </div>
        )}

        {/* CTAs — when registerUrl is empty (most workshops, since we
            collect signups manually in WhatsApp), the primary button
            opens wa.me with a pre-filled message naming the workshop. */}
        <div className="grid grid-cols-2 gap-2">
          {ev.registerUrl ? (
            <a
              href={ev.registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-l from-teal to-teal-dark text-white font-black text-sm px-4 py-2.5 rounded-xl hover:shadow-md hover:shadow-teal/30 transition-all"
            >
              הירשם לסדנה
              <ExternalLink size={12} />
            </a>
          ) : (
            <a
              href={`https://wa.me/972535777005?text=${encodeURIComponent(`היי קורל, אני מעוניין/ת להירשם לסדנה: ${ev.title}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-l from-teal to-teal-dark text-white font-black text-sm px-4 py-2.5 rounded-xl hover:shadow-md hover:shadow-teal/30 transition-all"
            >
              הירשם לסדנה
              <ExternalLink size={12} />
            </a>
          )}
          <AddToCalendar ev={ev} />
        </div>
      </div>
    </Card>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  const [notified, setNotified] = useState(false);

  return (
    <div className="bg-gradient-to-br from-teal-pale via-white to-amber-50 rounded-3xl p-10 sm:p-14 text-center border border-teal/20">
      <div className="w-20 h-20 rounded-3xl bg-white shadow-md flex items-center justify-center mx-auto mb-5">
        <Sparkles size={32} className="text-teal" />
      </div>
      <h2 className="text-xl sm:text-2xl font-black text-navy mb-2">
        הסדנאות הבאות כבר בדרך — רוצה שנשמור לך מקום?
      </h2>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
        אין סדנאות פתוחות להרשמה כרגע, אבל אנחנו פותחים סדנאות חדשות בכל חודש.
        תני לי אישור ואני אעדכן אותך מייד כשנפתחת ההרשמה.
      </p>
      {!notified ? (
        <button
          type="button"
          onClick={() => setNotified(true)}
          className="inline-flex items-center gap-2 bg-teal text-white font-black text-sm px-6 py-3 rounded-xl hover:bg-teal-dark transition-colors"
        >
          <Bell size={14} />
          עדכני אותי על פתיחת הרשמה
        </button>
      ) : (
        <div className="inline-flex items-center gap-2 bg-emerald-500 text-white font-black text-sm px-6 py-3 rounded-xl">
          <CheckCircle2 size={14} />
          רשמנו אותך — נשלח עדכון ברגע שנפתחת ההרשמה
        </div>
      )}
    </div>
  );
}

// ─── Main client ───────────────────────────────────────────────────────────────

export function EventsClient({ events }: { events: EventItem[] }) {
  return (
    <div className="space-y-7 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="relative rounded-3xl bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a] text-white p-6 sm:p-10 overflow-hidden shadow-xl">
        <div className="absolute -top-16 -left-16 w-72 h-72 bg-teal/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-amber-300/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-teal/15 border border-teal/30 text-teal px-3 py-1 rounded-full text-xs font-black mb-4">
            <Sparkles size={12} />
            סדנאות פרימיום
          </div>
          <h1 className="text-2xl sm:text-4xl font-black mb-3 leading-tight">
            סדנאות ואירועים שמקדמים אותך לעבודה הבאה
          </h1>
          <p className="text-white/75 text-sm sm:text-base leading-relaxed mb-5 max-w-xl">
            סדנאות פרקטיות עם כלים אמיתיים, אנשי מקצוע מהשטח וטיפים שלא תמצאי בגוגל.
            כל סדנה מתמקדת ביישום מיידי — מהיום לראיון.
          </p>
          {events.length > 0 && (
            <a
              href="#workshops-list"
              className="inline-flex items-center gap-2 bg-teal text-white font-black text-sm px-5 py-2.5 rounded-xl hover:bg-teal-dark hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal/30 transition-all"
            >
              לראות סדנאות קרובות
              <Sparkles size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div id="workshops-list" className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className="text-xl font-black text-navy">
              {events.length} סדנאות קרובות
            </h2>
            <p className="text-xs text-slate-400">בכל הסדנאות — הקלטה זמינה לחברי הקהילה</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {events.map((ev) => <WorkshopCard key={ev.id} ev={ev} />)}
          </div>
        </>
      )}
    </div>
  );
}
