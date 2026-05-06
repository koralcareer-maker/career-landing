import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";
import { JobSearchWizard } from "./wizard/job-search-wizard";
import { PassportHero } from "./passport-hero";
import type { WizardState } from "./wizard/types";

function parseAdditionalLinks(raw: string | null | undefined): Array<{ label: string; url: string }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is { label: string; url: string } =>
          typeof x === "object" && x !== null && "url" in x && "label" in x &&
          typeof (x as { url: unknown }).url === "string" && typeof (x as { label: unknown }).label === "string",
      );
  } catch {
    return [];
  }
}

/**
 * Job-search definition wizard — the platform's onboarding spine.
 * Replaces the old single-page mega-form. The wizard collects the
 * data that drives jobs/coach/insights; the existing CareerPassport
 * (AI insights) renders above the wizard so returning users still see
 * their score and recommendations at a glance.
 */
export default async function ProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, profile, passport, courseCompletions, skillCompletions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, photoUpgradeStatus: true } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.careerPassport.findUnique({ where: { userId } }),
    prisma.userCourseCompletion.count({ where: { userId } }).catch(() => 0),
    prisma.userSkillCompletion.count({ where: { userId } }).catch(() => 0),
  ]);

  // Hydrate wizard from the existing Profile row (if present). Safe
  // when columns are missing (legacy DB) — pulls undefined and the
  // wizard shows blanks.
  const initial: Partial<WizardState> = profile ? {
    targetRole: profile.targetRole ?? "",
    industries: parseJsonArray(profile.q_industryInterests),
    desiredField: profile.desiredField ?? "",
    region: "", // not yet on Profile
    workType:
      profile.q_remotePreference === "remote" || profile.q_remotePreference === "hybrid" || profile.q_remotePreference === "office"
        ? (profile.q_remotePreference as WizardState["workType"])
        : "",
    currentRole: profile.currentRole ?? "",
    yearsExperience: profile.yearsExperience ?? null,
    strengths: parseJsonArray(profile.strengths),
    resumeUrl: profile.resumeUrl ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsActively: (profile as any).js_actively ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsSearchWeeks: (profile as any).js_searchWeeks ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsRecentInterviews: (profile as any).js_recentInterviews ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsIsApplying: (profile as any).js_isApplying ?? null,
    linkedinUrl: profile.linkedinUrl ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    portfolioUrl: (profile as any).portfolioUrl ?? "",
    additionalLinks: parseAdditionalLinks(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profile as any).additionalLinks,
    ),
  } : {};

  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-8">
      {/* Career Passport — the AI insights snapshot, kept above the wizard
          so returning users see what their data already produced. */}
      {passport && (
        <PassportHero
          passport={{
            jobMatchScore: passport.jobMatchScore,
            strengths: parseJsonArray(passport.strengths),
            skillGaps: parseJsonArray(passport.skillGaps),
            recommendations: parseJsonArray(passport.recommendations),
            likelyFitRoles: parseJsonArray(passport.likelyFitRoles),
            recommendedIndustries: parseJsonArray(passport.recommendedIndustries),
            nextBestActions: parseJsonArray(passport.nextBestActions),
            summary: passport.summary,
            generatedAt: passport.generatedAt.toISOString(),
          }}
          user={{
            name: user?.name ?? "",
            imageUrl: profile?.imageUrl ?? null,
            targetRole: profile?.targetRole ?? null,
            currentRole: profile?.currentRole ?? null,
            yearsExperience: profile?.yearsExperience ?? null,
          }}
          completions={{ courses: courseCompletions, skills: skillCompletions }}
        />
      )}

      <JobSearchWizard initial={initial} firstName={firstName} />
    </div>
  );
}
