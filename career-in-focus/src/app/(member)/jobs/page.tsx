import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";
import { JobsClient } from "./jobs-client";
import type { JobItem } from "./jobs-client";

// ─── Match Score Computation ──────────────────────────────────────────────────

function computeMatchScore(
  job: { title: string; field: string | null; experienceLevel: string | null },
  targetRole: string | null | undefined,
  passportScore: number,
  likelyFitRoles: string[]
): number {
  let score = passportScore > 0 ? Math.min(passportScore, 60) : 40;

  const target = (targetRole ?? "").toLowerCase();
  const jobTitle = job.title.toLowerCase();
  const jobField = (job.field ?? "").toLowerCase();

  // Title/field match boosts
  if (target && jobTitle.includes(target)) score += 25;
  else if (target && jobField.includes(target)) score += 15;

  // Likely fit roles boost
  if (likelyFitRoles.some((r) => jobTitle.includes(r.toLowerCase()))) score += 15;

  return Math.min(Math.max(score, 10), 99);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  const likelyFitRoles = parseJsonArray(passport?.likelyFitRoles);
  const passportScore = passport?.jobMatchScore ?? 0;
  const targetRole = profile?.targetRole;

  const jobs: JobItem[] = rawJobs.map((job) => ({
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
    matchScore: computeMatchScore(job, targetRole, passportScore, likelyFitRoles),
  }));

  return (
    <div dir="rtl">
      <JobsClient jobs={jobs} />
    </div>
  );
}
