"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// ─── markAllRead ──────────────────────────────────────────────────────────────

export async function markAllRead(userId: string) {
  const session = await auth();
  if (!session?.user || session.user.id !== userId) return { error: "לא מורשה" };

  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    revalidatePath("/notifications");
    return { success: true };
  } catch {
    return { error: "שגיאה בסימון ההתראות" };
  }
}

// ─── markRead ────────────────────────────────────────────────────────────────

export async function markRead(notificationId: string) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה למערכת" };

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    });

    // Only allow users to mark their own notifications
    if (!notification || notification.userId !== session.user.id) {
      return { error: "לא מורשה" };
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    revalidatePath("/notifications");
    return { success: true };
  } catch {
    return { error: "שגיאה בעדכון ההתראה" };
  }
}

// ─── setNotificationsEnabled ──────────────────────────────────────────
//
// Master notifications switch. When false:
//   - Daily job-alerts cron skips this user entirely (no email)
//   - notifyAllActiveMembers() excludes them from broadcasts
//     (new update / event / course / tool)
// Saved on User.notificationsEnabled, which defaults to true.

export async function setNotificationsEnabled(enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "נדרשת כניסה למערכת" };
  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { notificationsEnabled: enabled },
    });
    revalidatePath("/notifications");
    return { success: true };
  } catch (e) {
    console.warn("[setNotificationsEnabled]", e);
    return { error: "שגיאה בשמירת ההעדפות" };
  }
}
