import { prisma } from "@/lib/prisma";
import { WhatsAppGroupsClient } from "./whatsapp-groups-client";

export const dynamic = "force-dynamic";

export default async function WhatsAppGroupsPage() {
  const tools = await prisma.tool.findMany({
    where: { type: "WHATSAPP_GROUP", isPublished: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: { id: true, title: true, category: true, externalUrl: true, notes: true, description: true },
  });

  // Group by industry
  const byIndustry: Record<string, typeof tools> = {};
  for (const t of tools) {
    const cat = t.category ?? "אחר";
    if (!byIndustry[cat]) byIndustry[cat] = [];
    byIndustry[cat].push(t);
  }

  return <WhatsAppGroupsClient groups={tools} byIndustry={byIndustry} />;
}
