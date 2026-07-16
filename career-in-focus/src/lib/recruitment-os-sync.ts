/**
 * Sync Coral's own recruitment system ("גיוס בפוקוס", the Recruitment
 * OS on Neon Postgres) into the public job board.
 *
 * Unlike SVT/Civi (bot-shielded, scraped in her browser), the OS DB is
 * reachable server-side over Neon's HTTP SQL endpoint, so this runs
 * automatically. Each run:
 *
 *   1. Reads every OPEN/ON_HOLD job from the OS.
 *   2. Upserts each onto the board by sourceRef "ros:{req}" — new ones
 *      created, existing ones refreshed — with source "גיוס בפוקוס",
 *      isHot=true, and externalUrl pointing at the OS public apply page
 *      so applications flow back into her pipeline.
 *   3. Unpublishes board jobs whose "ros:" req is no longer open at the
 *      source (filled / cancelled / closed).
 *
 * The board sort ranks source "גיוס בפוקוס" first, so these lead.
 *
 * Config (env): ROS_SQL_URL (Neon HTTP SQL endpoint) + ROS_CONN
 * (connection string). Unset → returns {configured:false} and touches
 * nothing, so a missing secret can never wipe the section.
 */
import { prisma } from "@/lib/prisma";
import { classifyRegion } from "@/lib/regions";

const OS_APPLY_BASE =
  process.env.ROS_APPLY_BASE ?? "https://recruitment-os-two.vercel.app/apply";
const BOARD_SOURCE = "גיוס בפוקוס";

interface OsJob {
  req: string;
  title: string;
  description: string | null;
  location: string | null;
  company: string | null;
}

export interface OsSyncResult {
  configured: boolean;
  openAtSource?: number;
  added?: number;
  refreshed?: number;
  retired?: number;
  error?: string;
}

async function fetchOpenOsJobs(): Promise<OsJob[]> {
  const url = process.env.ROS_SQL_URL;
  const conn = process.env.ROS_CONN;
  if (!url || !conn) throw new Error("__not_configured__");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Neon-Connection-String": conn,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `SELECT j."requisitionNumber" AS req, j.title, j.description, j.location,
                     c.name AS company
              FROM "Job" j
              LEFT JOIN "Company" c ON c.id = j."companyId"
              WHERE j.status IN ('OPEN', 'ON_HOLD')
                AND j."requisitionNumber" IS NOT NULL`,
      params: [],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Neon SQL ${res.status}`);
  const data = (await res.json()) as { rows?: OsJob[] };
  return (data.rows ?? []).filter((r) => r.req);
}

function fieldFromTitle(t: string): string {
  if (/מכיר|sales|csm/i.test(t)) return "מכירות";
  if (/ביטוח|פנסיו|חתם/i.test(t)) return "ביטוח";
  if (/חשב|כספים|הנהלת חשבונות|finance|בקר/i.test(t)) return "כספים";
  if (/soc|noc|סייבר|cyber|אבטחת מידע/i.test(t)) return "Cyber";
  if (/משאבי אנוש|גיוס|hr/i.test(t)) return "משאבי אנוש";
  if (/מפתח|devops|qa|תוכנה|software/i.test(t)) return "פיתוח";
  return "ניהול";
}

export async function syncRecruitmentOs(): Promise<OsSyncResult> {
  let osJobs: OsJob[];
  try {
    osJobs = await fetchOpenOsJobs();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    if (msg === "__not_configured__") return { configured: false };
    return { configured: true, error: msg };
  }

  // Never unpublish everything on an empty/failed read — that would
  // wipe the whole section on a source-side glitch.
  if (osJobs.length === 0) {
    return { configured: true, openAtSource: 0, added: 0, refreshed: 0, retired: 0 };
  }

  const activeRefs = new Set(osJobs.map((j) => `ros:${j.req}`));

  let added = 0;
  let refreshed = 0;
  for (const j of osJobs) {
    const sourceRef = `ros:${j.req}`;
    const externalUrl = `${OS_APPLY_BASE}/${encodeURIComponent(j.req)}`;
    const description = (j.description ?? "").trim() || j.title;
    const location = j.location && j.location !== "לא צוין" ? j.location : null;
    const common = {
      title: j.title,
      company: j.company ?? BOARD_SOURCE,
      description,
      summary: description.slice(0, 240),
      location,
      region: classifyRegion(location),
      field: fieldFromTitle(j.title),
      externalUrl,
      source: BOARD_SOURCE,
      isHot: true,
      isPublished: true,
    };
    const existing = await prisma.job.findFirst({
      where: { sourceRef },
      select: { id: true },
    });
    if (existing) {
      await prisma.job.update({ where: { id: existing.id }, data: common });
      refreshed++;
    } else {
      await prisma.job.create({ data: { ...common, sourceRef } });
      added++;
    }
  }

  const tracked = await prisma.job.findMany({
    where: { sourceRef: { startsWith: "ros:" } },
    select: { id: true, sourceRef: true, isPublished: true },
  });
  const staleIds = tracked
    .filter((t) => t.isPublished && t.sourceRef && !activeRefs.has(t.sourceRef))
    .map((t) => t.id);
  let retired = 0;
  if (staleIds.length > 0) {
    const r = await prisma.job.updateMany({
      where: { id: { in: staleIds } },
      data: { isPublished: false },
    });
    retired = r.count;
  }

  return {
    configured: true,
    openAtSource: osJobs.length,
    added,
    refreshed,
    retired,
  };
}
