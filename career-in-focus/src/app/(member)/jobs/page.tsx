import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { matchJobToUser } from "@/lib/matching";
import { JobsClient } from "./jobs-client";
import type { JobItem } from "./jobs-client";
import { ScreenExplainer } from "@/components/screen-explainer";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const session = await auth();
  const userId = session!.user.id;
  // FREE-tier viewers get the raw board: no per-job match scores (they
  // have no profile/passport, so every card would show the misleading
  // 30% baseline) and no profile fetches on their behalf.
  const isFreeTier = session!.user.subscriptionStatus === "FREE";

  const [profile, passport, rawJobs, dismissed] = await Promise.all([
    isFreeTier ? null : prisma.profile.findUnique({ where: { userId } }),
    isFreeTier ? null : prisma.careerPassport.findUnique({ where: { userId } }),
    prisma.job.findMany({
      where: { isPublished: true },
      orderBy: [{ isHot: "desc" }, { createdAt: "desc" }],
      // description is by far the heaviest column (several KB × ~4,000
      // rows). Paid members need it for match scoring; the free board
      // renders without it, which cuts the query payload dramatically.
      select: {
        id: true, title: true, company: true, companyLogo: true,
        summary: true, location: true, region: true, field: true,
        experienceLevel: true, source: true, externalUrl: true,
        isHot: true, createdAt: true,
        description: !isFreeTier,
      },
    }),
    // Per-user dismissals — jobs the member clicked X on. We filter
    // them out below; nothing changes for other members.
    prisma.dismissedJob.findMany({ where: { userId }, select: { jobId: true } }),
  ]);
  const dismissedIds = new Set(dismissed.map((d) => d.jobId));

  // Use the same matchJobToUser used on the dashboard so the score and the
  // reasoning are identical across screens. Then sort the listing by score
  // (high → low) so the strongest matches appear first.
  const jobs: JobItem[] = rawJobs
    .filter((job) => !dismissedIds.has(job.id))
    .map((job) => {
      const match = isFreeTier ? { score: 0, reasons: [] } : matchJobToUser(job, profile, passport);
      return {
        id: job.id,
        title: job.title,
        company: job.company,
        companyLogo: job.companyLogo,
        summary: job.summary,
        location: job.location,
        region: job.region ?? null,
        field: job.field,
        experienceLevel: job.experienceLevel,
        source: job.source,
        externalUrl: job.externalUrl,
        isHot: job.isHot,
        createdAt: job.createdAt,
        matchScore: match.score,
        matchReasons: match.reasons,
      };
    });
  // Paid members see best-match-first; free viewers keep the natural
  // hot-then-newest order straight from the query.
  if (!isFreeTier) jobs.sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div dir="rtl">
      <ScreenExplainer
        title="לוח המשרות"
        description={[
          "כל המשרות הפעילות במערכת, ממוינות לפי ציון ההתאמה האישי לפרופיל שלך — מהמתאימות ביותר ועד הנמוכות.",
          "סינון לפי אזור, רמת ניסיון, תחום או חיפוש חופשי. כפתור הסתרה (×) משמש להסרת משרה מהתצוגה האישית בלבד, ללא השפעה על משתמשים אחרים.",
          "לחיצה על \"הגשת מועמדות\" פותחת את הקישור המקורי לפרסום, ובמקביל מוסיפה את המשרה למעקב המועמדויות באופן אוטומטי.",
        ]}
      />
      <JobsClient jobs={jobs} hideMatch={isFreeTier} />
    </div>
  );
}
