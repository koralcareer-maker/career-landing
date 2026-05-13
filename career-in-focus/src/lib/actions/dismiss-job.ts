"use server";

/**
 * Per-user "hide this job" action — when a member clicks the X on a job
 * card, we store the (userId, jobId) pair so future renders of /jobs
 * filter that job out for them only. Other members still see it.
 *
 * The unique constraint on (userId, jobId) means a double-click can't
 * create dupes; we swallow that error so the UX is idempotent.
 */

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function dismissJob(jobId: string) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };
  if (!jobId) return { error: "חסר מזהה משרה" };

  try {
    await prisma.dismissedJob.create({
      data: { userId: session.user.id, jobId },
    });
  } catch (e) {
    // Unique-constraint violation = already dismissed. Don't surface as
    // an error, the desired state is "hidden" either way.
    const code = (e as { code?: string })?.code;
    if (code !== "P2002") {
      console.error("[dismissJob] unexpected:", e);
      return { error: "לא הצלחנו להסתיר את המשרה — נסי שוב" };
    }
  }

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function undismissJob(jobId: string) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };
  if (!jobId) return { error: "חסר מזהה משרה" };

  await prisma.dismissedJob.deleteMany({
    where: { userId: session.user.id, jobId },
  });

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  return { success: true };
}
