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
      // rows — measured 6.7s SSR when it was fetched). It's not
      // rendered on cards, and the match scorer's strong signals are
      // title-anchored anyway; title+summary+field carry the score.
      // The auto-matcher fetches description separately where the AI
      // requirements check actually reads it.
      select: {
        id: true, title: true, company: true, companyLogo: true,
        summary: true, location: true, region: true, field: true,
        experienceLevel: true, source: true, sourceRef: true,
        externalUrl: true, isHot: true, createdAt: true,
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
  // Board order. Coral's own recruitment-system postings (SVT) lead:
  // rank 0 = her SVT jobs, rank 1 = other hot jobs, rank 2 = the rest;
  // newest-first inside each rank. Paid members then get their
  // personal match order on top of everything (unchanged).
  const svtIdx = new Map(
    rawJobs.map((j) => [
      j.id,
      j.sourceRef?.startsWith("svt:") || j.source === "קורל - SVT" ? 0 : j.isHot ? 1 : 2,
    ]),
  );
  jobs.sort((a, b) => {
    const ra = svtIdx.get(a.id) ?? 2;
    const rb = svtIdx.get(b.id) ?? 2;
    if (ra !== rb) return ra - rb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
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
