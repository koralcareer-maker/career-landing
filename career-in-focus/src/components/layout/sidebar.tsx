"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn, getInitials } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";
import {
  LayoutDashboard, TrendingUp, User, BookOpen, Wrench,
  Briefcase, Users, CalendarDays, Bell, MessageSquare,
  LogOut, Star, Settings, Sparkles, Network
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",      label: "לוח הבקרה",       icon: LayoutDashboard },
  { href: "/coaching",       label: "מאמן AI",          icon: Sparkles },
  { href: "/progress",       label: "התקדמות",          icon: TrendingUp },
  { href: "/profile",        label: "פרופיל ודרכון",    icon: User },
  { href: "/skills",         label: "מיומנויות",        icon: Star },
  { href: "/courses",        label: "קורסים",           icon: BookOpen },
  { href: "/tools",          label: "כלים ומשאבים",     icon: Wrench },
  { href: "/jobs",           label: "משרות",            icon: Briefcase },
  { href: "/community",      label: "קהילה",            icon: Users },
  { href: "/events",         label: "אירועים",          icon: CalendarDays },
  { href: "/updates",        label: "עדכונים",          icon: MessageSquare },
  { href: "/notifications",  label: "התראות",           icon: Bell },
  { href: "/network",        label: "קשרי קורל ✨",     icon: Network },
];

interface SidebarProps {
  user: { name?: string | null; email?: string; role?: string; image?: string | null };
  unreadCount?: number;
}

export function Sidebar({ user, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  return (
    <aside className="fixed right-0 top-0 h-screen w-64 bg-navy flex flex-col z-40 border-l border-white/5 shadow-2xl">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/logo.png" alt="קריירה בפוקוס" width={38} height={38} className="rounded-xl" />
          <div>
            <div className="text-white font-bold text-sm leading-tight">קריירה בפוקוס</div>
            <div className="text-teal/60 text-xs">Career in Focus</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
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
                  active
                    ? "bg-teal text-white shadow-sm shadow-teal/30"
                    : "text-white/55 hover:text-white hover:bg-white/8"
                )}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.href === "/notifications" && unreadCount > 0 && (
                  <span className="mr-auto bg-white text-teal text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-white/30 text-xs font-semibold px-3 mb-2 tracking-wider uppercase">ניהול</p>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                pathname.startsWith("/admin")
                  ? "bg-teal text-white shadow-sm shadow-teal/30"
                  : "text-white/55 hover:text-white hover:bg-white/8"
              )}
            >
              <Settings size={17} />
              <span>פאנל ניהול</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User profile */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mb-1">
          <div className="w-9 h-9 bg-teal rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow">
            {user.image ? (
              <img src={user.image} alt={user.name ?? ""} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              getInitials(user.name)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user.name ?? "משתמש"}</p>
            <p className="text-white/40 text-xs truncate">{user.email}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150"
          >
            <LogOut size={15} />
            <span>יציאה</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
