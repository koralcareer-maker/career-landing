import { prisma } from "@/lib/prisma";
import { EventsClient } from "./events-client";

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    where: { isPublished: true, startAt: { gte: new Date() } },
    orderBy: { startAt: "asc" },
  });

  return (
    <div dir="rtl">
      <EventsClient events={events} />
    </div>
  );
}
