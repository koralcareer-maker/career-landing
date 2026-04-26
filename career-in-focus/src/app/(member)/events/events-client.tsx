"use client";

import { useState } from "react";
import { MapPin, Monitor, Clock, CalendarDays, ExternalLink, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EVENT_TYPE_LABELS } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startAt: Date | string;
  endAt: Date | null | string;
  location: string | null;
  isOnline: boolean;
  meetingUrl: string | null;
  registerUrl: string | null;
  imageUrl: string | null;
  maxCapacity: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEventDate(date: Date | string) {
  const d = new Date(date);
  return {
    day: d.getDate(),
    month: d.toLocaleString("he-IL", { month: "short" }),
    weekday: d.toLocaleString("he-IL", { weekday: "long" }),
    time: d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
  };
}

function eventTypeVariant(type: string): "teal" | "navy" | "green" | "purple" | "yellow" | "gray" {
  switch (type) {
    case "WEBINAR": return "teal";
    case "WORKSHOP": return "navy";
    case "LIVE": return "green";
    case "GUEST_RECRUITER": return "purple";
    case "JOB_DROP": return "yellow";
    case "LAUNCH": return "teal";
    case "NETWORKING": return "navy";
    default: return "gray";
  }
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: EventItem }) {
  const { day, month, weekday, time } = formatEventDate(event.startAt);
  const typeLabel = EVENT_TYPE_LABELS[event.type] ?? event.type;
  const ctaUrl = event.registerUrl ?? event.meetingUrl;

  return (
    <Card hover className="flex flex-col h-full">
      <CardContent className="flex gap-4 h-full">
        {/* Date badge */}
        <div className="flex flex-col items-center justify-start shrink-0">
          <div className="w-14 bg-teal-pale rounded-xl overflow-hidden text-center border border-teal/20">
            <div className="bg-teal text-white text-[10px] font-bold py-1 px-2 uppercase tracking-wide">
              {month}
            </div>
            <div className="text-navy font-black text-2xl leading-none py-2">{day}</div>
            <div className="text-gray-400 text-[10px] pb-1.5">{weekday.slice(0, 3)}&apos;</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start gap-2 mb-2 flex-wrap">
            <Badge variant={eventTypeVariant(event.type)} size="sm">
              {typeLabel}
            </Badge>
            {event.isOnline && (
              <Badge variant="green" size="sm">
                <Monitor size={10} />
                אונליין
              </Badge>
            )}
          </div>

          <h3 className="font-bold text-navy text-base leading-snug mb-1.5">{event.title}</h3>

          {event.description && (
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">
              {event.description}
            </p>
          )}

          {!event.description && <div className="flex-1" />}

          {/* Meta */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-3">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {time}
            </span>
            {event.isOnline ? (
              <span className="flex items-center gap-1">
                <Monitor size={12} />
                זום / אונליין
              </span>
            ) : event.location ? (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {event.location}
              </span>
            ) : null}
            {event.maxCapacity && (
              <span className="flex items-center gap-1">
                <Users size={12} />
                עד {event.maxCapacity} משתתפים
              </span>
            )}
          </div>

          {/* CTA */}
          {ctaUrl && (
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-teal hover:text-teal-dark transition-colors"
            >
              הירשם לאירוע
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-teal-pale rounded-2xl flex items-center justify-center mx-auto mb-4">
        <CalendarDays size={28} className="text-teal" />
      </div>
      <h3 className="font-bold text-navy text-lg mb-2">
        {hasFilter ? "אין אירועים בקטגוריה זו" : "אין אירועים קרובים, בקרוב!"}
      </h3>
      <p className="text-sm text-gray-400 max-w-xs mx-auto">
        {hasFilter
          ? "נסה לבחור קטגוריה אחרת"
          : "האירועים הבאים יפורסמו כאן. הפעל התראות כדי לא לפספס!"}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EventsClient({ events }: { events: EventItem[] }) {
  const [activeType, setActiveType] = useState("הכל");

  const allTypes = ["הכל", ...Object.entries(EVENT_TYPE_LABELS).map(([, label]) => label)];

  const filtered =
    activeType === "הכל"
      ? events
      : events.filter((e) => (EVENT_TYPE_LABELS[e.type] ?? e.type) === activeType);

  const hasFilter = activeType !== "הכל";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">אירועים קרובים</h1>
        <p className="text-sm text-gray-500">
          {events.length > 0
            ? `${events.length} אירועים מתוכננים`
            : "אין אירועים קרובים כרגע"}
        </p>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        {allTypes.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeType === type
                ? "bg-teal text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-teal hover:text-teal"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Events */}
      {filtered.length === 0 ? (
        <EmptyState hasFilter={hasFilter} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
