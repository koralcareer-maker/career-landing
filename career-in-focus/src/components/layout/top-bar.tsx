"use client";

import Link from "next/link";
import { Bell, Menu, X } from "lucide-react";
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
  "/updates":      "עדכונים",
  "/notifications":"התראות",
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
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-black/5 shadow-[0_1px_12px_rgba(0,0,0,0.06)] px-6 py-3 flex items-center justify-between md:px-8">
      <h1 className="text-base font-bold text-navy">{title}</h1>
      <div className="flex items-center gap-2">
        <Link href="/notifications" className="relative p-2 rounded-xl hover:bg-cream transition-colors">
          <Bell size={18} className="text-navy/60" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal rounded-full ring-2 ring-white" />
          )}
        </Link>
        <Link href="/profile" className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-cream transition-colors">
          <div className="w-7 h-7 bg-teal rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user.image
              ? <img src={user.image} alt="" className="w-7 h-7 rounded-full object-cover" />
              : (user.name?.charAt(0) ?? "?")}
          </div>
          <span className="text-sm font-medium text-navy/80 hidden sm:block">{user.name?.split(" ")[0]}</span>
        </Link>
      </div>
    </header>
  );
}
