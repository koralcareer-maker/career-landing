import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UpdatesClient } from "./updates-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "כל מה שקורה עכשיו | קריירה בפוקוס" };

// The "Updates" page is now the Market Intelligence feed — auto-collected
// articles about the job market, AI, hiring, and trends, processed by
// Gemini into Hebrew with practical insights and recommended actions.
//
// We still surface the legacy Update entries (admin announcements) at the
// top under a "פוסט נעוץ" pinned section, so admins can still drop
// community announcements without losing the column.

export default async function UpdatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [articles, pinnedAnnouncements] = await Promise.all([
    prisma.marketIntelArticle.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [
        { isPinned: "desc" },
        { isFeatured: "desc" },
        { publishedAt: "desc" },
      ],
      take: 60,
    }),
    prisma.update.findMany({
      where: { isPublished: true, isPinned: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const serialised = articles.map((a) => ({
    id:                a.id,
    hebrewTitle:       a.hebrewTitle,
    summaryHebrew:     a.summaryHebrew,
    whyItMatters:      a.whyItMatters,
    jobSearchInsight:  a.jobSearchInsight,
    recommendedAction: a.recommendedAction,
    category:          a.category,
    importanceLabel:   a.importanceLabel,
    relevanceScore:    a.relevanceScore,
    sourceName:        a.sourceName,
    originalUrl:       a.originalUrl,
    publishedAt:       a.publishedAt.toISOString(),
    isPinned:          a.isPinned,
    isFeatured:        a.isFeatured,
  }));

  const announcements = pinnedAnnouncements.map((u) => ({
    id:        u.id,
    title:     u.title,
    content:   u.content,
    category:  u.category,
    createdAt: u.createdAt.toISOString(),
    ctaText:   u.ctaText,
    ctaUrl:    u.ctaUrl,
  }));

  return (
    <div className="p-4 sm:p-6">
      <UpdatesClient articles={serialised} announcements={announcements} />
    </div>
  );
}
