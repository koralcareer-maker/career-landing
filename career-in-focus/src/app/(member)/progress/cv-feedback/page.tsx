import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CvFeedbackClient } from "./cv-feedback-client";
import { isCvFeedbackResult, type CvFeedbackResult } from "@/lib/cv-feedback-types";

export const dynamic = "force-dynamic";
export const metadata = { title: "ניתוח קורות חיים | קריירה בפוקוס" };

export default async function CvFeedbackPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Hydrate with the most recent analysis (if any) so returning users
  // see their last result on first paint instead of a blank uploader.
  const last = await prisma.cvFeedback.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { fileName: true, result: true, createdAt: true },
  });

  let initial: { fileName: string; result: CvFeedbackResult; createdAt: string } | null = null;
  if (last) {
    try {
      const parsed = JSON.parse(last.result);
      if (isCvFeedbackResult(parsed)) {
        initial = {
          fileName: last.fileName,
          result: parsed,
          createdAt: last.createdAt.toISOString(),
        };
      }
    } catch {
      /* corrupted row — show fresh uploader */
    }
  }

  // Optional target role from the user's profile to sharpen the analysis.
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { targetRole: true },
  });

  return <CvFeedbackClient initial={initial} targetRole={profile?.targetRole ?? null} />;
}
