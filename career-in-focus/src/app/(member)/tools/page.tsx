import { prisma } from "@/lib/prisma";
import { ToolsClient } from "./tools-client";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const [tools, whatsappCount, facebookCount] = await Promise.all([
    prisma.tool.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.tool.count({ where: { type: "WHATSAPP_GROUP", isPublished: true } }),
    prisma.tool.count({ where: { type: "FACEBOOK_GROUP", isPublished: true } }),
  ]);

  return (
    <div dir="rtl">
      <ToolsClient tools={tools} whatsappCount={whatsappCount} facebookCount={facebookCount} />
    </div>
  );
}
