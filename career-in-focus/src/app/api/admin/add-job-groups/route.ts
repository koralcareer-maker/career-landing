/**
 * POST /api/admin/add-job-groups
 *
 * Bulk-add Facebook / Telegram / WhatsApp job-search community groups
 * to the Tools index (the page at /tools/whatsapp-groups). Same idea
 * as the existing groups, but Coral keeps sending batches by category
 * and there was no path to ingest them without code changes.
 *
 * Body shape:
 *   { groups: Array<{ title?, externalUrl, category, notes? }> }
 *
 * If `title` is omitted we infer one from the URL's slug (or fall
 * back to "קבוצת פייסבוק - {category}"). De-dupes by externalUrl.
 *
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GroupInput {
  title?: string | null;
  externalUrl: string;
  category: string;
  notes?: string | null;
}

function inferTitle(url: string, category: string): string {
  // Strip query strings — they're the tracking params, not the name.
  const clean = url.split("?")[0].replace(/\/$/, "");
  // Try to pull the last path segment as a slug.
  const segments = clean.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  // Numeric IDs are not human-readable — fall back to a category label.
  if (/^[0-9]+$/.test(last) || /^\+/.test(last)) {
    return `קבוצה - ${category}`;
  }
  // Slug like `misrot.hevratiot` → readable phrase.
  const readable = last.replace(/[._-]+/g, " ").trim();
  return `קבוצת ${platform(url)} - ${readable}`;
}

function platform(url: string): string {
  if (url.includes("facebook.com")) return "פייסבוק";
  if (url.includes("t.me") || url.includes("telegram")) return "טלגרם";
  if (url.includes("whatsapp.com") || url.includes("chat.whatsapp")) return "וואטסאפ";
  return "אונליין";
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.groups)) {
    return NextResponse.json({ error: "expected { groups: [...] }" }, { status: 400 });
  }
  const groups = body.groups as GroupInput[];

  // Dedup by externalUrl in one query.
  const urls = groups.map((g) => g.externalUrl);
  const existing = await prisma.tool.findMany({
    where: { externalUrl: { in: urls } },
    select: { externalUrl: true },
  });
  const existingSet = new Set(existing.map((e) => e.externalUrl));

  const results: Array<{ title: string; status: string }> = [];
  for (const g of groups) {
    if (existingSet.has(g.externalUrl)) {
      results.push({ title: g.externalUrl, status: "duplicate" });
      continue;
    }
    const title = g.title?.trim() || inferTitle(g.externalUrl, g.category);
    try {
      await prisma.tool.create({
        data: {
          title,
          externalUrl: g.externalUrl,
          category: g.category,
          type: "WHATSAPP_GROUP",
          notes: g.notes ?? null,
          isPublished: true,
        },
      });
      existingSet.add(g.externalUrl);
      results.push({ title, status: "created" });
    } catch (e) {
      results.push({
        title,
        status: "error: " + String(e instanceof Error ? e.message : e).slice(0, 100),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    total: groups.length,
    inserted: results.filter((r) => r.status === "created").length,
    duplicates: results.filter((r) => r.status === "duplicate").length,
    errors: results.filter((r) => r.status.startsWith("error")).length,
    results,
  });
}
