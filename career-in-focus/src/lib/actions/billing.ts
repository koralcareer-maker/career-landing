"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { CancellationReasonCode } from "@/lib/billing";

const VALID_REASONS: CancellationReasonCode[] = [
  "FOUND_JOB", "NO_VALUE", "STOPPED_SEARCH", "OTHER",
];

/**
 * Mark the user's subscription as cancelled. Doesn't touch their access
 * status — they keep using the product through the end of the current
 * paid cycle. The next /api/cron/billing run will skip them (no charge),
 * and when nextChargeAt passes, their access flips to PENDING.
 */
export async function cancelSubscription(
  reason: CancellationReasonCode,
  note: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("לא מחובר/ת");

  if (!VALID_REASONS.includes(reason)) {
    throw new Error("סיבת ביטול לא תקינה");
  }

  const trimmedNote = note.trim().slice(0, 500);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      subscriptionStatus: "CANCELLED",
      cancelledAt:        new Date(),
      cancellationReason: reason,
      cancellationNote:   trimmedNote || null,
    },
  });

  revalidatePath("/billing");
}

/**
 * Reverse a cancellation while the user still has access (i.e. before
 * their cycle ends). Sets the subscription back to ACTIVE; the next
 * cron tick will charge them on schedule again.
 */
export async function reactivateSubscription() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("לא מחובר/ת");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { accessStatus: true, nextChargeAt: true },
  });
  if (!user) throw new Error("המשתמש לא נמצא");
  if (user.accessStatus !== "ACTIVE") {
    throw new Error("הגישה כבר פגה — צריך להירשם מחדש דרך /pricing");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      subscriptionStatus: "ACTIVE",
      cancelledAt:        null,
      cancellationReason: null,
      cancellationNote:   null,
    },
  });

  revalidatePath("/billing");
}
