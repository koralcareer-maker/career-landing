import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SOURCES,
  fetchSource,
  processArticle,
  MIN_RELEVANCE,
} from "@/lib/market-intel";

// Free-tier Gemini = 5 requests/minute and a daily cap. We cap each run at
// MAX_PROCESS_PER_RUN to stay safely within that envelope across 4 daily
// runs (every 6h). Each "process" = 1 Gemini call. The cron skips URLs
// already in the DB, so a steady-state run only spends API calls on
// genuinely new articles.
const MAX_PROCESS_PER_RUN = 3;

// Vercel cron — secured by CRON_SECRET in vercel.json. Runs on a schedule
// configured in vercel.json; manually triggerable in dev with the
// `Authorization: Bearer <CRON_SECRET>` header.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let scanned = 0;
  let alreadySeen = 0;
  let processed = 0;
  let published = 0;
  let drafted = 0;
  const errors: string[] = [];

  outer: for (const src of SOURCES) {
    let items;
    try {
      items = await fetchSource(src, 6);
    } catch (e) {
      errors.push(`${src.name}: ${e instanceof Error ? e.message : "fetch failed"}`);
      continue;
    }

    for (const article of items) {
      scanned++;
      // Skip if URL already in DB.
      const existing = await prisma.marketIntelArticle.findUnique({
        where: { originalUrl: article.url },
        select: { id: true },
      });
      if (existing) { alreadySeen++; continue; }

      // Stay under the free-tier Gemini quota — once we've spent the
      // budget for THIS run, stop scanning. Any URLs we didn't process
      // will surface again on the next cron tick (every 6h) and get
      // picked up then.
      if (processed >= MAX_PROCESS_PER_RUN) break outer;

      const result = await processArticle(article);
      if (!result) continue;
      processed++;

      const status = result.relevanceScore >= MIN_RELEVANCE ? "PUBLISHED" : "DRAFT";

      await prisma.marketIntelArticle.create({
        data: {
          originalTitle:     article.title,
          originalUrl:       article.url,
          sourceName:        article.sourceName,
          language:          article.language,
          publishedAt:       isFinite(article.publishedAt.getTime())
                                ? article.publishedAt
                                : new Date(),
          hebrewTitle:       result.hebrewTitle,
          summaryHebrew:     result.summaryHebrew,
          whyItMatters:      result.whyItMatters,
          jobSearchInsight:  result.jobSearchInsight,
          recommendedAction: result.recommendedAction,
          category:          result.category,
          importanceLabel:   result.importanceLabel,
          relevanceScore:    result.relevanceScore,
          status,
        },
      });
      if (status === "PUBLISHED") published++;
      else drafted++;
    }
  }

  return NextResponse.json({
    ok: true,
    scanned,
    alreadySeen,
    processed,
    published,
    drafted,
    errors,
    note: `cap: ${MAX_PROCESS_PER_RUN} Gemini calls/run`,
  });
}
