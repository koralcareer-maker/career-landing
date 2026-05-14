"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendCvWritingRequestEmail, notifyAdminOfCvRequest } from "@/lib/email";

// Same fallback chain as lib/email.ts: ADMIN_NOTIFY_EMAIL first
// (Coral's chosen admin inbox), then the legacy ADMIN_EMAIL var, then
// her personal Gmail. Keeps all admin destinations consistent.
const ADMIN_EMAIL =
  process.env.ADMIN_NOTIFY_EMAIL ??
  process.env.ADMIN_EMAIL ??
  "koralcareer@gmail.com";

/**
 * Customer-facing: "קורל תכין לי קוח" CTA from the upgrade flow.
 * Creates a CvWritingRequest, fires the customer confirmation email
 * and the admin notification (in-app + email).
 *
 * Tolerates the table not existing yet — pre-migration we still send
 * the emails so Coral isn't left in the dark.
 */
export async function requestCvWriting() {
  const session = await auth();
  if (!session?.user?.id) return { error: "נדרשת כניסה" };
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      gender: true,
      profile: { select: { phone: true, targetRole: true } },
    },
  });
  if (!user) return { error: "המשתמש/ת לא נמצא/ה" };

  // Persist the request. Wrap in try so a missing table (pre-migrate)
  // doesn't block the emails — Coral still sees the request via her
  // inbox even before the DB row lands.
  try {
    await prisma.cvWritingRequest.create({
      data: { userId, status: "PENDING" },
    });
  } catch (e) {
    console.warn("[cv-requests] persist failed (table missing?):", e instanceof Error ? e.message : e);
  }

  // In-app admin notification — surfaces in the bell badge and lives
  // in the regular notifications table even before /admin/cv-requests
  // has data. Best-effort, doesn't block the flow if it fails.
  try {
    const admin = await prisma.user.findFirst({
      where: { OR: [{ role: "SUPER_ADMIN" }, { role: "ADMIN" }] },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (admin) {
      await prisma.notification.create({
        data: {
          userId:  admin.id,
          type:    "general",
          title:   `📋 בקשה חדשה לכתיבת קוח: ${user.name ?? user.email}`,
          message: `תפקיד יעד: ${user.profile?.targetRole ?? "(לא צוין)"} · טלפון: ${user.profile?.phone ?? "(לא צוין)"}`,
          link:    "/admin/cv-requests",
        },
      });
    }
  } catch (e) {
    console.warn("[cv-requests] admin notification failed:", e);
  }

  // Two emails fire in parallel — customer confirmation + admin alert.
  await Promise.allSettled([
    sendCvWritingRequestEmail({
      name:   user.name ?? user.email,
      email:  user.email,
      gender: user.gender === "m" ? "m" : "f",
    }),
    notifyAdminOfCvRequest({
      to:         ADMIN_EMAIL,
      userName:   user.name ?? user.email,
      userEmail:  user.email,
      userPhone:  user.profile?.phone ?? null,
      targetRole: user.profile?.targetRole ?? null,
    }),
  ]);

  revalidatePath("/admin/cv-requests");
  return { success: true };
}

// ─── Admin-side helpers ───────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Unauthorized");
  }
}

export async function updateCvRequestStatus(id: string, status: string) {
  await requireAdmin();
  const allowed = ["PENDING", "SCHEDULED", "IN_PROGRESS", "DELIVERED", "CANCELLED"];
  if (!allowed.includes(status)) throw new Error("invalid status");

  const data: Record<string, unknown> = { status };
  if (status === "DELIVERED") data.deliveredAt = new Date();
  if (status === "SCHEDULED") data.scheduledAt = new Date();

  await prisma.cvWritingRequest.update({ where: { id }, data });
  revalidatePath("/admin/cv-requests");
}

export async function updateCvRequestNotes(id: string, notes: string) {
  await requireAdmin();
  await prisma.cvWritingRequest.update({
    where: { id },
    data: { adminNotes: notes.trim().slice(0, 2000) },
  });
  revalidatePath("/admin/cv-requests");
}
