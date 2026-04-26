import { prisma } from "@/lib/prisma";
import { ToolsClient } from "./tools-client";

export default async function ToolsPage() {
  const tools = await prisma.tool.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div dir="rtl">
      <ToolsClient tools={tools} />
    </div>
  );
}
