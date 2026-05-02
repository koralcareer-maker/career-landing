import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { matchJobToUser } from "@/lib/matching";
import { JobsClient } from "./jobs-client";
import type { JobItem } from "./jobs-client";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [profile, passport, rawJobs] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.careerPassport.findUnique({ where: { userId } }),
    prisma.job.findMany({
      where: { isPublished: true },
      orderBy: [{ isHot: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  // Use the same matchJobToUser used on the dashboard so the score and the
  // reasoning are identical across screens. Then sort the listing by score
  // (high → low) so the strongest matches appear first.
  const jobs: JobItem[] = rawJobs
    .map((job) => {
      const match = matchJobToUser(job, profile, passport);
      return {
        id: job.id,
        title: job.title,
        company: job.company,
        companyLogo: job.companyLogo,
        summary: job.summary,
        location: job.location,
        field: job.field,
        experienceLevel: job.experienceLevel,
        source: job.source,
        externalUrl: job.externalUrl,
        isHot: job.isHot,
        createdAt: job.createdAt,
        matchScore: match.score,
        matchReasons: match.reasons,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div dir="rtl">
      <JobsClient jobs={jobs} />
    </div>
  );
}
