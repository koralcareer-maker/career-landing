"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell, BellOff, CalendarDays, Briefcase, MessageSquare, Camera, Info, CheckCheck, ChevronLeft, Loader2,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { markRead, setNotificationsEnabled } from "@/lib/actions/notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date | string;
}

// ─── Icon helper ─────────────────────────────────────────────────────────────

function NotifIcon({ type, isRead }: { type: string; isRead: boolean }) {
  const base = "w-10 h-10 rounded-xl flex items-center justify-center shrink-0";
  const dim = isRead ? "bg-gray-100 text-gray-400" : "";

  switch (type) {
    case "event":
      return (
        <div className={`${base} ${isRead ? dim : "bg-teal-pale text-teal"}`}>
          <CalendarDays size={17} />
        </div>
      );
    case "update":
      return (
        <div className={`${base} ${isRead ? dim : "bg-navy text-white"}`}>
          <Bell size={17} />
        </div>
      );
    case "job_match":
      return (
        <div className={`${base} ${isRead ? dim : "bg-green-100 text-green-600"}`}>
          <Briefcase size={17} />
        </div>
      );
    case "community_reply":
      return (
        <div className={`${base} ${isRead ? dim : "bg-purple-100 text-purple-600"}`}>
          <MessageSquare size={17} />
        </div>
      );
    case "photo_upgrade":
      return (
        <div className={`${base} ${isRead ? dim : "bg-orange-100 text-orange-500"}`}>
          <Camera size={17} />
        </div>
      );
    default:
      return (
        <div className={`${base} ${isRead ? dim : "bg-teal-pale text-teal"}`}>
          <Info size={17} />
        </div>
      );
  }
}

// ─── Notification Item ────────────────────────────────────────────────────────

function NotifItem({ notif }: { notif: NotificationItem }) {
  const [read, setRead] = useState(notif.isRead);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!read) {
      startTransition(async () => {
        await markRead(notif.id);
        setRead(true);
      });
    }
  }

  const inner = (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl transition-colors ${
        !read ? "bg-teal-pale/50 hover:bg-teal-pale" : "hover:bg-gray-50"
      } ${isPending ? "opacity-60" : ""}`}
      onClick={handleClick}
    >
      <NotifIcon type={notif.type} isRead={read} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-snug ${read ? "text-gray-600" : "text-navy"}`}>
            {notif.title}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {!read && (
              <span className="w-2 h-2 rounded-full bg-teal shrink-0 mt-1" />
            )}
            <p className="text-xs text-gray-400">{timeAgo(notif.createdAt)}</p>
          </div>
        </div>
        <p className={`text-xs mt-0.5 leading-relaxed ${read ? "text-gray-400" : "text-gray-600"}`}>
          {notif.message}
        </p>
      </div>
      {notif.link && (
        <ChevronLeft size={14} className="text-gray-300 shrink-0 mt-1" />
      )}
    </div>
  );

  if (notif.link) {
    return (
      <Link href={notif.link} className="block cursor-pointer">
        {inner}
      </Link>
    );
  }

  return <div className="cursor-pointer">{inner}</div>;
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</h2>
      <span className="text-xs text-gray-300">({count})</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NotificationsClient({
  notifications,
  notificationsEnabled,
}: {
  notifications: NotificationItem[];
  notificationsEnabled: boolean;
}) {
  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  // Local optimistic state so the toggle reflects the user's click
  // immediately, even before the server round-trip finishes.
  const [enabled, setEnabled] = useState(notificationsEnabled);
  const [savingPrefs, startSavingPrefs] = useTransition();

  function togglePrefs() {
    const next = !enabled;
    setEnabled(next);
    startSavingPrefs(async () => {
      const r = await setNotificationsEnabled(next);
      if ("error" in r && r.error) {
        // Roll back on failure.
        setEnabled(!next);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-navy mb-1">התראות</h1>
          <p className="text-sm text-gray-500">
            {unread.length > 0
              ? `${unread.length} התראות שלא נקראו`
              : "כל ההתראות נקראו"}
          </p>
        </div>
        {unread.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-teal">
            <CheckCheck size={14} />
            <span>סומן כנקרא בכניסה לדף</span>
          </div>
        )}
      </div>

      {/* Notifications master switch — sits at the top so it's easy to
          find. Toggles BOTH the in-app broadcasts and the daily
          job-alert emails. */}
      <div className={`rounded-2xl border p-4 ${enabled ? "bg-white border-slate-200" : "bg-slate-50 border-slate-300"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              aria-hidden="true"
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                enabled ? "bg-teal-pale text-teal" : "bg-slate-200 text-slate-500"
              }`}
            >
              {enabled ? <Bell size={18} /> : <BellOff size={18} />}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-navy text-sm">
                {enabled ? "ההתראות פעילות" : "ההתראות מושבתות"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {enabled
                  ? "תקבל/י עדכונים על תוכן חדש, אירועים, ומשרות מתאימות (מעל 75% התאמה)."
                  : "לא תקבל/י עדכונים במערכת ולא מיילים. ניתן להפעיל בכל עת."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={togglePrefs}
            disabled={savingPrefs}
            aria-pressed={enabled}
            aria-label={enabled ? "כיבוי התראות" : "הפעלת התראות"}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-teal disabled:opacity-50 ${
              enabled ? "bg-teal" : "bg-slate-300"
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-[-22px]" : "translate-x-[-2px]"
              }`}
            />
            {savingPrefs && (
              <Loader2
                size={11}
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white"
              />
            )}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-teal-pale rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell size={28} className="text-teal" />
          </div>
          <h3 className="font-bold text-navy text-lg mb-2">אין התראות</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            כשיהיו לך עדכונים, ראיונות, או תגובות — הן יופיעו כאן.
          </p>
        </div>
      )}

      {/* Unread */}
      {unread.length > 0 && (
        <section>
          <SectionHeader label="חדשות" count={unread.length} />
          <div className="space-y-1">
            {unread.map((n) => (
              <NotifItem key={n.id} notif={n} />
            ))}
          </div>
        </section>
      )}

      {/* Read */}
      {read.length > 0 && (
        <section>
          {unread.length > 0 && (
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-300 font-medium">ישנות</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
          )}
          <SectionHeader label="ישנות" count={read.length} />
          <div className="space-y-1">
            {read.map((n) => (
              <NotifItem key={n.id} notif={n} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
