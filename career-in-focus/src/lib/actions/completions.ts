"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateCareerPassport } from "@/lib/actions/profile";

/**
 * When a user marks a course or a skill as "completed", we record it
 * AND auto-trigger a Career Passport regeneration so the passport
 * reflects their new state on the next page load. The user doesn't
 * have to click anything else — the system rewards their progress.
 *
 * Completion records are idempotent (unique index on (userId, courseId)
 * / (userId, skillName)). If they hit the button twice we silently
 * succeed without creating a duplicate.
 *
 * The Passport regen call is awaited but its failure is non-fatal —
 * if Gemini errors out we still keep the completion row.
 */

async function regenPassportSilently() {
  try {
    await generateCareerPassport();
  } catch (e) {
    console.warn("[completions] passport regen failed:", e instanceof Error ? e.message : e);
  }
}

export async function markCourseCompleted(courseId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "נדרשת כניסה" };
  const userId = session.user.id;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true },
  });
  if (!course) return { error: "הקורס לא נמצא" };

  const existing = await prisma.userCourseCompletion.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) {
    return { ok: true, alreadyCompleted: true, courseTitle: course.title };
  }

  await prisma.userCourseCompletion.create({
    data: { userId, courseId },
  });

  await regenPassportSilently();

  revalidatePath("/courses");
  revalidatePath("/profile");
  revalidatePath("/skills");
  revalidatePath("/dashboard");
  return { ok: true, alreadyCompleted: false, courseTitle: course.title };
}

export async function unmarkCourseCompleted(courseId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "נדרשת כניסה" };
  const userId = session.user.id;

  await prisma.userCourseCompletion.deleteMany({ where: { userId, courseId } });
  await regenPassportSilently();

  revalidatePath("/courses");
  revalidatePath("/profile");
  return { ok: true };
}

export async function markSkillLearned(skillName: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "נדרשת כניסה" };
  const userId = session.user.id;

  const trimmed = skillName.trim().slice(0, 200);
  if (!trimmed) return { error: "שם מיומנות נדרש" };

  const existing = await prisma.userSkillCompletion.findUnique({
    where: { userId_skillName: { userId, skillName: trimmed } },
  });
  if (existing) {
    return { ok: true, alreadyCompleted: true, skillName: trimmed };
  }

  await prisma.userSkillCompletion.create({
    data: { userId, skillName: trimmed },
  });

  await regenPassportSilently();

  revalidatePath("/skills");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true, alreadyCompleted: false, skillName: trimmed };
}

export async function unmarkSkillLearned(skillName: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "נדרשת כניסה" };
  const userId = session.user.id;

  await prisma.userSkillCompletion.deleteMany({ where: { userId, skillName } });
  await regenPassportSilently();

  revalidatePath("/skills");
  revalidatePath("/profile");
  return { ok: true };
}

/**
 * Helper used by server pages to know which courses / skills the
 * current user has already completed (to show a checked state).
 */
export async function getUserCompletions() {
  const session = await auth();
  if (!session?.user?.id) return { courseIds: new Set<string>(), skills: new Set<string>() };
  const userId = session.user.id;

  const [courses, skills] = await Promise.all([
    prisma.userCourseCompletion.findMany({ where: { userId }, select: { courseId: true } }),
    prisma.userSkillCompletion.findMany({ where: { userId }, select: { skillName: true } }),
  ]);
  return {
    courseIds: new Set(courses.map((c) => c.courseId)),
    skills: new Set(skills.map((s) => s.skillName)),
  };
}
