import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users, TrendingUp, Bell, Star, CreditCard, Wallet,
  UserPlus, UserMinus, Sparkles, FileText, MessageSquare,
  Activity, ShieldAlert, ArrowUpRight, RefreshCw, Briefcase,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

/**
 * Admin dashboard — comprehensive operator view of the platform.
 *
 * Layout, top to bottom:
 *   1. KPI hero — 6 high-signal numbers: active members, MRR, new
 *      this-week, cancellations this-month, leads in inbox, average
 *      job-match score.
 *   2. Revenue panel — members per plan with per-plan ₪ totals + MRR.
 *   3. Real-time activity feed — last 25 events (signups, purchases,
 *      cancellations, passports, leads, support tickets) mixed by
 *      timestamp. The "real time" piece is force-dynamic rendering
 *      plus a manual refresh button — every page load fetches fresh.
 *   4. Engagement adoption — % of active members who have a passport,
 *      a CV uploaded, a personal-analysis run, etc.
 *   5. Recent cancellations + their reasons — surfaces churn risk
 *      before it scales.
 *   6. Quick actions — create job / event / send broadcast.
 *
 * All counts are computed with parallel Prisma queries (no waterfall).
 */

export const dynamic = "force-dynamic";

// Plan ₪ prices for MRR estimation. Keep in sync with the pricing
// page + CardCom settings.
const PLAN_PRICE_ILS: Record<string, number> = {
  MEMBER:  49,
  VIP:     149,
  PREMIUM: 499,
};

export default async function AdminDashboard() {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(now.getTime() - 7 * day);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * day);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * day);

  // ── All counts in parallel — one round-trip per Promise.all ────
  const [
    totalUsers,
    activeUsers,
    pendingUsers,
    membersByPlan,
    newSignups7d,
    newSignups7dPrev,
    cancellations30d,
    cancellations30dPrev,
    purchases7d,
    cvUploads,
    passportCount,
    personalAnalysisCount,
    coachingSessionsThisWeek,
    leadCount,
    openLeadCount,
    photoUpgrades,
    activePassportScoreAgg,
    activeJobApps,
    publishedJobs,
    recentSignups,
    recentPurchases,
    recentCancellations,
    recentLeads,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { accessStatus: "ACTIVE" } }),
    prisma.user.count({ where: { accessStatus: "PENDING" } }),
    prisma.user.groupBy({
      by: ["membershipType"],
      where: { accessStatus: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({
      where: {
        createdAt: { gte: new Date(now.getTime() - 14 * day), lt: sevenDaysAgo },
      },
    }),
    prisma.user.count({ where: { cancelledAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({
      where: { cancelledAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
    prisma.user.count({ where: { paidAt: { gte: sevenDaysAgo } } }),
    prisma.profile.count({ where: { resumeUrl: { not: null } } }),
    prisma.careerPassport.count(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.profile as any).count({ where: { personalAnalysis: { not: null } } }),
    prisma.coachingSession.count({
      where: { analyzedAt: { gte: sevenDaysAgo } },
    }),
    prisma.lead.count(),
    prisma.lead.count({ where: { handled: false } }),
    prisma.user.count({ where: { photoUpgradeStatus: "REQUESTED" } }),
    prisma.careerPassport.aggregate({
      _avg: { jobMatchScore: true },
      where: { jobMatchScore: { gt: 0 } },
    }),
    prisma.jobApplication.count({
      where: {
        status: {
          in: [
            "APPLIED",
            "FIT_CHECKED",
            "INTERVIEW_SCHEDULED",
            "FIRST_INTERVIEW",
            "ADVANCED_INTERVIEW",
            "TASK_HOME",
          ] as const,
        },
      },
    }),
    prisma.job.count({ where: { isPublished: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, createdAt: true, membershipType: true, accessStatus: true },
    }),
    prisma.user.findMany({
      where: { paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, paidAt: true, membershipType: true, chargeCount: true },
    }),
    prisma.user.findMany({
      where: { cancelledAt: { not: null } },
      orderBy: { cancelledAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, cancelledAt: true, cancellationReason: true, membershipType: true },
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, phone: true, createdAt: true, source: true, handled: true },
    }),
  ]);

  // ── Derived metrics ───────────────────────────────────────────
  // Convert the groupBy result into a plan→count map.
  const planCount: Record<string, number> = {};
  for (const row of membersByPlan) {
    planCount[row.membershipType] = row._count._all;
  }
  // Estimated MRR — sum of (count × price) for the three paid plans.
  // Doesn't account for legacy/promo pricing; close enough for an
  // operator-facing number until we wire actual CardCom revenue.
  const mrr =
    (planCount.MEMBER ?? 0) * PLAN_PRICE_ILS.MEMBER +
    (planCount.VIP ?? 0) * PLAN_PRICE_ILS.VIP +
    (planCount.PREMIUM ?? 0) * PLAN_PRICE_ILS.PREMIUM;

  const signupTrend = trendPct(newSignups7d, newSignups7dPrev);
  const cancelTrend = trendPct(cancellations30d, cancellations30dPrev);
  const avgScore = Math.round(activePassportScoreAgg._avg.jobMatchScore ?? 0);

  const adoptionPassport = activeUsers ? Math.round((passportCount / activeUsers) * 100) : 0;
  const adoptionCv = activeUsers ? Math.round((cvUploads / activeUsers) * 100) : 0;
  const adoptionAnalysis = activeUsers ? Math.round((personalAnalysisCount / activeUsers) * 100) : 0;

  // Build a unified, sorted activity feed by merging recent events
  // from four sources. Each item carries a timestamp so the sort
  // produces a single chronological stream.
  type Activity = {
    when: Date;
    kind: "signup" | "purchase" | "cancel" | "lead";
    label: string;
    detail: string;
    href: string;
  };
  const feed: Activity[] = [
    ...recentSignups.map((u): Activity => ({
      when: u.createdAt,
      kind: "signup",
      label: u.name ?? u.email,
      detail: `נרשם/ה לפלטפורמה${u.membershipType !== "NONE" ? ` · ${planLabel(u.membershipType)}` : ""}`,
      href: `/admin/users/${u.id}`,
    })),
    ...recentPurchases.map((u): Activity => ({
      when: u.paidAt as Date,
      kind: "purchase",
      label: u.name ?? u.email,
      detail: `רכש/ה תוכנית ${planLabel(u.membershipType)}${u.chargeCount > 1 ? ` · חיוב ${u.chargeCount}` : ""}`,
      href: `/admin/users/${u.id}`,
    })),
    ...recentCancellations.map((u): Activity => ({
      when: u.cancelledAt as Date,
      kind: "cancel",
      label: u.name ?? u.email,
      detail: `ביטל/ה מנוי ${planLabel(u.membershipType)}${u.cancellationReason ? ` · ${cancelReasonLabel(u.cancellationReason)}` : ""}`,
      href: `/admin/users/${u.id}`,
    })),
    ...recentLeads.map((l): Activity => ({
      when: l.createdAt,
      kind: "lead",
      label: l.name,
      detail: `פנייה חדשה · ${leadSourceLabel(l.source)}${l.handled ? " · טופלה" : ""}`,
      href: `/admin/leads`,
    })),
  ]
    .sort((a, b) => b.when.getTime() - a.when.getTime())
    .slice(0, 25);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">דשבורד אדמין</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            נתונים חיים · עודכן ב-{now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-teal text-navy text-sm font-semibold transition-colors"
          title="רענון הנתונים"
        >
          <RefreshCw size={14} />
          רענון
        </Link>
      </div>

      {/* Alerts strip — surface things that need action this minute */}
      <div className="grid gap-2 sm:grid-cols-3">
        {openLeadCount > 0 && (
          <AlertTile
            href="/admin/leads"
            color="amber"
            title={`${openLeadCount} פניות פתוחות`}
            sub="ממתינות לטיפול"
            icon={<Bell size={16} />}
          />
        )}
        {pendingUsers > 0 && (
          <AlertTile
            href="/admin/users?status=PENDING"
            color="blue"
            title={`${pendingUsers} משתמשים ממתינים לאישור`}
            sub="לא ניגשים לתוכן עד שמאשרים"
            icon={<ShieldAlert size={16} />}
          />
        )}
        {photoUpgrades > 0 && (
          <AlertTile
            href="/admin/users?filter=photo-upgrade"
            color="purple"
            title={`${photoUpgrades} בקשות שדרוג תמונה`}
            sub="49 ש&quot;ח לבקשה"
            icon={<Sparkles size={16} />}
          />
        )}
      </div>

      {/* ── KPI hero ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">מדדים מרכזיים</h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="חברים פעילים"
            value={activeUsers.toLocaleString("he-IL")}
            sub={`מתוך ${totalUsers.toLocaleString("he-IL")} רשומים`}
            icon={<Users size={18} />}
            color="emerald"
            href="/admin/users?status=ACTIVE"
          />
          <KpiCard
            label="הכנסה חודשית (MRR)"
            value={`₪${mrr.toLocaleString("he-IL")}`}
            sub="הערכה לפי מחירון תוכניות"
            icon={<Wallet size={18} />}
            color="teal"
          />
          <KpiCard
            label="הצטרפויות חדשות (7 ימים)"
            value={newSignups7d.toLocaleString("he-IL")}
            sub={signupTrend.label}
            subColor={signupTrend.tone}
            icon={<UserPlus size={18} />}
            color="blue"
            href="/admin/users"
          />
          <KpiCard
            label="ביטולים (30 ימים)"
            value={cancellations30d.toLocaleString("he-IL")}
            sub={cancelTrend.label}
            subColor={cancelTrend.tone}
            icon={<UserMinus size={18} />}
            color="rose"
          />
          <KpiCard
            label="רכישות (7 ימים)"
            value={purchases7d.toLocaleString("he-IL")}
            sub="כולל חיובים חוזרים"
            icon={<CreditCard size={18} />}
            color="purple"
          />
          <KpiCard
            label="פניות נכנסות"
            value={`${openLeadCount.toLocaleString("he-IL")} / ${leadCount.toLocaleString("he-IL")}`}
            sub="פתוחות / סה״כ"
            icon={<MessageSquare size={18} />}
            color="amber"
            href="/admin/leads"
          />
          <KpiCard
            label="מועמדויות פעילות"
            value={activeJobApps.toLocaleString("he-IL")}
            sub="של חברי הקהילה"
            icon={<Briefcase size={18} />}
            color="navy"
          />
          <KpiCard
            label="ציון התאמה ממוצע"
            value={`${avgScore}%`}
            sub="לפי דרכוני הקריירה הפעילים"
            icon={<TrendingUp size={18} />}
            color="indigo"
          />
        </div>
      </section>

      {/* ── Revenue / Membership ───────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-navy">פילוח חברים והכנסה</h2>
            <p className="text-xs text-slate-500">
              חברים פעילים לפי תוכנית. הסכום הוא הכנסה חודשית משוערת ({/*MRR estimate*/}
              ₪{mrr.toLocaleString("he-IL")} בסה״כ).
            </p>
          </div>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          <PlanBreakdown
            name="חבר"
            price={49}
            count={planCount.MEMBER ?? 0}
            color="teal"
          />
          <PlanBreakdown
            name="פרו"
            price={149}
            count={planCount.VIP ?? 0}
            color="purple"
          />
          <PlanBreakdown
            name="VIP"
            price={499}
            count={planCount.PREMIUM ?? 0}
            color="amber"
          />
        </div>
      </section>

      {/* ── Activity feed + Adoption side-by-side on wide screens ─ */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Activity feed (2/3 width) */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <header className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-teal" />
            <h2 className="text-base font-black text-navy">פיד פעילות בזמן אמת</h2>
            <span className="text-xs text-slate-500 mr-auto">25 אירועים אחרונים</span>
          </header>
          <div className="space-y-2.5">
            {feed.length === 0 && (
              <p className="text-sm text-slate-500 py-6 text-center">אין פעילות עדכנית להציג</p>
            )}
            {feed.map((a, i) => (
              <ActivityRow key={`${a.kind}-${i}`} item={a} />
            ))}
          </div>
        </section>

        {/* Adoption metrics (1/3 width) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <header className="mb-4">
            <h2 className="text-base font-black text-navy">אימוץ פיצ׳רים</h2>
            <p className="text-xs text-slate-500">% מהחברים הפעילים שהשתמשו בכלי</p>
          </header>
          <div className="space-y-4">
            <AdoptionBar
              icon={<FileText size={14} />}
              label="העלאת קורות חיים"
              value={cvUploads}
              total={activeUsers}
              percent={adoptionCv}
              color="teal"
            />
            <AdoptionBar
              icon={<Sparkles size={14} />}
              label="דרכון קריירה"
              value={passportCount}
              total={activeUsers}
              percent={adoptionPassport}
              color="purple"
            />
            <AdoptionBar
              icon={<Star size={14} />}
              label="ניתוח אישי מעמיק"
              value={personalAnalysisCount}
              total={activeUsers}
              percent={adoptionAnalysis}
              color="amber"
            />
            <AdoptionBar
              icon={<MessageSquare size={14} />}
              label="שימוש במאמן (7 ימים)"
              value={coachingSessionsThisWeek}
              total={activeUsers}
              percent={activeUsers ? Math.round((coachingSessionsThisWeek / activeUsers) * 100) : 0}
              color="emerald"
            />
          </div>
        </section>
      </div>

      {/* ── Recent cancellations ──────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-navy">ביטולים אחרונים</h2>
          {cancellations30d > 0 && (
            <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 font-semibold">
              {cancellations30d} ב-30 הימים האחרונים
            </span>
          )}
        </header>
        {recentCancellations.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">אין ביטולים לאחרונה 🎉</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentCancellations.map((u) => (
              <li key={u.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-navy text-sm truncate">{u.name ?? u.email}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {planLabel(u.membershipType)} · {u.cancellationReason ? cancelReasonLabel(u.cancellationReason) : "ללא סיבה"}
                  </p>
                </div>
                <span className="text-xs text-slate-500 shrink-0">
                  {u.cancelledAt ? formatDate(u.cancelledAt) : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Catalog quick-stats + Quick actions ───────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-base font-black text-navy mb-3">תוכן בפלטפורמה</h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-5">
          <MiniStat label="משרות פעילות" value={publishedJobs} href="/admin/jobs" />
          <MiniStat label="דרכוני קריירה" value={passportCount} href="/admin/users" />
          <MiniStat label="ניתוחי אישיות" value={personalAnalysisCount} href="/admin/users" />
          <MiniStat label="העלאות CV" value={cvUploads} href="/admin/users" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { href: "/admin/jobs/new",     label: "משרה חדשה" },
            { href: "/admin/events/new",   label: "אירוע חדש" },
            { href: "/admin/updates/new",  label: "עדכון חדש" },
            { href: "/admin/courses/new",  label: "קורס חדש" },
            { href: "/admin/broadcast",    label: "תפוצת מייל" },
          ].map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="text-center text-sm font-semibold text-navy bg-slate-50 hover:bg-teal/10 hover:text-teal border border-slate-200 hover:border-teal/40 rounded-xl py-2.5 transition-colors"
            >
              {q.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function trendPct(current: number, previous: number): { label: string; tone: "up" | "down" | "flat" } {
  if (previous === 0 && current === 0) return { label: "ללא שינוי", tone: "flat" };
  if (previous === 0) return { label: `+${current} מתקופה קודמת`, tone: "up" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { label: "ללא שינוי לעומת תקופה קודמת", tone: "flat" };
  return {
    label: `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}% לעומת תקופה קודמת`,
    tone: pct > 0 ? "up" : "down",
  };
}

function planLabel(plan: string | null): string {
  switch (plan) {
    case "MEMBER":  return "חבר";
    case "VIP":     return "פרו";
    case "PREMIUM": return "VIP";
    case "NONE":    return "ללא תוכנית";
    default:        return plan ?? "—";
  }
}

function cancelReasonLabel(reason: string | null): string {
  switch (reason) {
    case "FOUND_JOB":      return "מצא/ה עבודה";
    case "NO_VALUE":       return "לא ראה/תה ערך";
    case "STOPPED_SEARCH": return "הפסיק/ה לחפש";
    case "OTHER":          return "אחר";
    default:               return reason ?? "—";
  }
}

function leadSourceLabel(source: string | null): string {
  if (!source) return "פנייה";
  if (source === "marketing-site")        return "אתר שיווקי";
  if (source === "support-general")       return "פנייה כללית";
  if (source === "support-cancel")        return "ביטול מנוי";
  if (source === "support-privacy")       return "פרטיות";
  if (source === "support-accessibility") return "נגישות";
  if (source === "support-support")       return "תקלה טכנית";
  return source;
}

// ─── UI sub-components ──────────────────────────────────────────────

const KPI_COLORS = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  teal:    "bg-teal/10 text-teal-dark border-teal/20",
  blue:    "bg-blue-50 text-blue-700 border-blue-100",
  rose:    "bg-rose-50 text-rose-700 border-rose-100",
  purple:  "bg-purple-50 text-purple-700 border-purple-100",
  amber:   "bg-amber-50 text-amber-800 border-amber-100",
  navy:    "bg-navy/5 text-navy border-navy/10",
  indigo:  "bg-indigo-50 text-indigo-700 border-indigo-100",
} as const;

function KpiCard({
  label, value, sub, subColor, icon, color, href,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: "up" | "down" | "flat";
  icon: React.ReactNode;
  color: keyof typeof KPI_COLORS;
  href?: string;
}) {
  const subClass =
    subColor === "up" ? "text-emerald-700" :
    subColor === "down" ? "text-rose-700" :
    "text-slate-500";
  const inner = (
    <div className={`bg-white rounded-2xl border p-4 h-full transition-colors ${href ? "hover:border-teal cursor-pointer" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border ${KPI_COLORS[color]}`}>
          {icon}
        </span>
        {href && <ArrowUpRight size={14} className="text-slate-400" aria-hidden="true" />}
      </div>
      <div className="text-2xl font-black text-navy">{value}</div>
      <div className="text-xs text-slate-600 mt-0.5">{label}</div>
      {sub && <div className={`text-[11px] mt-1.5 ${subClass}`}>{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function PlanBreakdown({
  name, price, count, color,
}: { name: string; price: number; count: number; color: "teal" | "purple" | "amber" }) {
  const total = count * price;
  const ring = {
    teal:   "border-teal/30 bg-teal/5",
    purple: "border-purple-200 bg-purple-50",
    amber:  "border-amber-200 bg-amber-50",
  }[color];
  return (
    <div className={`rounded-xl border p-4 ${ring}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-600">{name}</p>
      <p className="text-2xl font-black text-navy mt-1">{count.toLocaleString("he-IL")}</p>
      <p className="text-xs text-slate-500 mt-0.5">×₪{price} לחודש</p>
      <p className="text-sm font-bold text-navy mt-2 border-t border-slate-200 pt-2">
        ₪{total.toLocaleString("he-IL")} / חודש
      </p>
    </div>
  );
}

const ACTIVITY_ICON: Record<string, { icon: React.ReactNode; cls: string }> = {
  signup:   { icon: <UserPlus size={14} />,      cls: "bg-blue-50 text-blue-700" },
  purchase: { icon: <CreditCard size={14} />,    cls: "bg-emerald-50 text-emerald-700" },
  cancel:   { icon: <UserMinus size={14} />,     cls: "bg-rose-50 text-rose-700" },
  lead:     { icon: <MessageSquare size={14} />, cls: "bg-amber-50 text-amber-700" },
};

function ActivityRow({
  item,
}: {
  item: { when: Date; kind: string; label: string; detail: string; href: string };
}) {
  const meta = ACTIVITY_ICON[item.kind] ?? ACTIVITY_ICON.signup;
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 py-2 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
    >
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${meta.cls} shrink-0`} aria-hidden="true">
        {meta.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy truncate">{item.label}</p>
        <p className="text-xs text-slate-500 truncate">{item.detail}</p>
      </div>
      <span className="text-xs text-slate-500 shrink-0">{relative(item.when)}</span>
    </Link>
  );
}

const ADOPTION_COLORS = {
  teal:    "bg-teal",
  purple:  "bg-purple-500",
  amber:   "bg-amber-500",
  emerald: "bg-emerald-500",
} as const;

function AdoptionBar({
  icon, label, value, total, percent, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  percent: number;
  color: keyof typeof ADOPTION_COLORS;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="flex items-center gap-1.5 text-navy font-semibold">
          <span className="text-slate-500" aria-hidden="true">{icon}</span>
          {label}
        </span>
        <span className="text-xs text-slate-600">
          <span className="font-bold text-navy">{value}</span> / {total}{" "}
          <span className="text-slate-500">({percent}%)</span>
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${ADOPTION_COLORS[color]}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="bg-slate-50 hover:bg-teal/10 hover:border-teal/40 border border-slate-200 rounded-xl p-3 transition-colors">
      <p className="text-2xl font-black text-navy">{value.toLocaleString("he-IL")}</p>
      <p className="text-xs text-slate-600 mt-0.5">{label}</p>
    </Link>
  );
}

const ALERT_COLORS = {
  amber:  "bg-amber-50 border-amber-200 text-amber-900",
  blue:   "bg-blue-50 border-blue-200 text-blue-900",
  purple: "bg-purple-50 border-purple-200 text-purple-900",
} as const;

function AlertTile({
  href, color, title, sub, icon,
}: {
  href: string;
  color: keyof typeof ALERT_COLORS;
  title: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 hover:shadow-sm transition-shadow ${ALERT_COLORS[color]}`}
    >
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold truncate">{title}</p>
        <p className="text-xs opacity-80 truncate">{sub}</p>
      </div>
      <ArrowUpRight size={14} className="mr-auto shrink-0 opacity-60" aria-hidden="true" />
    </Link>
  );
}

/** Hebrew relative-time label — short form for the activity feed. */
function relative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "כעת";
  if (min < 60) return `לפני ${min} ד'`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `לפני ${hr} ש'`;
  const dys = Math.floor(hr / 24);
  if (dys < 7) return `לפני ${dys} ימים`;
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}
