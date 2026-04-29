import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import {
  LayoutDashboard, Users, BookOpen, Wrench, Briefcase,
  CalendarDays, MessageSquare, Star, LogOut, ChevronLeft, Settings, Mail
} from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin",            label: "סקירה כללית",  icon: LayoutDashboard, exact: true },
  { href: "/admin/users",      label: "משתמשים",      icon: Users },
  { href: "/admin/broadcast",  label: "תפוצת מייל",   icon: Mail },
  { href: "/admin/courses",    label: "קורסים",       icon: BookOpen },
  { href: "/admin/tools",      label: "כלים",         icon: Wrench },
  { href: "/admin/jobs",       label: "משרות",        icon: Briefcase },
  { href: "/admin/events",     label: "אירועים",      icon: CalendarDays },
  { href: "/admin/updates",    label: "עדכונים",      icon: MessageSquare },
  { href: "/admin/candidate",  label: "מועמד השבוע",  icon: Star },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-56 bg-navy fixed right-0 top-0 h-screen flex flex-col z-40 border-l border-white/5">
        <div className="px-5 py-4 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal rounded-lg flex items-center justify-center text-white font-bold text-xs">ק</div>
            <div>
              <p className="text-white font-bold text-sm leading-none">קריירה בפוקוס</p>
              <p className="text-white/40 text-xs">פאנל ניהול</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2.5 py-3 border-t border-white/10 space-y-0.5">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors">
            <ChevronLeft size={15} />
            חזור לאתר
          </Link>
          <form action={logout}>
            <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-red-400 hover:bg-white/5 transition-colors">
              <LogOut size={15} />
              יציאה
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 mr-56 p-6 min-h-screen">
        {children}
      </main>
    </div>
  );
}
