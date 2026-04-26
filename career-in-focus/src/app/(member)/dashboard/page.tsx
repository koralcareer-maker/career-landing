import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getReadinessScore } from "@/lib/utils";
import Link from "next/link";
import {
  Briefcase, CalendarDays, Users, Target,
  ChevronLeft, Flame, BookOpen, Wrench,
  MessageSquare, Search, MapPin, Clock,
  TrendingUp, Sparkles
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = session!.user.name?.split(" ")[0] ?? "חבר";

  const [profile, hotJobs, upcomingEvents, posts, courses, tools] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.job.findMany({ where: { isHot: true, isPublished: true }, take: 3, orderBy: { createdAt: "desc" } }),
    prisma.event.findMany({ where: { isPublished: true, startAt: { gte: new Date() } }, orderBy: { startAt: "asc" }, take: 3 }),
    prisma.post.findMany({
      where: { isHidden: false }, orderBy: { createdAt: "desc" }, take: 4,
      include: { author: { select: { name: true, image: true } } }
    }),
    prisma.course.findMany({ where: { isPublished: true }, take: 4, orderBy: { createdAt: "desc" } }),
    prisma.tool.findMany({ where: { isPublished: true }, take: 4, orderBy: { createdAt: "desc" } }),
  ]);

  const readinessScore = profile ? getReadinessScore(profile) : 0;

  const activeApps = await prisma.jobApplication.count({
    where: { userId, status: { in: ["APPLIED", "FOLLOWUP_SENT", "INTERVIEW_SCHEDULED"] } }
  });
  const activeCourses = await prisma.course.count({ where: { isPublished: true } });

  function timeAgo(date: Date) {
    const diff = Date.now() - new Date(date).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "לפני פחות משעה";
    if (h < 24) return `לפני ${h} שעות`;
    return `לפני ${Math.floor(h / 24)} ימים`;
  }

  function formatEventDate(date: Date) {
    return new Date(date).toLocaleDateString("he-IL", { day: "numeric", month: "long" });
  }

  function formatEventTime(date: Date) {
    return new Date(date).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-0 sm:px-2 py-5 space-y-5">

        {/* ─── Hero / Welcome ─── */}
        <div className="rounded-3xl overflow-hidden bg-white shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row items-center gap-0">

            {/* Network visual left panel */}
            <div className="w-full sm:w-56 h-44 sm:h-auto bg-gradient-to-br from-[#e8f8f8] to-[#d0f0f0] flex items-center justify-center shrink-0 relative overflow-hidden">
              {/* Decorative network dots */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-36 h-36">
                  {/* Center avatar */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-teal rounded-full flex items-center justify-center shadow-lg z-10">
                    <Users size={20} className="text-white" />
                  </div>
                  {/* Orbiting avatars */}
                  {[
                    { top: "0%",   left: "50%", bg: "bg-navy" },
                    { top: "50%",  left: "0%",  bg: "bg-[#2ab8b8]" },
                    { top: "50%",  left: "100%",bg: "bg-slate-300" },
                    { top: "100%", left: "30%", bg: "bg-teal/60" },
                    { top: "25%",  left: "85%", bg: "bg-navy/50" },
                  ].map((dot, i) => (
                    <div key={i} className={`absolute w-7 h-7 ${dot.bg} rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2`}
                      style={{ top: dot.top, left: dot.left }} />
                  ))}
                  {/* Lines */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 144 144">
                    <line x1="72" y1="72" x2="72" y2="0" stroke="#3ECFCF" strokeWidth="1" strokeOpacity="0.4" />
                    <line x1="72" y1="72" x2="0" y2="72" stroke="#3ECFCF" strokeWidth="1" strokeOpacity="0.4" />
                    <line x1="72" y1="72" x2="144" y2="72" stroke="#3ECFCF" strokeWidth="1" strokeOpacity="0.4" />
                    <line x1="72" y1="72" x2="43" y2="144" stroke="#3ECFCF" strokeWidth="1" strokeOpacity="0.4" />
                    <line x1="72" y1="72" x2="122" y2="36" stroke="#3ECFCF" strokeWidth="1" strokeOpacity="0.4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Text content */}
            <div className="flex-1 px-7 py-6">
              <h1 className="text-2xl font-black text-navy mb-1.5">
                {firstName}, ברוכה הבאה למערכת הקריירה שלך ✨
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed mb-5">
                אנחנו כאן כדי לחבר אותך להזדמנויות, אנשים וקשרים שיקדמו אותך מקצועית.
              </p>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 bg-teal hover:bg-teal/90 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md shadow-teal/25 transition-all duration-150 hover:-translate-y-0.5"
              >
                <Search size={15} />
                חיפוש משרות מותאמות
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Stats ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "משרות מתאימות",
              value: hotJobs.length > 0 ? hotJobs.length : 12,
              sub: "עודכנו היום",
              icon: <Briefcase size={20} className="text-teal" />,
              href: "/jobs",
            },
            {
              label: "קורסים פעילים",
              value: activeCourses,
              sub: "המשך למידה",
              icon: <BookOpen size={20} className="text-teal" />,
              href: "/courses",
            },
            {
              label: "רמת התאמה",
              value: `${readinessScore}%`,
              sub: readinessScore >= 70 ? "פרופיל חזק" : "השלמת פרופיל",
              icon: <Target size={20} className="text-teal" />,
              href: "/profile",
            },
            {
              label: "קשרים פעילים",
              value: 24,
              sub: "אנשי קשר בקהילה",
              icon: <Users size={20} className="text-teal" />,
              href: "/community",
            },
          ].map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
                <div className="w-8 h-8 bg-teal/10 rounded-xl flex items-center justify-center group-hover:bg-teal/20 transition-colors">
                  {s.icon}
                </div>
              </div>
              <p className="text-3xl font-black text-navy">{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
            </Link>
          ))}
        </div>

        {/* ─── Main two-column ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Hot jobs (2/3) */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-orange-400" />
                <h2 className="font-black text-navy text-base">משרות חמות עבורך</h2>
              </div>
              <Link href="/jobs" className="text-teal text-xs font-semibold flex items-center gap-0.5 hover:underline">
                לכל המשרות <ChevronLeft size={14} />
              </Link>
            </div>

            {hotJobs.length > 0 ? (
              <div className="space-y-3">
                {hotJobs.map((job) => (
                  <div key={job.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-teal/30 transition-all duration-150 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal/10 to-teal/5 rounded-xl flex items-center justify-center shrink-0">
                      <Briefcase size={16} className="text-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy text-sm truncate">{job.title}</p>
                      <p className="text-teal text-xs font-semibold">{job.company}</p>
                      {job.location && (
                        <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                          <MapPin size={10} /> {job.location}
                        </div>
                      )}
                    </div>
                    <div className="text-center shrink-0">
                      <div className="text-lg font-black text-teal">90%</div>
                      <div className="text-[10px] text-slate-400">התאמה שלך</div>
                      <div className="text-[10px] bg-teal/10 text-teal rounded-full px-2 py-0.5 mt-1 font-semibold">משרה מלאה</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Placeholder jobs */
              <div className="space-y-3">
                {[
                  { title: "מנהלת שיווק דיגיטלי", company: "SimilarWeb", loc: "תל אביב", match: 89 },
                  { title: "מובילת פרויקטים", company: "Monday.com", loc: "תל אביב", match: 92 },
                  { title: "Product Manager", company: "Wix", loc: "תל אביב", match: 96 },
                ].map((job) => (
                  <Link key={job.title} href="/jobs"
                    className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-teal/30 transition-all duration-150">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal/10 to-teal/5 rounded-xl flex items-center justify-center shrink-0">
                      <Briefcase size={16} className="text-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy text-sm">{job.title}</p>
                      <p className="text-teal text-xs font-semibold">{job.company}</p>
                      <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                        <MapPin size={10} /> {job.loc}
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <div className="text-lg font-black text-teal">{job.match}%</div>
                      <div className="text-[10px] text-slate-400">התאמה שלך</div>
                      <div className="text-[10px] bg-teal/10 text-teal rounded-full px-2 py-0.5 mt-1 font-semibold">משרה מלאה</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming events (1/3) */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CalendarDays size={17} className="text-teal" />
                <h2 className="font-black text-navy text-base">אירועים קרובים</h2>
              </div>
              <Link href="/events" className="text-teal text-xs font-semibold flex items-center gap-0.5 hover:underline">
                לכל האירועים <ChevronLeft size={14} />
              </Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => {
                  const d = new Date(ev.startAt);
                  return (
                    <Link key={ev.id} href="/events"
                      className="flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                      <div className="w-12 h-12 bg-teal rounded-xl flex flex-col items-center justify-center text-white shrink-0 shadow-sm shadow-teal/20">
                        <span className="text-base font-black leading-none">{d.getDate()}</span>
                        <span className="text-[9px] font-semibold opacity-80">{d.toLocaleDateString("he-IL", { month: "short" })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-navy text-xs leading-snug">{ev.title}</p>
                        <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                          <Clock size={10} /> {formatEventTime(d)}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{ev.isOnline ? "ZOOM" : ev.location}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { day: "28", mon: "מאי", title: "מנטורינג קידום קריירה עם מיכל לוי", time: "18:00–19:30", loc: "ZOOM" },
                  { day: "04", mon: "יוני", title: "נטוורקינג לנשים בתעשייה", time: "19:00–20:00", loc: "תל אביב" },
                  { day: "10", mon: "יוני", title: "סדנת הכנה לראיונות עבודה", time: "18:00–20:00", loc: "ZOOM" },
                ].map((ev) => (
                  <Link key={ev.day} href="/events"
                    className="flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                    <div className="w-12 h-12 bg-teal rounded-xl flex flex-col items-center justify-center text-white shrink-0 shadow-sm shadow-teal/20">
                      <span className="text-base font-black leading-none">{ev.day}</span>
                      <span className="text-[9px] font-semibold opacity-80">{ev.mon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy text-xs leading-snug">{ev.title}</p>
                      <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                        <Clock size={10} /> {ev.time}
                      </p>
                      <p className="text-xs text-slate-400">{ev.loc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Content library ─── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={17} className="text-teal" />
              <h2 className="font-black text-navy text-base">ספריית התוכן שלך</h2>
            </div>
            <Link href="/courses" className="text-teal text-xs font-semibold flex items-center gap-0.5 hover:underline">
              לכל התכנים <ChevronLeft size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {courses.length > 0 ? courses.slice(0, 4).map((c) => (
              <Link key={c.id} href="/courses"
                className="group rounded-2xl overflow-hidden border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
                <div className="h-24 bg-gradient-to-br from-teal/20 to-navy/10 flex items-center justify-center">
                  <BookOpen size={28} className="text-teal/50" />
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-navy leading-snug line-clamp-2">{c.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{c.category ?? "קריירה בפוקוס"}</p>
                </div>
              </Link>
            )) : (
              /* Placeholder content */
              [
                { title: "אסטרטגיית שיווק דיגיטלי למתקדמות", by: "עם דנה רוזן", type: "קורס", mins: 45 },
                { title: "איך לספר את הסיפור שלך בראיון עבודה", by: "עם רותם אלון", type: "סדנה מוקלטת", mins: 60 },
                { title: "בניית קורות חיים מנצחים — תבניות וטיפים", by: "מדריך להורדה", type: "מדריך", mins: 30 },
                { title: "כיצד לבנות ולחזק רשת קשרים אפקטיבית", by: "עם עדי שטרן", type: "הרצאה", mins: 35 },
              ].map((c) => (
                <Link key={c.title} href="/courses"
                  className="group rounded-2xl overflow-hidden border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
                  <div className="h-24 bg-gradient-to-br from-teal/15 to-navy/8 flex items-center justify-center relative">
                    <BookOpen size={28} className="text-teal/40" />
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <span className="text-[10px] bg-teal text-white px-1.5 py-0.5 rounded-full font-semibold">{c.type}</span>
                      <span className="text-[10px] bg-white/80 text-slate-600 px-1.5 py-0.5 rounded-full">{c.mins} דק׳</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-navy leading-snug line-clamp-2">{c.title}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{c.by}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* ─── Tools + Community row ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Tools */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Wrench size={17} className="text-teal" />
                <h2 className="font-black text-navy text-base">כלים ומשאבים</h2>
              </div>
              <Link href="/tools" className="text-teal text-xs font-semibold flex items-center gap-0.5 hover:underline">
                לכל הכלים <ChevronLeft size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "מחולל קורות חיים", sub: "AI לבנייה מניצחת", icon: <Sparkles size={18} className="text-teal" />, href: "/tools" },
                { label: "מכין לראיונות", sub: "שאלות וטיפים", icon: <MessageSquare size={18} className="text-teal" />, href: "/tools" },
                { label: "בודק התאמה למשרה", sub: "בדיקת התאמה חכמה", icon: <Target size={18} className="text-teal" />, href: "/jobs" },
                { label: "תכנון קריירה", sub: "כלים לתכנון וקידום", icon: <TrendingUp size={18} className="text-teal" />, href: "/progress" },
              ].map((t) => (
                <Link key={t.label} href={t.href}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-teal/30 transition-all">
                  <div className="w-9 h-9 bg-teal/10 rounded-xl flex items-center justify-center shrink-0">
                    {t.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy">{t.label}</p>
                    <p className="text-[11px] text-slate-400 truncate">{t.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Community feed */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-teal" />
                <h2 className="font-black text-navy text-base">מה חדש בקהילה</h2>
              </div>
              <Link href="/community" className="text-teal text-xs font-semibold flex items-center gap-0.5 hover:underline">
                לכל העדכונים <ChevronLeft size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {posts.length > 0 ? posts.map((p) => (
                <Link key={p.id} href="/community"
                  className="flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                  <div className="w-8 h-8 bg-teal/20 rounded-full flex items-center justify-center text-teal text-xs font-bold shrink-0">
                    {p.author?.name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-bold text-navy">{p.author?.name ?? "חבר קהילה"}</span>
                      <span className="text-[11px] text-slate-400">{timeAgo(p.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{p.content}</p>
                  </div>
                </Link>
              )) : (
                [
                  { name: "שרה", action: "שיתפה משרה חדשה", detail: "UX Researcher ב-Similarweb", color: "bg-pink-100 text-pink-600" },
                  { name: "נועה", action: "המליצה על קורס חדש", detail: "קורס ניהול פרוד׳ — ממולץ לממתחילות", color: "bg-blue-100 text-blue-600" },
                  { name: "דנה", action: "שאלה שאלה בפורום", detail: "מתלבטת לגבי מעבר לתחום הדאטה, למי יש טיפים?", color: "bg-teal/15 text-teal" },
                  { name: "מיכל", action: "שיתפה הצלחה 🎉", detail: "התקבלתי לתפקיד — תודה לכולם על התמיכה!", color: "bg-green-100 text-green-600" },
                ].map((p) => (
                  <Link key={p.name} href="/community"
                    className="flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                    <div className={`w-8 h-8 ${p.color} rounded-full flex items-center justify-center text-xs font-bold shrink-0`}>
                      {p.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-bold text-navy">{p.name}</span>
                        <span className="text-[11px] text-slate-400">{p.action}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{p.detail}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
