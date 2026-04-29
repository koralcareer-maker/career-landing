"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn, getInitials } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";
import {
  LayoutDashboard, TrendingUp, User, BookOpen, Wrench,
  Briefcase, Users, CalendarDays, Bell, MessageSquare,
  LogOut, Star, Settings, Sparkles, Network, HelpCircle, UserSearch
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  premium?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",           label: "דשבורד",               icon: LayoutDashboard },
  { href: "/coaching",            label: "מאמן AI",               icon: Sparkles },
  { href: "/progress",            label: "התקדמות",               icon: TrendingUp },
  { href: "/profile",             label: "פרופיל",                icon: User },
  { href: "/skills",              label: "מיומנויות",             icon: Star },
  { href: "/courses",             label: "קורסים",                icon: BookOpen },
  { href: "/tools",               label: "כלים",                  icon: Wrench },
  { href: "/jobs",                label: "משרות",                 icon: Briefcase },
  { href: "/community",           label: "קהילה",                 icon: Users },
  { href: "/events",              label: "אירועים",               icon: CalendarDays },
  { href: "/updates",             label: "עדכונים",               icon: MessageSquare },
  { href: "/notifications",       label: "התראות",                icon: Bell },
  { href: "/recruiters",          label: "ספריית מגייסים",        icon: UserSearch },
  { href: "/koral-connections",   label: "קורל תפעילי קשרים",    icon: Network, premium: true },
];

interface SidebarProps {
  user: { name?: string | null; email?: string; role?: string; image?: string | null };
  unreadCount?: number;
}

export function Sidebar({ user, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  return (
    <aside className="fixed right-0 top-0 h-screen w-60 bg-white flex flex-col z-40 border-l border-slate-100 shadow-xl">

      {/* ─── Logo — very prominent ─── */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <Image
              src="/logo.png"
              alt="קריירה בפוקוס"
              width={46}
              height={46}
              className="rounded-2xl shadow-md group-hover:shadow-teal/30 transition-shadow"
            />
            <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-teal rounded-full border-2 border-white" />
          </div>
          <div>
            <div className="text-navy font-black text-base leading-tight">קורל</div>
            <div className="text-teal text-xs font-semibold">קריירה בפוקוס</div>
          </div>
        </Link>
      </div>

      {/* ─── Navigation ─── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  item.premium && !active
                    ? "text-teal hover:bg-teal/8 hover:text-teal font-semibold"
                    : active
                      ? "bg-teal text-white shadow-sm shadow-teal/25"
                      : "text-slate-500 hover:text-navy hover:bg-slate-50"
                )}
              >
                <Icon size={17} className={cn(item.premium && !active && "text-teal")} />
                <span>{item.label}</span>
                {item.href === "/notifications" && unreadCount > 0 && (
                  <span className="mr-auto bg-teal text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Admin */}
        {isAdmin && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-slate-400 text-xs font-semibold px-3 mb-2 tracking-wider uppercase">ניהול</p>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                pathname.startsWith("/admin")
                  ? "bg-teal text-white shadow-sm shadow-teal/25"
                  : "text-slate-500 hover:text-navy hover:bg-slate-50"
              )}
            >
              <Settings size={17} />
              <span>פאנל ניהול</span>
            </Link>
          </div>
        )}

        {/* ─── Premium upgrade box ─── */}
        <div className="mt-5 rounded-2xl bg-gradient-to-br from-teal/10 to-teal/5 border border-teal/20 p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={13} className="text-teal" />
            <p className="text-xs font-bold text-teal">שדרגי את החוויה שלך</p>
          </div>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            הצטרפי לחברות פרימיום וקבלי גישה למעטפת מלאה של כלים, קורסים והזדמנויות.
          </p>
          <Link
            href="/koral-connections"
            className="block w-full text-center bg-teal text-white text-xs font-bold py-2 rounded-xl hover:bg-teal/90 transition-colors"
          >
            לפרטים נוספים ←
          </Link>
        </div>
      </nav>

      {/* ─── User + bottom links ─── */}
      <div className="px-3 pb-3 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 mb-2">
          <div className="w-8 h-8 bg-teal rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.image ? (
              <img src={user.image} alt={user.name ?? ""} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              getInitials(user.name)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-navy text-xs font-bold truncate">{user.name ?? "משתמש"}</p>
            <p className="text-slate-400 text-xs truncate">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-400 px-1">
          <Link href="/admin" className="hover:text-teal transition-colors px-2 py-1">עזרה</Link>
          <span>|</span>
          <Link href="/profile" className="hover:text-teal transition-colors px-2 py-1">הגדרות</Link>
          <span>|</span>
          <form action={logout} className="inline">
            <button type="submit" className="hover:text-red-400 transition-colors px-2 py-1 cursor-pointer">
              יציאה
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
