"use client";

import Link from "next/link";
import { Bell, Briefcase } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { getInitials } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":    "לוח הבקרה",
  "/progress":     "ההתקדמות שלי",
  "/profile":      "פרופיל ודרכון קריירה",
  "/skills":       "ניתוח מיומנויות",
  "/courses":      "קורסים ותכנים",
  "/tools":        "כלים ומשאבים",
  "/jobs":         "משרות",
  "/community":    "קהילה",
  "/events":       "אירועים ופעילויות",
  "/updates":      "כל מה שקורה עכשיו",
  "/notifications":"התראות",
  "/billing":      "המנוי שלי",
  "/admin":        "פאנל ניהול",
};

interface TopBarProps {
  user: { name?: string | null; image?: string | null };
  unreadCount?: number;
}

export function TopBar({ user, unreadCount = 0 }: TopBarProps) {
  const pathname = usePathname();
  const title = Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? "";

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm px-6 py-3 flex items-center justify-between md:px-8">
      {/* Left: quick action icons. Each link carries an explicit
          aria-label so screen readers announce a meaningful name
          (the title attribute is a hover-only hint, not a guaranteed
          accessible name). */}
      <div className="flex items-center gap-1">
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl hover:bg-slate-50 transition-colors"
          aria-label={unreadCount > 0 ? `התראות, ${unreadCount} חדשות` : "התראות"}
          title="התראות"
        >
          <Bell size={18} className="text-slate-600" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal rounded-full ring-2 ring-white"
            />
          )}
        </Link>
        <Link
          href="/jobs"
          className="p-2 rounded-xl hover:bg-slate-50 transition-colors"
          aria-label="לוח משרות"
          title="משרות"
        >
          <Briefcase size={18} className="text-slate-600" aria-hidden="true" />
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
          aria-label="פרופיל אישי"
        >
          <div className="w-8 h-8 bg-teal rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
            {user.image
              ? <img src={user.image} alt="" aria-hidden="true" className="w-8 h-8 rounded-full object-cover" />
              : (user.name?.charAt(0) ?? "?")}
          </div>
          <span className="text-sm font-semibold text-navy hidden sm:block">שלום, {user.name?.split(" ")[0]}</span>
        </Link>
      </div>

      {/* Right: page title. slate-600 hits 7:1 contrast on white
          (slate-400 was only 3:1 — failed WCAG AA). */}
      <h1 className="text-sm font-semibold text-slate-600">{title}</h1>
    </header>
  );
}
