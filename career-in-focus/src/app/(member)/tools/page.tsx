import { prisma } from "@/lib/prisma";
import { ToolsClient } from "./tools-client";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const [tools, whatsappCount] = await Promise.all([
    prisma.tool.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.tool.count({ where: { type: "WHATSAPP_GROUP", isPublished: true } }),
  ]);

  return (
    <div dir="rtl">
      <ToolsClient tools={tools} whatsappCount={whatsappCount} />
    </div>
  );
}
