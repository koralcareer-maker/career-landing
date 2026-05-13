import { prisma } from "@/lib/prisma";
import { ToolsClient } from "./tools-client";
import { ScreenExplainer } from "@/components/screen-explainer";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const [tools, whatsappCount, facebookCount] = await Promise.all([
    prisma.tool.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.tool.count({ where: { type: "WHATSAPP_GROUP" as any, isPublished: true } }),
    prisma.tool.count({ where: { type: "FACEBOOK_GROUP" as any, isPublished: true } }),
  ]);

  return (
    <div dir="rtl">
      <ScreenExplainer
        title="כלים ומשאבים"
        description={[
          "אוסף הכלים שיעזרו לך להתקדם לתפקיד הבא: קבוצות וואטסאפ ופייסבוק לחיפוש משרות, ספריית מגייסים, מחולל תמונת לינקדאין AI, ותבניות נטוורקינג מוכנות.",
          "מתחת לקוביות הראשיות יש עוד כלים נבחרים — תבניות קורות חיים, מאגרי מידע, כלי AI, ועוד.",
          "חיפוש מעל הקוביות מאפשר לחפש כלי לפי שם או תיאור.",
        ]}
      />
      <ToolsClient tools={tools} whatsappCount={whatsappCount} facebookCount={facebookCount} />
    </div>
  );
}
