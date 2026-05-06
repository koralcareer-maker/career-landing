import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { classifyRegion } from "@/lib/regions";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Second batch of civi.co.il imports — 10 listings hand-picked by Coral
 * after the first batch shipped. Unlike the first batch (which had all
 * fields hardcoded), this one fetches each URL at request time and parses
 * title / description / details out of civi's HTML. That's necessary
 * because we only have the share-links from Coral; the rest of the
 * metadata lives on civi.
 *
 * Idempotent on externalUrl. Trigger from /admin/jobs/import-civi-batch2.
 */

const URLS = [
  "https://app.civi.co.il/promo/id=577162&src=16379",
  "https://app.civi.co.il/promo/id=980602&src=16379",
  "https://app.civi.co.il/promo/id=862437&hid=WGXGZCJLKY",
  "https://app.civi.co.il/promo/id=686116&hid=WGXGZCJLKY",
  "https://app.civi.co.il/promo/id=833111&hid=WGXGZCJLKY",
  "https://app.civi.co.il/promo/id=946561&hid=WGXGZCJLKY",
  "https://app.civi.co.il/promo/id=945290&hid=WGXGZCJLKY",
  "https://app.civi.co.il/promo/id=528729&hid=WGXGZCJLKY",
  "https://app.civi.co.il/promo/id=766542&hid=WGXGZCJLKY",
  "https://app.civi.co.il/promo/id=554369&hid=WGXGZCJLKY",
];

interface Scraped {
  title: string;
  description: string;
  details: string;
}

const HE_ENTITIES: Array<[RegExp, string]> = [
  [/&nbsp;/g, " "],
  [/&amp;/g, "&"],
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&quot;/g, '"'],
  [/&#039;/g, "'"],
  [/&apos;/g, "'"],
];

function decodeEntities(s: string): string {
  let out = s;
  for (const [re, replacement] of HE_ENTITIES) out = out.replace(re, replacement);
  return out;
}

function pickField(html: string, jobElemId: string): string {
  // Civi's pages render every job text block as
  //   <div id='je-XXX' class='job-elem'>...content...</div>
  // The regex captures everything until the closing </div>, including
  // line breaks and inline markup. Tags are stripped after extraction.
  const re = new RegExp(
    `id=['"]${jobElemId}['"][^>]*>([\\s\\S]*?)</div>`,
    "i",
  );
  const m = html.match(re);
  if (!m) return "";
  return decodeEntities(m[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).trim();
}

async function scrape(url: string): Promise<Scraped | null> {
  const res = await fetch(url, {
    headers: {
      // Civi serves a slightly cleaner page to a normal browser UA than
      // to a bare Node fetch. Doesn't break anything if missing — this
      // is just defensive.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });
  if (!res.ok) return null;
  const html = await res.text();

  const title = pickField(html, "je-title");
  if (!title) return null;
  const description = pickField(html, "je-descr");
  const details = pickField(html, "je-details");

  return { title, description, details };
}

/**
 * Civi titles often hint at the field — "מתאמ/ת מכירות", "מנהל/ת לקוחות".
 * We surface a coarse field by scanning the title for known buckets.
 * Fine to be wrong — `field` is for filter chips, not anything load-
 * bearing, and the matching algorithm uses the full text blob anyway.
 */
function inferField(title: string): string | null {
  const lc = title.toLowerCase();
  if (/מכירות|sales/i.test(lc)) return "מכירות";
  if (/שיווק|מרקטינג|marketing/i.test(lc)) return "שיווק";
  if (/פיתוח|developer|מפתח/i.test(lc)) return "פיתוח";
  if (/בק (אופיס|office)/i.test(lc) || /אדמינ|מזכיר|רכזת|מתאמ/i.test(lc)) return "אדמיניסטרציה";
  if (/חשב|כספים|finance|הנהלת חשבונות/i.test(lc)) return "כספים";
  if (/לוגיסטיק|רכש|אספקה/i.test(lc)) return "לוגיסטיקה";
  if (/משאבי אנוש|hr|גיוס/i.test(lc)) return "משאבי אנוש";
  if (/שירות לקוחות|תמיכה|customer/i.test(lc)) return "שירות לקוחות";
  if (/מהנדס|engineer|טכנא/i.test(lc)) return "הנדסה";
  if (/מעצב|design/i.test(lc)) return "עיצוב";
  return null;
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json({ error: "פעולה זו זמינה לאדמין בלבד" }, { status: 403 });
  }

  const created: { title: string; id: string }[] = [];
  const skipped: { url: string; reason: string }[] = [];

  for (const url of URLS) {
    try {
      // Idempotency — skip if already imported.
      const existing = await prisma.job.findFirst({
        where: { externalUrl: url },
        select: { id: true },
      });
      if (existing) {
        skipped.push({ url, reason: "already-imported" });
        continue;
      }

      const data = await scrape(url);
      if (!data) {
        skipped.push({ url, reason: "scrape-failed" });
        continue;
      }

      const summary = (data.description || data.details).slice(0, 280);
      const description = [data.description, data.details].filter(Boolean).join("\n\n");
      const region = classifyRegion(data.title, data.description, data.details);

      const job = await prisma.job.create({
        data: {
          title: data.title,
          // Civi pages don't expose a separate company name in a stable
          // place; the title carries the brand for branded ads, and
          // generic ads list a "global retail" / "fintech" / etc. We
          // store "Civi" as a placeholder — the canonical link in
          // externalUrl is what users actually click.
          company: "מודעה דרך Civi",
          summary,
          description,
          region,
          field: inferField(data.title),
          source: "civi.co.il",
          externalUrl: url,
          isPublished: true,
          createdById: session.user.id,
        },
        select: { id: true, title: true },
      });
      created.push(job);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error("[import-civi-jobs-batch2] failed for", url, msg);
      skipped.push({ url, reason: msg.slice(0, 200) });
    }
  }

  return NextResponse.json({
    total: URLS.length,
    createdCount: created.length,
    skippedCount: skipped.length,
    created,
    skipped,
  });
}
