import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { markAllRead } from "@/lib/actions/notifications";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const session = await auth();
  const userId = session!.user.id;

  // Fetch notifications
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Mark all as read on page load (fire-and-forget, no await needed for UX)
  const hasUnread = notifications.some((n) => !n.isRead);
  if (hasUnread) {
    await markAllRead(userId);
  }

  return (
    <div dir="rtl">
      <NotificationsClient notifications={notifications} />
    </div>
  );
}
