import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── RSS feeds for Israeli job market news ────────────────────────────────────
const RSS_FEEDS = [
  { url: "https://www.calcalist.co.il/rss/AID-1536.html", source: "כלכליסט" },
  { url: "https://www.globes.co.il/news/rss.aspx?subjectid=18", source: "גלובס" },
];

// ─── Parse RSS XML ────────────────────────────────────────────────────────────
function parseRSSItems(xml: string, source: string) {
  const items: Array<{ title: string; description: string; link: string; pubDate: string }> = [];

  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of itemMatches) {
    const item = match[1];

    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const descMatch = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/) || item.match(/<guid[^>]*>(.*?)<\/guid>/);
    const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

    if (titleMatch && descMatch) {
      const title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
      const desc = descMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .trim()
        .slice(0, 600);

      if (title && desc && title.length > 5) {
        items.push({
          title: `[${source}] ${title}`,
          description: desc,
          link: linkMatch?.[1]?.trim() ?? "",
          pubDate: dateMatch?.[1] ?? new Date().toISOString(),
        });
      }
    }
    if (items.length >= 3) break; // max 3 items per feed
  }
  return items;
}

// ─── Fetch RSS ────────────────────────────────────────────────────────────────
async function fetchFeed(url: string, source: string) {
  try {
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: { "User-Agent": "CareerInFocus/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSSItems(xml, source);
  } catch {
    return [];
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inserted: string[] = [];

  for (const feed of RSS_FEEDS) {
    const items = await fetchFeed(feed.url, feed.source);

    for (const item of items) {
      try {
        // Check if we already have an update with a similar title (dedup)
        const existing = await prisma.update.findFirst({
          where: { title: { contains: item.title.slice(0, 30) } },
          select: { id: true },
        });

        if (existing) continue;

        const content = item.link
          ? `${item.description}\n\n[קרא עוד באתר המקור](${item.link})`
          : item.description;

        await prisma.update.create({
          data: {
            title: item.title.slice(0, 200),
            content,
            category: "market",
            isPublished: true,
            isPinned: false,
          },
        });

        inserted.push(item.title);
      } catch {
        // Skip on DB error (e.g. duplicate)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    inserted: inserted.length,
    titles: inserted,
  });
}
