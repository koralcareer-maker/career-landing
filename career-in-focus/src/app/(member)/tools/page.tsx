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
          "אוסף כלים מעשיים לקידום חיפוש העבודה: קבוצות וואטסאפ ופייסבוק רלוונטיות, ספריית מגייסים, מחולל תמונות לינקדאין מבוסס AI, ותבניות נטוורקינג מוכנות לשליחה.",
          "מתחת לקוביות הראשיות מוצגים כלים נבחרים נוספים — תבניות קורות חיים, מאגרי מידע, כלי AI ועוד.",
          "שדה החיפוש העליון מאפשר לאתר כלי לפי שם או תיאור.",
        ]}
      />
      <ToolsClient tools={tools} whatsappCount={whatsappCount} facebookCount={facebookCount} />
    </div>
  );
}
