import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateShort, getReadinessScore } from "@/lib/utils";
import Link from "next/link";
import {
  TrendingUp, Briefcase, CalendarDays, Users,
  Star, ChevronLeft, Zap, ArrowUpRight,
  FileText, Flame, Bell, BarChart3
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = session!.user.name?.split(" ")[0] ?? "חבר";

  const [profile, passport, hotJobs, latestUpdates, upcomingEvents, posts] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.careerPassport.findUnique({ where: { userId } }),
    prisma.job.findMany({ where: { isHot: true, isPublished: true }, take: 4, orderBy: { createdAt: "desc" } }),
    prisma.update.findMany({ where: { isPublished: true }, orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }], take: 3 }),
    prisma.event.findMany({ where: { isPublished: true, startAt: { gte: new Date() } }, orderBy: { startAt: "asc" }, take: 3 }),
    prisma.post.findMany({ where: { isHidden: false }, orderBy: { createdAt: "desc" }, take: 3, include: { author: { select: { name: true } }, _count: { select: { likes: true, comments: true } } } }),
  ]);

  const readinessScore = profile ? getReadinessScore(profile) : 0;
  const passportDone = !!passport;

  const stats = {
    applied: await prisma.jobApplication.count({ where: { userId, status: { in: ["APPLIED", "FOLLOWUP_SENT", "INTERVIEW_SCHEDULED", "FIRST_INTERVIEW", "ADVANCED_INTERVIEW"] } } }),
    interviews: await prisma.jobApplication.count({ where: { userId, status: { in: ["FIRST_INTERVIEW", "ADVANCED_INTERVIEW", "OFFER"] } } }),
    total: await prisma.jobApplication.count({ where: { userId } }),
  };

  const tasks = [
    ...(!passportDone  ? [{ href: "/profile",   label: "בני דרכון קריירה עם AI", icon: Star     }] : []),
    ...(!profile?.resumeUrl ? [{ href: "/profile", label: "העלי קורות חיים",      icon: FileText }] : []),
    { href: "/jobs",      label: "בדקי 3 משרות חדשות",     icon: Briefcase },
    { href: "/community", label: "שתפי עדכון בקהילה",      icon: Users     },
  ];

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Hero ── */}
      <div className="relative bg-navy rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(28,28,46,0.35)]">
        {/* layered gradients */}
        <div className="absolute inset-0 bg-gradient-to-bl from-teal/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-tr from-navy-light/60 via-transparent to-transparent" />
        {/* glow orbs */}
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-teal/8 rounded-full blur-3xl" />
        <div className="absolute left-0 bottom-0 w-48 h-48 bg-teal/5 rounded-full blur-2xl" />

        <div className="relative px-7 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <p className="text-teal/80 text-xs font-semibold tracking-widest uppercase mb-2">ברוכה הבאה 👋</p>
            <h2 className="text-3xl font-black text-white leading-tight">{firstName}</h2>
            <p className="text-white/40 text-sm mt-1.5">
              {passportDone
                ? readinessScore >= 80 ? "את מוכנה לחיפוש עבודה — כל הכבוד 🎯" : "יש עוד מה לשפר — נמשיך ביחד"
                : "מלאי את הפרופיל ודרכון הקריירה לניתוח אישי"}
            </p>
          </div>
          {!passportDone && (
            <Link href="/profile"
              className="shrink-0 bg-teal text-white font-semibold px-5 py-3 rounded-2xl hover:bg-teal-dark hover:shadow-[0_4px_20px_rgba(62,207,207,0.4)] hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm">
              <Star size={14} />
              צרי דרכון קריירה
            </Link>
          )}
        </div>

        {/* progress */}
        <div className="relative px-7 pb-7">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-white/30">מוכנות לחיפוש עבודה</span>
            <span className="font-black text-teal">{readinessScore}%</span>
          </div>
          <div className="h-2 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(62,207,207,0.6)]"
              style={{ width: `${readinessScore}%`, background: "linear-gradient(90deg,#2BAAAA,#5EDADA)" }} />
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "בקשות פעילות", value: stats.applied,        icon: Briefcase,  opacity: "opacity-100" },
          { label: "ראיונות",      value: stats.interviews,      icon: Users,       opacity: "opacity-75"  },
          { label: "סה״כ הגשות",  value: stats.total,           icon: BarChart3,   opacity: "opacity-50"  },
          { label: "ניקוד מוכנות", value: `${readinessScore}%`, icon: TrendingUp,  opacity: "opacity-30"  },
        ].map(({ label, value, icon: Icon, opacity }) => (
          <div key={label}
            className="bg-white rounded-2xl p-4 border border-black/5 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all">
            <div className={`w-8 h-8 bg-teal-pale rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={15} className={`text-teal ${opacity}`} />
            </div>
            <div className="text-2xl font-black text-navy">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Tasks ── */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-teal rounded-lg flex items-center justify-center shadow-sm">
                <Zap size={13} className="text-white" />
              </div>
              <span className="font-bold text-navy text-sm">משימות להיום</span>
            </div>
            <span className="text-[11px] font-medium text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full">{tasks.length}</span>
          </div>
          <div className="p-3 space-y-1.5">
            {tasks.map((task, i) => {
              const Icon = task.icon;
              const alpha = 1 - i * 0.15;
              return (
                <Link key={task.label} href={task.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-teal-pale border border-transparent hover:border-teal/15 transition-all group">
                  <div className="w-7 h-7 bg-teal-pale rounded-lg flex items-center justify-center shrink-0 group-hover:bg-teal group-hover:shadow-sm transition-all">
                    <Icon size={13} className="text-teal group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-navy/80 flex-1 group-hover:text-navy transition-colors">{task.label}</span>
                  <ChevronLeft size={13} className="text-gray-300 group-hover:text-teal group-hover:-translate-x-0.5 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Hot Jobs ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-navy rounded-lg flex items-center justify-center shadow-sm">
                <Flame size={13} className="text-teal" />
              </div>
              <span className="font-bold text-navy text-sm">משרות חמות</span>
            </div>
            <Link href="/jobs" className="text-xs text-teal hover:underline flex items-center gap-1">
              כל המשרות <ChevronLeft size={11} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50/80">
            {hotJobs.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-10">אין משרות חמות כרגע</p>
            ) : hotJobs.map((job) => {
              const matchScore = passport ? Math.floor(60 + Math.random() * 35) : null;
              return (
                <Link key={job.id} href="/jobs"
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-teal-pale/50 transition-colors group">
                  <div className="w-9 h-9 bg-navy/6 rounded-xl flex items-center justify-center text-navy/60 font-black text-sm shrink-0 group-hover:bg-teal group-hover:text-white transition-all group-hover:shadow-sm">
                    {job.company.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy text-sm truncate">{job.title}</p>
                    <p className="text-xs text-gray-400">{job.company} · {job.location}</p>
                  </div>
                  {matchScore && (
                    <span className="text-xs font-bold text-teal-dark bg-teal-pale px-2 py-0.5 rounded-full shrink-0">
                      {matchScore}%
                    </span>
                  )}
                  <ArrowUpRight size={14} className="text-gray-200 group-hover:text-teal transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Updates ── */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-teal-pale rounded-lg flex items-center justify-center">
                <Bell size={13} className="text-teal" />
              </div>
              <span className="font-bold text-navy text-sm">עדכונים</span>
            </div>
            <Link href="/updates" className="text-xs text-teal hover:underline flex items-center gap-1">
              הכל <ChevronLeft size={11} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50/80">
            {latestUpdates.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-10">אין עדכונים</p>
            ) : latestUpdates.map((u) => (
              <Link key={u.id} href="/updates"
                className="block px-5 py-4 hover:bg-teal-pale/30 transition-colors group">
                {u.isPinned && (
                  <span className="text-[10px] font-bold text-teal/70 mb-1.5 block">📌 נעוץ</span>
                )}
                <p className="font-semibold text-navy text-sm group-hover:text-teal transition-colors">{u.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{u.content}</p>
                <p className="text-[10px] text-gray-300 mt-1.5">{formatDateShort(u.createdAt)}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Events ── */}
        <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-navy/8 rounded-lg flex items-center justify-center">
                <CalendarDays size={13} className="text-navy/60" />
              </div>
              <span className="font-bold text-navy text-sm">אירועים קרובים</span>
            </div>
            <Link href="/events" className="text-xs text-teal hover:underline flex items-center gap-1">
              הכל <ChevronLeft size={11} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50/80">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-10">אין אירועים קרובים</p>
            ) : upcomingEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-4 hover:bg-teal-pale/30 transition-colors">
                <div className="w-11 h-11 bg-navy rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm">
                  <span className="text-[9px] font-semibold text-teal/70 uppercase leading-none">
                    {new Date(e.startAt).toLocaleString("he-IL", { month: "short" })}
                  </span>
                  <span className="text-base font-black text-white leading-tight">
                    {new Date(e.startAt).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy text-sm">{e.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(e.startAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    {e.isOnline ? " · אונליין" : e.location ? ` · ${e.location}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Community ── */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-teal-pale rounded-lg flex items-center justify-center">
              <Users size={13} className="text-teal" />
            </div>
            <span className="font-bold text-navy text-sm">פעילות בקהילה</span>
          </div>
          <Link href="/community" className="text-xs text-teal hover:underline flex items-center gap-1">
            לקהילה <ChevronLeft size={11} />
          </Link>
        </div>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-10">היי הראשונה לפרסם!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-gray-50">
            {posts.map((post) => {
              const catLabel: Record<string, string> = { WIN: "🏆 הצלחה", TIP: "💡 טיפ", JOB: "💼 משרה", QUESTION: "❓ שאלה" };
              return (
                <Link key={post.id} href="/community"
                  className="flex flex-col gap-2.5 px-5 py-4 hover:bg-teal-pale/30 transition-colors group">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-teal-pale rounded-full flex items-center justify-center text-teal text-[10px] font-black shrink-0 group-hover:bg-teal group-hover:text-white transition-all">
                      {post.author.name?.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-navy truncate">{post.author.name}</span>
                    <span className="text-[10px] text-gray-400 mr-auto">{catLabel[post.category] ?? "פוסט"}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{post.content}</p>
                  <div className="flex gap-3 text-[10px] text-gray-300">
                    <span>❤ {post._count.likes}</span>
                    <span>💬 {post._count.comments}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
