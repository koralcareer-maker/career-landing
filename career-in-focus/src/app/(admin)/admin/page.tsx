import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Users, Briefcase, BookOpen, CalendarDays, TrendingUp, Bell, Star } from "lucide-react";

export default async function AdminDashboard() {
  const [
    totalUsers, activeUsers, pendingUsers,
    totalJobs, totalCourses, totalEvents, totalTools,
    recentUsers, photoUpgrades, passportCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { accessStatus: "ACTIVE" } }),
    prisma.user.count({ where: { accessStatus: "PENDING" } }),
    prisma.job.count({ where: { isPublished: true } }),
    prisma.course.count({ where: { isPublished: true } }),
    prisma.event.count({ where: { isPublished: true } }),
    prisma.tool.count({ where: { isPublished: true } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, name: true, email: true, createdAt: true, accessStatus: true, role: true } }),
    prisma.user.count({ where: { photoUpgradeStatus: "REQUESTED" } }),
    prisma.careerPassport.count(),
  ]);

  const stats = [
    { label: "משתמשים רשומים",   value: totalUsers,   icon: Users,       href: "/admin/users",   color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "חברים פעילים",     value: activeUsers,  icon: TrendingUp,   href: "/admin/users",   color: "text-green-600",  bg: "bg-green-50" },
    { label: "ממתינים לאישור",   value: pendingUsers,  icon: Bell,         href: "/admin/users",   color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "משרות פעילות",     value: totalJobs,    icon: Briefcase,    href: "/admin/jobs",    color: "text-teal",       bg: "bg-teal-pale" },
    { label: "קורסים",           value: totalCourses, icon: BookOpen,     href: "/admin/courses", color: "text-purple-600", bg: "bg-purple-50" },
    { label: "אירועים",          value: totalEvents,  icon: CalendarDays, href: "/admin/events",  color: "text-orange-500", bg: "bg-orange-50" },
    { label: "כלים ומשאבים",    value: totalTools,   icon: Star,         href: "/admin/tools",   color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "דרכוני קריירה",   value: passportCount, icon: Star,         href: "/admin/users",   color: "text-pink-600",   bg: "bg-pink-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">סקירה כללית</h1>
        <p className="text-gray-500 text-sm mt-0.5">ניהול פלטפורמת קריירה בפוקוס</p>
      </div>

      {/* Photo upgrade alert */}
      {photoUpgrades > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
              <Star size={16} className="text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-purple-900 text-sm">{photoUpgrades} בקשות שדרוג תמונה ממתינות</p>
              <p className="text-purple-600 text-xs">מחיר: ₪49 לבקשה</p>
            </div>
          </div>
          <Link href="/admin/users" className="text-sm font-semibold text-purple-700 hover:underline">טפל עכשיו</Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card hover padding="md" className="h-full">
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon size={17} className={s.color} />
                </div>
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent users */}
      <Card>
        <CardHeader>
          <CardTitle>משתמשים חדשים</CardTitle>
          <Link href="/admin/users" className="text-xs text-teal hover:underline">כל המשתמשים</Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right pb-2 px-2 font-semibold text-gray-400 text-xs">שם</th>
                  <th className="text-right pb-2 px-2 font-semibold text-gray-400 text-xs">אימייל</th>
                  <th className="text-right pb-2 px-2 font-semibold text-gray-400 text-xs">סטטוס</th>
                  <th className="text-right pb-2 px-2 font-semibold text-gray-400 text-xs">תפקיד</th>
                  <th className="text-right pb-2 px-2 font-semibold text-gray-400 text-xs">תאריך</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-2 font-medium text-navy">{u.name ?? "—"}</td>
                    <td className="py-2.5 px-2 text-gray-500">{u.email}</td>
                    <td className="py-2.5 px-2">
                      <Badge variant={u.accessStatus === "ACTIVE" ? "green" : u.accessStatus === "PENDING" ? "yellow" : "red"} size="sm">
                        {u.accessStatus === "ACTIVE" ? "פעיל" : u.accessStatus === "PENDING" ? "ממתין" : "מוגבל"}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2">
                      <Badge variant={u.role === "SUPER_ADMIN" ? "navy" : u.role === "ADMIN" ? "teal" : "gray"} size="sm">
                        {u.role === "SUPER_ADMIN" ? "סופר אדמין" : u.role === "ADMIN" ? "אדמין" : "חבר"}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/admin/jobs/new",     label: "➕ משרה חדשה" },
          { href: "/admin/events/new",   label: "📅 אירוע חדש" },
          { href: "/admin/updates/new",  label: "📢 עדכון חדש" },
          { href: "/admin/courses/new",  label: "📚 קורס חדש" },
          { href: "/admin/broadcast",    label: "📧 תפוצת מייל" },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="bg-white rounded-xl p-3 border border-gray-200 text-center text-sm font-semibold text-navy hover:bg-teal-pale hover:border-teal/30 transition-colors">
            {q.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
