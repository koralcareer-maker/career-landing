"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendEventRegistrationEmail } from "@/lib/email";

/**
 * Register the current user for an event. Idempotent: if they're already
 * registered, returns success without spamming a second email.
 *
 * Flow:
 *   1. Validate auth + event exists + event is in the future.
 *   2. Upsert the EventRegistration row (the @@unique constraint
 *      protects against double-clicks during email send).
 *   3. Fire the confirmation email (best-effort — don't block the UI
 *      if email infra hiccups).
 *
 * Returns `{ ok: true }` on success or `{ error: string }` for the
 * client form to surface to the user.
 */
export async function registerForEvent(eventId: string): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "נדרשת כניסה למערכת" };
  }
  const userId = session.user.id;

  // Read the event + check existing registration in parallel.
  const [event, existing] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        startAt: true,
        location: true,
        isOnline: true,
        meetingUrl: true,
        isPublished: true,
      },
    }),
    prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true, cancelledAt: true },
    }),
  ]);

  if (!event || !event.isPublished) {
    return { error: "האירוע לא נמצא או הוסר" };
  }
  if (event.startAt.getTime() < Date.now()) {
    return { error: "האירוע כבר התקיים" };
  }

  // Already registered (and not cancelled) — idempotent no-op.
  if (existing && !existing.cancelledAt) {
    return { ok: true };
  }

  // Either reactivate a cancelled registration or create a new one.
  if (existing) {
    await prisma.eventRegistration.update({
      where: { id: existing.id },
      data: { cancelledAt: null, registeredAt: new Date() },
    });
  } else {
    await prisma.eventRegistration.create({
      data: { eventId, userId },
    });
  }

  // Pull contact info for the email — we only need it now, not above.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, gender: true },
  });
  if (user) {
    sendEventRegistrationEmail({
      to: user.email,
      name: user.name ?? "",
      eventTitle: event.title,
      eventStartAt: event.startAt,
      eventLocation: event.location,
      isOnline: event.isOnline,
      zoomLink: event.meetingUrl,
      gender: (user.gender as "f" | "m" | undefined) ?? "f",
    }).catch((err) =>
      console.error("[register-event] email send failed:", err),
    );
  }

  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Cancel the current user's registration. Soft-delete (sets cancelledAt)
 * so the audit trail is preserved and a re-register works smoothly via
 * the upsert path above.
 */
export async function cancelEventRegistration(eventId: string): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "נדרשת כניסה למערכת" };
  }

  await prisma.eventRegistration.updateMany({
    where: { eventId, userId: session.user.id, cancelledAt: null },
    data: { cancelledAt: new Date() },
  });

  revalidatePath("/events");
  revalidatePath("/dashboard");
  return { ok: true };
}
