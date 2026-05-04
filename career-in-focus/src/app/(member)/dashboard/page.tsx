import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getReadinessScore } from "@/lib/utils";
import {
  matchJobToUser,
  matchCourseToUser,
  getDisplayedMatchScore,
  RELEVANCE_THRESHOLD,
} from "@/lib/matching";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import {
  Briefcase, CalendarDays, Users, Target,
  ChevronLeft, Flame, BookOpen, Wrench,
  MessageSquare, Search, MapPin, Clock,
  TrendingUp, Sparkles, GraduationCap
} from "lucide-react";
import { DashboardTourWithQueryTrigger } from "@/components/onboarding/dashboard-tour";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = session!.user.name?.split(" ")[0] ?? "חבר";
  // Gender drives the user-addressed copy across the dashboard (greeting,
  // celebration card, etc.). Default to feminine because the brand audience
  // is mostly women — but male members get male copy when their gender is
  // stored on the User row (set at signup or via admin tools).
  const isM = session!.user.gender === "m";
  const t = (f: string, m: string) => (isM ? m : f);

  // Pull a wider set so the matcher has enough material to filter from.
  const [profile, passport, allJobs, upcomingEvents, posts, allCourses] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.careerPassport.findUnique({ where: { userId } }),
    prisma.job.findMany({ where: { isPublished: true }, take: 60, orderBy: { createdAt: "desc" } }),
    prisma.event.findMany({ where: { isPublished: true, startAt: { gte: new Date() } }, orderBy: { startAt: "asc" }, take: 3 }),
    prisma.post.findMany({
      where: { isHidden: false }, orderBy: { createdAt: "desc" }, take: 4,
      include: { author: { select: { name: true, image: true } } }
    }),
    prisma.course.findMany({ where: { isPublished: true }, take: 60, orderBy: { createdAt: "desc" } }),
  ]);

  const readinessScore = profile ? getReadinessScore(profile) : 0;
  const displayedScore = getDisplayedMatchScore(passport, readinessScore);

  const scoredJobs = allJobs
    .map((job) => ({ ...job, _match: matchJobToUser(job, profile, passport) }))
    .filter((j) => j._match.score >= RELEVANCE_THRESHOLD)
    .sort((a, b) => b._match.score - a._match.score);
  const matchingJobs = scoredJobs.slice(0, 3);
  const matchingJobsCount = scoredJobs.length;

  const scoredCourses = allCourses
    .map((c) => ({ ...c, _match: matchCourseToUser(c, profile, passport) }))
    .filter((c) => c._match.score >= RELEVANCE_THRESHOLD)
    .sort((a, b) => b._match.score - a._match.score);
  const relevantCourses = scoredCourses.slice(0, 4);
  const relevantCoursesCount = scoredCourses.length;

  const activeApps = await prisma.jobApplication.count({
    where: { userId, status: { in: ["APPLIED", "FOLLOWUP_SENT", "INTERVIEW_SCHEDULED"] } }
  });

  let upcomingInterviews: { id: string; company: string; role: string; interviewDate: Date }[] = [];
  let dueReminders: {
    id: string;
    title: string;
    dueAt: Date;
    application: { id: string; company: string; role: string };
  }[] = [];
  try {
    const horizon14d = new Date(); horizon14d.setDate(horizon14d.getDate() + 14);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    [upcomingInterviews, dueReminders] = await Promise.all([
      prisma.jobApplication.findMany({
        where: {
          userId,
          archived: false,
          interviewDate: { gte: new Date(), lte: horizon14d },
        },
        select: { id: true, company: true, role: true, interviewDate: true },
        orderBy: { interviewDate: "asc" },
        take: 3,
      }) as Promise<{ id: string; company: string; role: string; interviewDate: Date }[]>,
      prisma.jobApplicationReminder.findMany({
        where: {
          userId,
          completed: false,
          dueAt: { lte: todayEnd },
        },
        include: { application: { select: { id: true, company: true, role: true } } },
        orderBy: { dueAt: "asc" },
        take: 3,
      }),
    ]);
  } catch (e) {
    console.warn("[dashboard] job-tracking widgets skipped:", e instanceof Error ? e.message : e);
  }

  function timeAgo(date: Date) {
    const diff = Date.now() - new Date(date).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "לפני פחות משעה";
    if (h < 24) return `לפני ${h} שעות`;
    return `לפני ${Math.floor(h / 24)} ימים`;
  }

  function formatEventTime(date: Date) {
    return new Date(date).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  }

  // ─── Color palette for stat cards ─────────────────────────────────────────
  // Each stat gets its own warm tint instead of plain white.
  const statColors = [
    { bg: "bg-gradient-to-br from-teal/15 to-teal/5",      iconBg: "bg-teal/20",    iconColor: "text-teal-dark",   numColor: "text-teal-dark",    border: "border-teal/30" },
    { bg: "bg-gradient-to-br from-[#FFE4D6] to-[#FFF1E8]", iconBg: "bg-[#FFB088]/30", iconColor: "text-[#C8552B]",   numColor: "text-[#C8552B]",    border: "border-[#FFB088]/40" },
    { bg: "bg-gradient-to-br from-[#E8DEFF] to-[#F4EEFF]", iconBg: "bg-[#A78BFA]/30", iconColor: "text-[#6D28D9]",   numColor: "text-[#6D28D9]",    border: "border-[#A78BFA]/40" },
    { bg: "bg-gradient-to-br from-[#D4F4DD] to-[#EAF9EE]", iconBg: "bg-[#6EE7B7]/30", iconColor: "text-[#047857]",   numColor: "text-[#047857]",    border: "border-[#6EE7B7]/50" },
  ];

  return (
    <div className="min-h-screen relative">
      {/* ─── First-time onboarding tour — runs once per member, restart via /dashboard?tour=1 ─── */}
      <Suspense fallback={null}>
        <DashboardTourWithQueryTrigger />
      </Suspense>

      {/* ─── Decorative ambient gradient blobs in the background ─── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute top-96 -left-24 w-80 h-80 rounded-full bg-[#FFB088]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-72 h-72 rounded-full bg-[#A78BFA]/10 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-0 sm:px-2 py-5 space-y-5">

        {/* ─── Guide button — friendlier, mintier ─── */}
        <Link
          href="/guide"
          className="flex items-center justify-between gap-3 bg-gradient-to-l from-[#EAF9EE] via-white to-teal-pale border border-teal/30 rounded-2xl px-5 py-4 hover:border-teal hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-teal to-[#047857] rounded-2xl flex items-center justify-center shadow-sm shadow-teal/30 group-hover:scale-110 transition-transform">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-navy">מדריך למשתמש — 7 צעדים להצלחה</p>
              <p className="text-xs text-navy/60">למדי איך להשתמש בפלטפורמה בצורה הכי חכמה</p>
            </div>
          </div>
          <ChevronLeft size={18} className="text-teal-dark shrink-0 group-hover:-translate-x-1 transition-transform" />
        </Link>

        {/* ─── Hero / Welcome — two-column layout, no cropping issues ─── */}
        <div data-tour-id="tour-hero" className="rounded-3xl overflow-hidden shadow-2xl shadow-navy/15 border border-white/40 relative bg-gradient-to-br from-[#F5EFE6] via-white to-teal-pale">
          {/* Decorative ambient glows */}
          <div aria-hidden className="absolute top-0 right-0 w-72 h-72 bg-teal/15 rounded-full blur-3xl -translate-y-1/3" />
          <div aria-hidden className="absolute bottom-0 left-0 w-64 h-64 bg-[#FFB088]/15 rounded-full blur-3xl translate-y-1/3" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative">

            {/* ─── Text column (left on desktop) ─── */}
            <div className="lg:col-span-7 px-6 sm:px-8 lg:px-10 py-8 sm:py-10 flex flex-col justify-center">
              <div className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur-md border border-teal/30 rounded-full px-3 py-1 text-[11px] font-bold text-teal-dark mb-4 shadow-sm self-start">
                <Sparkles size={11} />
                המערכת שלך מוכנה
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-navy leading-[1.15] mb-4">
                {firstName},<br/>
                <span className="bg-gradient-to-l from-teal-dark to-teal bg-clip-text text-transparent">
                  {t("ברוכה הבאה", "ברוך הבא")} ✨
                </span>
              </h1>

              {/* Personal note from Coral */}
              <div className="relative bg-white/80 backdrop-blur-sm border-r-4 border-teal rounded-l-2xl rounded-r-md px-4 py-3 mb-5 shadow-sm">
                <span aria-hidden className="absolute top-1 left-2 text-teal/30 text-2xl font-serif leading-none">&ldquo;</span>
                <p className="text-navy/85 text-sm leading-relaxed">
                  הקמתי את המקום הזה כדי לתת לך בדיוק את מה שהייתי רוצה לקבל בעצמי
                  — קהילה, ליווי וכלים מעשיים שבאמת יקדמו אותך לתפקיד הבא שלך.
                </p>
                <p className="text-teal-dark text-xs font-black mt-1.5">— קורל שלו</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-2 bg-teal hover:bg-teal-dark text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-teal/30 transition-all duration-150 hover:-translate-y-0.5"
                >
                  <Search size={15} />
                  חיפוש משרות
                </Link>
                <Link
                  href="/coaching"
                  className="inline-flex items-center gap-2 bg-white hover:bg-white/90 border border-navy/15 hover:border-teal/40 text-navy font-bold px-5 py-2.5 rounded-xl text-sm transition-all duration-150 shadow-sm"
                >
                  <Sparkles size={15} className="text-teal-dark" />
                  התחילי עם מאמן AI
                </Link>
              </div>
            </div>

            {/* ─── Photo column (right on desktop, top on mobile) ─── */}
            <div className="lg:col-span-5 relative min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]">
              <Image
                src="/koral-casual.jpg"
                alt="קורל שלו - מייסדת קריירה בפוקוס"
                fill
                sizes="(max-width: 1024px) 100vw, 600px"
                quality={95}
                className="object-cover object-[center_18%]"
                priority
              />

              {/* Soft fade on the inside edge for a smoother blend with the text column */}
              <div aria-hidden className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#F5EFE6]/0 to-[#F5EFE6]/80 lg:bg-gradient-to-r lg:from-[#F5EFE6]/40 lg:to-transparent pointer-events-none" />

              {/* Coral signature pill */}
              <div className="absolute bottom-4 left-4 lg:bottom-5 lg:left-5">
                <div className="bg-white/90 backdrop-blur-md border border-navy/10 rounded-2xl px-3 py-2 shadow-lg">
                  <p className="text-[11px] text-teal-dark font-black leading-none mb-0.5">קורל שלו</p>
                  <p className="text-[10px] text-navy/60 leading-none">מייסדת ומנכ״לית</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ─── Job-search-OS widgets (only if user has activity) ─── */}
        {(upcomingInterviews.length > 0 || dueReminders.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {upcomingInterviews.length > 0 && (
              <div className="bg-gradient-to-br from-[#E8DEFF] to-[#F4EEFF] rounded-3xl shadow-sm border-2 border-[#A78BFA]/30 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#A78BFA] rounded-xl flex items-center justify-center">
                      <CalendarDays size={16} className="text-white" />
                    </div>
                    <h2 className="font-black text-[#5B21B6] text-base">הראיונות הקרובים שלך</h2>
                  </div>
                  <Link href="/progress" className="text-[#6D28D9] text-xs font-semibold flex items-center gap-0.5 hover:underline">
                    מעקב מלא <ChevronLeft size={14} />
                  </Link>
                </div>
                <div className="space-y-2">
                  {upcomingInterviews.map((iv) => {
                    const days = Math.ceil((iv.interviewDate.getTime() - Date.now()) / 86400000);
                    return (
                      <Link
                        key={iv.id}
                        href={`/progress/${iv.id}`}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-[#A78BFA]/20 bg-white/60 hover:bg-white hover:border-[#A78BFA]/50 transition-all"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
                          <CalendarDays size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-navy text-sm truncate">{iv.role}</p>
                          <p className="text-[#6D28D9] text-xs font-semibold truncate">{iv.company}</p>
                        </div>
                        <div className="text-center shrink-0">
                          <p className="text-sm font-black text-[#5B21B6]">
                            {days === 0 ? "היום" : days === 1 ? "מחר" : `+${days}ד׳`}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <a
                  href="https://my.schooler.biz/s/106543/1765824391549?utm_source=HryKqw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-between gap-2 p-3 rounded-2xl bg-gradient-to-l from-navy to-[#2D2D44] text-white hover:shadow-md transition-shadow text-xs"
                >
                  <span className="font-bold flex items-center gap-1.5">
                    <Sparkles size={12} className="text-teal" />
                    קורס ההכנה לראיונות של קורל
                  </span>
                  <span className="text-teal font-bold">לקורס ←</span>
                </a>
              </div>
            )}

            {dueReminders.length > 0 && (
              <div className="bg-gradient-to-br from-[#FFE4D6] to-[#FFF1E8] rounded-3xl shadow-sm border-2 border-[#FFB088]/40 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#F97316] rounded-xl flex items-center justify-center">
                      <Clock size={16} className="text-white" />
                    </div>
                    <h2 className="font-black text-[#9A3412] text-base">פעולות להיום</h2>
                  </div>
                  <Link href="/progress" className="text-[#C2410C] text-xs font-semibold flex items-center gap-0.5 hover:underline">
                    הכל <ChevronLeft size={14} />
                  </Link>
                </div>
                <div className="space-y-2">
                  {dueReminders.map((r) => {
                    const overdue = r.dueAt.getTime() < Date.now();
                    return (
                      <Link
                        key={r.id}
                        href={`/progress/${r.application.id}`}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                          overdue
                            ? "bg-red-50 border-red-300"
                            : "bg-white/60 border-[#FFB088]/30 hover:bg-white hover:border-[#FFB088]/60"
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${overdue ? "bg-red-500 text-white" : "bg-gradient-to-br from-[#FB923C] to-[#EA580C] text-white shadow-sm"}`}>
                          <Clock size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-navy text-sm truncate">{r.title}</p>
                          <p className="text-xs text-navy/60 truncate">
                            {r.application.company} · {r.application.role}
                          </p>
                        </div>
                        {overdue && (
                          <span className="text-[10px] bg-red-500 text-white rounded-full px-2 py-0.5 font-bold shrink-0">
                            באיחור
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Stats — each card a different warm tint ─── */}
        <div data-tour-id="tour-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "משרות מתאימות לי",
              value: matchingJobsCount,
              sub: matchingJobsCount > 0 ? "התאמה ≥ 70%" : "השלימי פרופיל לקבלת התאמות",
              icon: <Briefcase size={20} />,
              href: "/jobs",
            },
            {
              label: "קורסים רלוונטיים",
              value: relevantCoursesCount,
              sub: relevantCoursesCount > 0 ? "מותאמים לפערים שלך" : "השלימי דרכון לקבלת המלצות",
              icon: <BookOpen size={20} />,
              href: "/courses",
            },
            {
              label: displayedScore.label,
              value: `${displayedScore.value}%`,
              sub: displayedScore.isPassport
                ? "מתוך דרכון הקריירה שלך"
                : displayedScore.value >= 70 ? "כמעט מוכנה" : "השלימי פרופיל",
              icon: <Target size={20} />,
              href: "/profile",
            },
            {
              label: "ראיונות ומועמדויות",
              value: activeApps,
              sub: activeApps > 0 ? "בתהליך פעיל" : "התחילי להגיש מועמדות",
              icon: <Users size={20} />,
              href: "/jobs",
            },
          ].map((s, i) => {
            const c = statColors[i];
            return (
              <Link
                key={s.label}
                href={s.href}
                className={`${c.bg} rounded-2xl p-5 shadow-sm border ${c.border} hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-bold text-navy/70 leading-tight">{s.label}</p>
                  <div className={`w-9 h-9 ${c.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <span className={c.iconColor}>{s.icon}</span>
                  </div>
                </div>
                <p className={`text-3xl font-black ${c.numColor}`}>{s.value}</p>
                <p className="text-xs text-navy/50 mt-1 font-medium">{s.sub}</p>
              </Link>
            );
          })}
        </div>

        {/* ─── Main two-column ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Matching jobs (2/3) — peach tint */}
          <div className="lg:col-span-2 bg-gradient-to-br from-white to-[#FFF8F1] rounded-3xl shadow-sm border border-[#FFB088]/20 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-[#FB923C] to-[#F97316] rounded-xl flex items-center justify-center shadow-sm">
                  <Flame size={17} className="text-white" />
                </div>
                <h2 className="font-black text-navy text-base">משרות מתאימות עבורך</h2>
              </div>
              <Link href="/jobs" className="text-[#C2410C] text-xs font-bold flex items-center gap-0.5 hover:underline">
                לכל המשרות <ChevronLeft size={14} />
              </Link>
            </div>

            {matchingJobs.length > 0 ? (
              <div className="space-y-3">
                {matchingJobs.map((job) => (
                  <Link
                    key={job.id}
                    href="/jobs"
                    className="flex items-center gap-4 p-4 rounded-2xl border border-[#FFB088]/15 bg-white hover:bg-[#FFF8F1] hover:border-[#FFB088]/40 hover:shadow-sm transition-all duration-150 group"
                  >
                    <div className="w-11 h-11 bg-gradient-to-br from-teal/20 to-teal/10 rounded-xl flex items-center justify-center shrink-0">
                      <Briefcase size={17} className="text-teal-dark" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy text-sm truncate">{job.title}</p>
                      <p className="text-teal-dark text-xs font-semibold">{job.company}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        {job.location && (
                          <div className="flex items-center gap-1 text-navy/50 text-xs">
                            <MapPin size={10} /> {job.location}
                          </div>
                        )}
                        {job._match.reasons[0] && (
                          <span className="text-[11px] text-teal-dark/90 truncate font-medium">
                            ✓ {job._match.reasons[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-center shrink-0 bg-teal/10 px-3 py-2 rounded-xl">
                      <div className="text-lg font-black text-teal-dark">{job._match.score}%</div>
                      <div className="text-[10px] text-navy/50 font-semibold">התאמה</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#FFB088]/30 to-[#FFE4D6]/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Search size={24} className="text-[#C2410C]" />
                </div>
                <p className="font-bold text-navy text-sm mb-1">
                  עוד אין משרות בהתאמה גבוהה
                </p>
                <p className="text-xs text-navy/60 leading-relaxed mb-4 max-w-xs mx-auto">
                  השלימי את הפרופיל ואת דרכון הקריירה כדי שנתאים לך משרות לפי תפקיד היעד והחוזקות שלך.
                </p>
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1.5 bg-teal text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-teal-dark transition-colors shadow-sm shadow-teal/30"
                >
                  השלימי פרופיל
                  <ChevronLeft size={12} />
                </Link>
              </div>
            )}
          </div>

          {/* Upcoming events (1/3) — mint tint */}
          <div className="bg-gradient-to-br from-white to-[#EAF9EE] rounded-3xl shadow-sm border border-[#6EE7B7]/30 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-[#10B981] to-[#047857] rounded-xl flex items-center justify-center shadow-sm">
                  <CalendarDays size={16} className="text-white" />
                </div>
                <h2 className="font-black text-navy text-base">אירועים</h2>
              </div>
              <Link href="/events" className="text-[#047857] text-xs font-bold flex items-center gap-0.5 hover:underline">
                הכל <ChevronLeft size={14} />
              </Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => {
                  const d = new Date(ev.startAt);
                  return (
                    <Link key={ev.id} href="/events"
                      className="flex items-start gap-3 p-3 rounded-2xl bg-white hover:bg-[#EAF9EE] border border-[#6EE7B7]/20 hover:border-[#6EE7B7]/50 transition-all">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#10B981] to-[#047857] rounded-xl flex flex-col items-center justify-center text-white shrink-0 shadow-sm shadow-[#10B981]/20">
                        <span className="text-base font-black leading-none">{d.getDate()}</span>
                        <span className="text-[9px] font-semibold opacity-90">{d.toLocaleDateString("he-IL", { month: "short" })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-navy text-xs leading-snug">{ev.title}</p>
                        <p className="text-navy/50 text-xs mt-0.5 flex items-center gap-1">
                          <Clock size={10} /> {formatEventTime(d)}
                        </p>
                        <p className="text-xs text-navy/50 truncate font-medium">{ev.isOnline ? "ZOOM" : ev.location}</p>
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
                    className="flex items-start gap-3 p-3 rounded-2xl bg-white hover:bg-[#EAF9EE] border border-[#6EE7B7]/20 hover:border-[#6EE7B7]/50 transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#10B981] to-[#047857] rounded-xl flex flex-col items-center justify-center text-white shrink-0 shadow-sm shadow-[#10B981]/20">
                      <span className="text-base font-black leading-none">{ev.day}</span>
                      <span className="text-[9px] font-semibold opacity-90">{ev.mon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-navy text-xs leading-snug">{ev.title}</p>
                      <p className="text-navy/50 text-xs mt-0.5 flex items-center gap-1">
                        <Clock size={10} /> {ev.time}
                      </p>
                      <p className="text-xs text-navy/50 font-medium">{ev.loc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Relevant courses — lavender tint ─── */}
        <div className="bg-gradient-to-br from-white to-[#F4EEFF] rounded-3xl shadow-sm border border-[#A78BFA]/25 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-sm">
                <TrendingUp size={17} className="text-white" />
              </div>
              <h2 className="font-black text-navy text-base">קורסים מומלצים עבורך</h2>
            </div>
            <Link href="/courses" className="text-[#6D28D9] text-xs font-bold flex items-center gap-0.5 hover:underline">
              לכל התכנים <ChevronLeft size={14} />
            </Link>
          </div>

          {relevantCourses.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relevantCourses.map((c) => (
                <Link
                  key={c.id}
                  href="/courses"
                  className="group rounded-2xl overflow-hidden border border-[#A78BFA]/20 bg-white hover:shadow-lg hover:-translate-y-1 hover:border-[#A78BFA]/50 transition-all duration-200"
                >
                  <div className="h-24 bg-gradient-to-br from-[#A78BFA]/30 via-[#C4B5FD]/40 to-[#E8DEFF] flex items-center justify-center relative">
                    <BookOpen size={30} className="text-[#6D28D9]" />
                    {c._match.reasons[0] && (
                      <span className="absolute bottom-2 right-2 text-[10px] bg-white/95 text-[#6D28D9] px-2 py-0.5 rounded-full font-bold truncate max-w-[90%] shadow-sm">
                        {c._match.reasons[0]}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-navy leading-snug line-clamp-2">{c.title}</p>
                    <p className="text-[11px] text-navy/50 mt-1 font-medium">{c.category ?? "קריירה בפוקוס"}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#A78BFA]/30 to-[#E8DEFF] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BookOpen size={24} className="text-[#6D28D9]" />
              </div>
              <p className="font-bold text-navy text-sm mb-1">
                עוד אין קורסים מותאמים אישית
              </p>
              <p className="text-xs text-navy/60 leading-relaxed mb-4 max-w-xs mx-auto">
                צרי דרכון קריירה כדי שנמליץ קורסים שסוגרים בדיוק את הפערים שלך.
              </p>
              <Link
                href="/guide"
                className="inline-flex items-center gap-1.5 bg-gradient-to-l from-[#7C3AED] to-[#A78BFA] text-white text-xs font-bold px-4 py-2 rounded-xl hover:shadow-md transition-shadow shadow-sm shadow-[#A78BFA]/30"
              >
                ליצירת דרכון קריירה
                <ChevronLeft size={12} />
              </Link>
            </div>
          )}
        </div>

        {/* ─── HIRED success banner — Coral with the HIRED tablet ─── */}
        <div data-tour-id="tour-hired" className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-navy via-[#23233D] to-navy text-white shadow-2xl shadow-navy/20 border border-white/10">
          {/* Decorative glows */}
          <div aria-hidden className="absolute top-0 right-0 w-72 h-72 bg-teal/25 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div aria-hidden className="absolute bottom-0 left-0 w-60 h-60 bg-[#10B981]/20 rounded-full blur-3xl translate-y-1/3" />

          <div className="flex flex-col-reverse sm:flex-row items-stretch relative">
            {/* Text + CTA */}
            <div className="flex-1 px-6 sm:px-8 py-8">
              <div className="inline-flex items-center gap-1.5 bg-[#10B981]/20 border border-[#6EE7B7]/40 rounded-full px-3 py-1 text-[11px] font-bold text-[#6EE7B7] mb-3">
                <Sparkles size={11} />
                סיפורי הצלחה אמיתיים
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black mb-3 leading-tight">
                כבר התקבלת לעבודה?<br/>
                <span className="bg-gradient-to-l from-teal to-[#7FE7E7] bg-clip-text text-transparent">
                  {t("בואי", "בוא")} נחגוג איתך 🎉
                </span>
              </h2>
              <p className="text-white/70 text-sm leading-relaxed mb-5 max-w-md">
                חברי וחברות הקהילה שלנו כבר מצאו את העבודה הבאה שלהם. {t("שתפי", "שתף")} איתנו
                את ההצלחה {t("שלך ועזרי", "שלך ועזור")} לאחרים לראות שזה אפשרי גם להם.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/community"
                  className="inline-flex items-center gap-2 bg-gradient-to-l from-[#10B981] to-[#047857] hover:shadow-lg hover:shadow-[#10B981]/40 hover:-translate-y-0.5 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
                >
                  <Sparkles size={15} />
                  {t("שתפי הצלחה", "שתף הצלחה")}
                </Link>
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-teal/40 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
                >
                  <Briefcase size={15} className="text-teal" />
                  {t("עוד מחפשת?", "עוד מחפש?")} {t("המשיכי", "המשך")} כאן
                </Link>
              </div>
            </div>

            {/* Coral with HIRED tablet */}
            <div className="w-full sm:w-72 lg:w-80 relative shrink-0">
              <div className="relative h-56 sm:h-full min-h-[260px] bg-gradient-to-bl from-teal/20 via-transparent to-transparent">
                <Image
                  src="/koral-hired.jpg"
                  alt="קורל מציגה תוצאת HIRED - התקבלת לעבודה"
                  fill
                  sizes="(max-width: 640px) 100vw, 320px"
                  className="object-cover object-center"
                />
                {/* Soft gradient blend on the inner edge */}
                <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-navy/70 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Tools + Community row ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Tools — yellow/butter tint */}
          <div data-tour-id="tour-tools" className="bg-gradient-to-br from-white to-[#FFFBE8] rounded-3xl shadow-sm border border-[#FCD34D]/30 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-xl flex items-center justify-center shadow-sm">
                  <Wrench size={17} className="text-white" />
                </div>
                <h2 className="font-black text-navy text-base">כלים ומשאבים</h2>
              </div>
              <Link href="/tools" className="text-[#92400E] text-xs font-bold flex items-center gap-0.5 hover:underline">
                לכל הכלים <ChevronLeft size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "מחולל קורות חיים", sub: "AI לבנייה מנצחת", icon: <Sparkles size={18} />, href: "/tools", color: "from-[#FCD34D] to-[#F59E0B]" },
                { label: "מכין לראיונות", sub: "שאלות וטיפים", icon: <MessageSquare size={18} />, href: "/tools", color: "from-teal to-teal-dark" },
                { label: "בודק התאמה למשרה", sub: "בדיקה חכמה", icon: <Target size={18} />, href: "/jobs", color: "from-[#FB923C] to-[#EA580C]" },
                { label: "תכנון קריירה", sub: "כלים לתכנון וקידום", icon: <TrendingUp size={18} />, href: "/progress", color: "from-[#A78BFA] to-[#7C3AED]" },
              ].map((t) => (
                <Link key={t.label} href={t.href}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#FCD34D]/20 bg-white hover:bg-[#FFFBE8] hover:border-[#FCD34D]/50 hover:shadow-sm transition-all">
                  <div className={`w-10 h-10 bg-gradient-to-br ${t.color} rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm`}>
                    {t.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy">{t.label}</p>
                    <p className="text-[11px] text-navy/50 truncate font-medium">{t.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Community feed — pink tint */}
          <div className="bg-gradient-to-br from-white to-[#FFF1F4] rounded-3xl shadow-sm border border-[#FBA5C0]/30 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-[#EC4899] to-[#BE185D] rounded-xl flex items-center justify-center shadow-sm">
                  <Users size={17} className="text-white" />
                </div>
                <h2 className="font-black text-navy text-base">מה חדש בקהילה</h2>
              </div>
              <Link href="/community" className="text-[#BE185D] text-xs font-bold flex items-center gap-0.5 hover:underline">
                לכל העדכונים <ChevronLeft size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {posts.length > 0 ? posts.map((p) => (
                <Link key={p.id} href="/community"
                  className="flex items-start gap-3 p-3 rounded-2xl bg-white hover:bg-[#FFF1F4] border border-[#FBA5C0]/20 hover:border-[#FBA5C0]/50 transition-all">
                  <div className="w-9 h-9 bg-gradient-to-br from-[#EC4899] to-[#BE185D] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                    {p.author?.name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-bold text-navy">{p.author?.name ?? "חבר קהילה"}</span>
                      <span className="text-[11px] text-navy/40">{timeAgo(p.createdAt)}</span>
                    </div>
                    <p className="text-xs text-navy/65 mt-0.5 line-clamp-2">{p.content}</p>
                  </div>
                </Link>
              )) : (
                [
                  { name: "שרה",  action: "שיתפה משרה חדשה",  detail: "UX Researcher ב-Similarweb",                    color: "from-pink-400 to-pink-600" },
                  { name: "נועה", action: "המליצה על קורס חדש", detail: "קורס ניהול פרוד׳ — מומלץ למתחילות",         color: "from-blue-400 to-blue-600" },
                  { name: "דנה",  action: "שאלה שאלה בפורום",  detail: "מתלבטת לגבי מעבר לתחום הדאטה, למי יש טיפים?", color: "from-teal to-teal-dark" },
                  { name: "מיכל", action: "שיתפה הצלחה 🎉",     detail: "התקבלתי לתפקיד — תודה לכולם על התמיכה!",       color: "from-green-400 to-green-600" },
                ].map((p) => (
                  <Link key={p.name} href="/community"
                    className="flex items-start gap-3 p-3 rounded-2xl bg-white hover:bg-[#FFF1F4] border border-[#FBA5C0]/20 hover:border-[#FBA5C0]/50 transition-all">
                    <div className={`w-9 h-9 bg-gradient-to-br ${p.color} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                      {p.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-bold text-navy">{p.name}</span>
                        <span className="text-[11px] text-navy/40">{p.action}</span>
                      </div>
                      <p className="text-xs text-navy/65 mt-0.5 line-clamp-2">{p.detail}</p>
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
