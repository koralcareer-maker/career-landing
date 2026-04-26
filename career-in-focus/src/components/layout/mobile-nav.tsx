"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, TrendingUp, Briefcase, Users, User } from "lucide-react";

const MOBILE_ITEMS = [
  { href: "/dashboard",  label: "בקרה",    icon: LayoutDashboard },
  { href: "/progress",   label: "התקדמות", icon: TrendingUp },
  { href: "/jobs",       label: "משרות",   icon: Briefcase },
  { href: "/community",  label: "קהילה",   icon: Users },
  { href: "/profile",    label: "פרופיל",  icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex md:hidden z-50 px-2">
      {MOBILE_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors",
              active ? "text-teal" : "text-gray-400"
            )}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
