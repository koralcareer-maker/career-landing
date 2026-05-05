import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { EventsClient } from "./events-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "סדנאות ואירועים | קריירה בפוקוס" };

export default async function EventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const events = await prisma.event.findMany({
    where: { isPublished: true, startAt: { gte: new Date() } },
    orderBy: { startAt: "asc" },
  });

  // Plain JSON serialise so dates / nullables travel cleanly to the client.
  const serialised = events.map((e) => ({
    id:           e.id,
    title:        e.title,
    description:  e.description,
    type:         e.type,
    startAt:      e.startAt.toISOString(),
    endAt:        e.endAt?.toISOString() ?? null,
    location:     e.location,
    isOnline:     e.isOnline,
    meetingUrl:   e.meetingUrl,
    registerUrl:  e.registerUrl,
    imageUrl:     e.imageUrl,
    audience:     e.audience,
    valueBullets: (() => {
      if (!e.valueBullets) return [];
      try {
        const v = JSON.parse(e.valueBullets);
        return Array.isArray(v) ? v.filter((x: unknown): x is string => typeof x === "string") : [];
      } catch {
        return e.valueBullets.split("\n").filter(Boolean);
      }
    })(),
    host:         e.host,
    hostRole:     e.hostRole,
  }));

  return (
    <div dir="rtl" className="p-4 sm:p-6">
      <EventsClient events={serialised} />
    </div>
  );
}
