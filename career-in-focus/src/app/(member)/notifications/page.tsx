import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { markAllRead } from "@/lib/actions/notifications";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [notifications, user] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      // notificationsEnabled is a new column; the type union may lag
      // until the Prisma client regenerates on Vercel, so we cast.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: { notificationsEnabled: true } as any,
    }),
  ]);

  // Mark all as read on page load (fire-and-forget, no await needed for UX)
  const hasUnread = notifications.some((n) => !n.isRead);
  if (hasUnread) {
    await markAllRead(userId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notificationsEnabled = (user as any)?.notificationsEnabled ?? true;

  return (
    <div dir="rtl">
      <NotificationsClient
        notifications={notifications}
        notificationsEnabled={notificationsEnabled}
      />
    </div>
  );
}
