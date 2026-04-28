import { prisma } from "@/lib/prisma";
import { FacebookGroupsClient } from "./facebook-groups-client";

export const dynamic = "force-dynamic";

export default async function FacebookGroupsPage() {
  const tools = await prisma.tool.findMany({
    where: { type: "FACEBOOK_GROUP" as any, isPublished: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: { id: true, title: true, category: true, externalUrl: true, notes: true },
  });

  const byCategory: Record<string, typeof tools> = {};
  for (const t of tools) {
    const cat = t.category ?? "אחר";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(t);
  }

  return <FacebookGroupsClient groups={tools} byCategory={byCategory} />;
}
