import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray, getReadinessScore } from "@/lib/utils";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, profile, passport] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, photoUpgradeStatus: true } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.careerPassport.findUnique({ where: { userId } }),
  ]);

  const readinessScore = profile ? getReadinessScore(profile) : 0;

  return (
    <ProfileClient
      user={{ email: user?.email ?? "", name: user?.name ?? "", photoUpgradeStatus: user?.photoUpgradeStatus ?? "NONE" }}
      profile={profile ? {
        fullName: profile.fullName,
        phone: profile.phone,
        currentRole: profile.currentRole,
        targetRole: profile.targetRole,
        yearsExperience: profile.yearsExperience,
        desiredField: profile.desiredField,
        careerTransitionGoal: profile.careerTransitionGoal,
        mainChallenge: profile.mainChallenge,
        strengths: parseJsonArray(profile.strengths),
        missingSkills: parseJsonArray(profile.missingSkills),
        preferredSalaryMin: profile.preferredSalaryMin,
        preferredSalaryMax: profile.preferredSalaryMax,
        linkedinUrl: profile.linkedinUrl,
        resumeUrl: profile.resumeUrl,
        imageUrl: profile.imageUrl,
        questionnaireCompleted: profile.questionnaireCompleted,
        // Questionnaire fields
        q_workStyle: profile.q_workStyle,
        q_teamOrSolo: profile.q_teamOrSolo,
        q_motivators: profile.q_motivators,
        q_biggestFear: profile.q_biggestFear,
        q_idealDay: profile.q_idealDay,
        q_pastAchievement: profile.q_pastAchievement,
        q_learningStyle: profile.q_learningStyle,
        q_shortTermGoal: profile.q_shortTermGoal,
        q_longTermGoal: profile.q_longTermGoal,
        q_networkingLevel: profile.q_networkingLevel,
        q_remotePreference: profile.q_remotePreference,
        q_valuesAtWork: parseJsonArray(profile.q_valuesAtWork),
        q_industryInterests: parseJsonArray(profile.q_industryInterests),
      } : null}
      passport={passport ? {
        jobMatchScore: passport.jobMatchScore,
        strengths: parseJsonArray(passport.strengths),
        skillGaps: parseJsonArray(passport.skillGaps),
        recommendations: parseJsonArray(passport.recommendations),
        likelyFitRoles: parseJsonArray(passport.likelyFitRoles),
        recommendedIndustries: parseJsonArray(passport.recommendedIndustries),
        nextBestActions: parseJsonArray(passport.nextBestActions),
        summary: passport.summary,
        generatedAt: passport.generatedAt.toISOString(),
      } : null}
      readinessScore={readinessScore}
    />
  );
}
