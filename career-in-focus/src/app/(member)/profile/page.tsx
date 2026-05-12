import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { JobSearchWizard } from "./wizard/job-search-wizard";
import { PassportHero } from "./passport-hero";
import type { WizardState } from "./wizard/types";

// Force fresh render per request — this page reads session cookies and the
// per-user Profile/Passport rows; any caching would risk showing a wizard
// to a returning user who already has a passport ("double-screen" bug
// Coral keeps hitting after login).
export const dynamic = "force-dynamic";

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
 *
 * Once the CareerPassport exists this page is the "passport view" by
 * default: PassportHero takes the whole screen and the wizard is hidden
 * behind a "ערכי את הפרופיל" link (?edit=1). First-time users without
 * a passport land straight on the wizard.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const params = (await searchParams) ?? {};

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
  // region + workType are stored as JSON-stringified arrays. Legacy rows
  // may still have a single string in q_remotePreference (e.g. "remote") —
  // wrap those into a one-element array so the wizard hydrates cleanly.
  const region = parseJsonArray(profile?.q_regions ?? null);
  const rawWork = profile?.q_remotePreference ?? null;
  let workType: string[] = [];
  if (rawWork) {
    const fromJson = parseJsonArray(rawWork);
    workType = fromJson.length > 0 ? fromJson : [rawWork];
  }

  const initial: Partial<WizardState> = profile ? {
    targetRole: profile.targetRole ?? "",
    industries: parseJsonArray(profile.q_industryInterests),
    desiredField: profile.desiredField ?? "",
    region,
    workType,
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
  // Default view: when the user has either finished the wizard OR already
  // has a passport, hide the wizard so the page reads as "your career
  // passport". Two flags because they can drift — a user can hit the
  // "finish" button (sets questionnaireCompleted) but the passport
  // generation can fail, and vice-versa during regeneration.
  // The wizard only renders on first-time users (neither flag set) or when
  // explicitly invited via the "ערכי את הפרופיל" CTA (?edit=1).
  const hasFinishedSetup = !!passport || !!profile?.questionnaireCompleted;
  const showWizard = !hasFinishedSetup || params.edit === "1";

  return (
    <div className="space-y-6">
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

      {showWizard ? (
        <JobSearchWizard initial={initial} firstName={firstName} gender={session!.user.gender ?? null} />
      ) : (
        // Passport-only view: give a discoverable way to edit the wizard
        // without leaving /profile.
        <div className="flex justify-center">
          <Link
            href="/profile?edit=1"
            className="inline-flex items-center gap-2 text-sm font-bold text-navy bg-white border border-slate-200 hover:border-teal/60 hover:text-teal px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Pencil size={14} />
            ערכי את הפרופיל
          </Link>
        </div>
      )}
    </div>
  );
}
