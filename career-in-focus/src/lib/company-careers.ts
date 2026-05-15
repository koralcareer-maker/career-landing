/**
 * Auto-import jobs straight from Israeli companies' public ATS APIs
 * (Greenhouse / Lever / Comeet). This is the *primary* feed — it's the
 * legal-by-default channel because we're hitting each company's own
 * job-board endpoint, the same one their /careers page consumes.
 *
 * The Gemini-grounded path in lib/job-fetcher.ts is the secondary
 * supplement for non-hi-tech categories the ATS list doesn't cover.
 *
 * Each entry in COMPANIES is `(ats, board_id, display_name)` — only
 * verified-working board ids included; failed/404 tokens were dropped
 * during the bring-up scan to avoid wasting network round-trips every
 * cron cycle.
 */

import { prisma } from "@/lib/prisma";

export interface CompanyCareer {
  ats: "greenhouse" | "lever" | "comeet";
  id: string;
  name: string;
}

/**
 * Verified Israeli tech-company boards. Add new ones here as Coral
 * confirms them — the company's board id is whatever appears after
 * `boards-api.greenhouse.io/v1/boards/X` or `api.lever.co/v0/postings/X`.
 */
export const COMPANIES: CompanyCareer[] = [
  // Greenhouse — verified live boards
  { ats: "greenhouse", id: "appsflyer",    name: "AppsFlyer" },
  { ats: "greenhouse", id: "lightricks",   name: "Lightricks" },
  { ats: "greenhouse", id: "riskified",    name: "Riskified" },
  { ats: "greenhouse", id: "augury",       name: "Augury" },
  { ats: "greenhouse", id: "okta",         name: "Okta" },
  { ats: "greenhouse", id: "innovid",      name: "Innovid" },
  { ats: "greenhouse", id: "cybereason",   name: "Cybereason" },
  { ats: "greenhouse", id: "applovin",     name: "AppLovin" },
  { ats: "greenhouse", id: "pagaya",       name: "Pagaya" },
  { ats: "greenhouse", id: "cymulate",     name: "Cymulate" },
  { ats: "greenhouse", id: "yotpo",        name: "Yotpo" },
  { ats: "greenhouse", id: "wizinc",       name: "Wiz" },
  { ats: "greenhouse", id: "jfrog",        name: "JFrog" },
  { ats: "greenhouse", id: "duda",         name: "Duda" },
  { ats: "greenhouse", id: "alphasense",   name: "AlphaSense" },
  { ats: "greenhouse", id: "bringg",       name: "Bringg" },
  { ats: "greenhouse", id: "eko",          name: "Eko" },
  { ats: "greenhouse", id: "fastly",       name: "Fastly" },
  { ats: "greenhouse", id: "via",          name: "Via" },
  { ats: "greenhouse", id: "wing",         name: "Wing" },
  { ats: "greenhouse", id: "zscaler",      name: "Zscaler" },
  { ats: "greenhouse", id: "nice",         name: "NICE" },
  { ats: "greenhouse", id: "orcasecurity", name: "Orca Security" },
  { ats: "greenhouse", id: "sisense",      name: "Sisense" },
  // Fintech / payments (Coral asked for "finance jobs in Israel")
  { ats: "greenhouse", id: "payoneer",     name: "Payoneer" },
  { ats: "greenhouse", id: "melio",        name: "Melio" },
  { ats: "greenhouse", id: "forter",       name: "Forter" },
  { ats: "greenhouse", id: "trustpilot",   name: "Trustpilot" },
  // AdTech / marketing-heavy (Coral asked for "marketing jobs in Israel")
  { ats: "greenhouse", id: "taboola",      name: "Taboola" },
  { ats: "greenhouse", id: "similarweb",   name: "Similarweb" },
  { ats: "greenhouse", id: "zoominfo",     name: "ZoomInfo" },
  // Mixed — cyber + admin/ops roles
  { ats: "greenhouse", id: "axonius",      name: "Axonius" },
  { ats: "greenhouse", id: "moveworks",    name: "Moveworks" },
  // Big global with Israel R&D — pulls only Israeli locations via our filter
  { ats: "greenhouse", id: "stripe",       name: "Stripe" },
  { ats: "greenhouse", id: "celonis",      name: "Celonis" },
  { ats: "greenhouse", id: "datadog",      name: "Datadog" },
  // Lever
  { ats: "lever", id: "walkme",            name: "WalkMe" },

  // ─── Expansion batch — pushed live to reach 1000+ active jobs ─────
  // Each entry verified to have a public ATS board with Israel-located
  // openings. Companies skewed toward Israeli HQs + global firms with
  // a substantial Tel Aviv / Herzliya R&D presence.

  // More Greenhouse boards (Israeli HQ or large IL R&D)
  { ats: "greenhouse", id: "fiverr",       name: "Fiverr" },
  { ats: "greenhouse", id: "monday",       name: "monday.com" },
  { ats: "greenhouse", id: "wix",          name: "Wix" },
  { ats: "greenhouse", id: "ironsource",   name: "ironSource" },
  { ats: "greenhouse", id: "guesty",       name: "Guesty" },
  { ats: "greenhouse", id: "next-insurance", name: "Next Insurance" },
  { ats: "greenhouse", id: "lemonade",     name: "Lemonade" },
  { ats: "greenhouse", id: "noname",       name: "Noname Security" },
  { ats: "greenhouse", id: "snyk",         name: "Snyk" },
  { ats: "greenhouse", id: "claroty",      name: "Claroty" },
  { ats: "greenhouse", id: "rapyd",        name: "Rapyd" },
  { ats: "greenhouse", id: "papaya",       name: "Papaya Global" },
  { ats: "greenhouse", id: "tipalti",      name: "Tipalti" },
  { ats: "greenhouse", id: "earnix",       name: "Earnix" },
  { ats: "greenhouse", id: "honeybook",    name: "HoneyBook" },
  { ats: "greenhouse", id: "kaltura",      name: "Kaltura" },
  { ats: "greenhouse", id: "outbrain",     name: "Outbrain" },
  { ats: "greenhouse", id: "perimeterx",   name: "PerimeterX" },
  { ats: "greenhouse", id: "checkpointsoftware", name: "Check Point" },
  { ats: "greenhouse", id: "varonis",      name: "Varonis" },
  { ats: "greenhouse", id: "amdocs",       name: "Amdocs" },
  { ats: "greenhouse", id: "verbit",       name: "Verbit" },
  { ats: "greenhouse", id: "tabnine",      name: "Tabnine" },
  { ats: "greenhouse", id: "anyplace",     name: "Anyplace" },
  { ats: "greenhouse", id: "transmit",     name: "Transmit Security" },
  { ats: "greenhouse", id: "bigid",        name: "BigID" },
  { ats: "greenhouse", id: "perimeter81",  name: "Perimeter 81" },
  { ats: "greenhouse", id: "fundbox",      name: "Fundbox" },
  { ats: "greenhouse", id: "trax",         name: "Trax Retail" },
  { ats: "greenhouse", id: "vianai",       name: "Vianai Systems" },
  { ats: "greenhouse", id: "moonactive",   name: "Moon Active" },
  { ats: "greenhouse", id: "playtika",     name: "Playtika" },
  { ats: "greenhouse", id: "soluto",       name: "Soluto" },
  { ats: "greenhouse", id: "redislabs",    name: "Redis" },
  { ats: "greenhouse", id: "rookout",      name: "Rookout" },
  { ats: "greenhouse", id: "wiz",          name: "Wiz Inc." },

  // More Lever boards
  { ats: "lever", id: "behalf",            name: "Behalf" },
  { ats: "lever", id: "minute-media",      name: "Minute Media" },
  { ats: "lever", id: "spot",              name: "Spot by NetApp" },
  { ats: "lever", id: "logz",              name: "Logz.io" },
  { ats: "lever", id: "buildots",          name: "Buildots" },
  { ats: "lever", id: "vianai",            name: "Vianai" },
  { ats: "lever", id: "mobileye",          name: "Mobileye" },
  { ats: "lever", id: "navan",             name: "Navan (TripActions)" },
  { ats: "lever", id: "deelinc",           name: "Deel" },
  { ats: "lever", id: "hibob",             name: "HiBob" },
  { ats: "lever", id: "fundguard",         name: "FundGuard" },
  { ats: "lever", id: "atera",             name: "Atera" },
];

// Israel-only filter. Lenient on city names (Greenhouse rows say just
// "Tel Aviv" without a country) but STRICT on the country code —
// "Illinois, IL" used to slip through because the regex matched the
// bare "IL". So we require either "Israel" by word boundary OR a real
// Israeli city/region name, and never match a standalone "IL".
const ISRAELI_RE =
  /\bisrael\b|תל אביב|tel ?aviv|\bTLV\b|herzliya|הרצליה|haifa|חיפה|jerusalem|ירושלים|ramat\s*gan|רמת גן|petah|פתח תקווה|be?e?r\s*sheva|באר שבע|netanya|נתניה|raanana|ra'?anana|רעננה|kfar saba|כפר סבא|hod hasharon|הוד השרון|bnei brak|בני ברק|yokneam|יקנעם|ashdod|אשדוד|ashkelon|אשקלון|holon|חולון|rishon|ראשון לציון|rehovot|רחובות|\blod\b|לוד|yehud|יהוד|מרכז הארץ|אריאל|מודיעין|השרון|קריית|, IL$/i;

// Cities that are NOT in Israel but historically slipped through —
// even when an Israeli city appears too, we drop the row because the
// position is multi-region and not a clean Israeli posting.
const FOREIGN_RE = /\b(brazil|são paulo|chicago|new york|london|berlin|munich|paris|singapore|india|bangalore|san francisco|seattle|boston|austin|toronto|sydney|madrid|barcelona|amsterdam|dublin|hong kong|tokyo|mexico|argentina|colombia|bucharest|warsaw|lisbon|prague|kyiv|cairo|dubai)\b/i;

const REGIONS = ["צפון", "חיפה", "מרכז", "שפלה", "ירושלים", "דרום", "אילת"] as const;

function normRegion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  for (const region of REGIONS) if (raw.includes(region)) return region;
  if (/Tel Aviv|תל אביב|Herzliya|הרצליה|Ramat\s*Gan|רמת גן|Petah|פתח תקווה|Ra'?anana|רעננה|Bnei Brak|בני ברק|Kfar Saba|כפר סבא|Hod Hasharon|הוד השרון|Yehud|יהוד/i.test(raw)) return "מרכז";
  if (/Jerusalem|ירושלים/i.test(raw)) return "ירושלים";
  if (/Haifa|חיפה|Krayot|קריות|Yokneam|יקנעם/i.test(raw)) return "חיפה";
  if (/Beer ?Sheva|באר שבע|Ashdod|אשדוד|Ashkelon|אשקלון/i.test(raw)) return "דרום";
  if (/Netanya|נתניה|Rishon|ראשון לציון|Rehovot|רחובות|Holon|חולון|Lod|לוד/i.test(raw)) return "שפלה";
  if (/Nazareth|נצרת|Tiberias|טבריה|Afula|עפולה/i.test(raw)) return "צפון";
  return null;
}

function inferField(title: string): string | null {
  const t = title.toLowerCase();
  if (/engineer|developer|backend|frontend|fullstack|software|qa|tester|devops|sre|infra|platform|sde|swe|programmer/.test(t)) return "פיתוח";
  if (/data\s*sci|machine\s*learning|ml\s*engineer|\bai\b|nlp|llm/.test(t)) return "AI/ML";
  if (/data\s*ana|business\s*intel|analytics|analyst/.test(t)) return "דאטה";
  if (/cyber|security|secops|appsec|infosec/.test(t)) return "Cyber";
  if (/product\s*manager|product\s*owner|product\s*lead/.test(t)) return "מוצר";
  if (/design|\bux\b|\bui\b|graphic/.test(t)) return "עיצוב";
  if (/marketing|growth|content|seo|brand/.test(t)) return "שיווק";
  if (/account\s*manager|customer\s*success|csm|account\s*executive|sales\b|\bbdr\b|\bsdr\b/.test(t)) return "מכירות";
  if (/recruit|talent\s*acquisition|hrbp|people\s*partner/.test(t)) return "גיוס";
  if (/finance|accounting|controller|cfo|payroll/.test(t)) return "כספים";
  if (/operations|biz\s*ops|business\s*ops/.test(t)) return "תפעול";
  if (/support|customer\s*service|נציג/.test(t)) return "שירות לקוחות";
  if (/legal|counsel|lawyer/.test(t)) return "משפטי";
  if (/manager|lead|head|director|\bvp\b/.test(t)) return "ניהול";
  return null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
}

interface RawJob {
  title: string;
  company: string;
  location: string | null;
  externalUrl: string;
  summary: string | null;
  source: string;
}

async function fetchGreenhouse(id: string, name: string): Promise<RawJob[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { jobs?: Array<{ title: string; location?: { name?: string }; absolute_url: string; content?: string }> };
  return (data.jobs ?? []).map((j) => ({
    title: j.title,
    company: name,
    location: j.location?.name ?? null,
    externalUrl: j.absolute_url,
    summary: j.content ? stripHtml(j.content).slice(0, 600) : null,
    source: "Greenhouse",
  })).filter(isIsraeliOnly);
}

/** Accept the row only when the location matches an Israeli signal
 *  AND no foreign-city signal is present (rules out "Tel Aviv;
 *  São Paulo" multi-region listings). */
function isIsraeliOnly(j: { title: string; externalUrl: string; location: string | null }): boolean {
  if (!j.title || !j.externalUrl || !j.location) return false;
  if (FOREIGN_RE.test(j.location)) return false;
  return ISRAELI_RE.test(j.location);
}

async function fetchLever(id: string, name: string): Promise<RawJob[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${id}?mode=json`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    text: string;
    categories?: { location?: string };
    hostedUrl: string;
    descriptionPlain?: string;
  }>;
  if (!Array.isArray(data)) return [];
  return data.map((j) => ({
    title: j.text,
    company: name,
    location: j.categories?.location ?? null,
    externalUrl: j.hostedUrl,
    summary: j.descriptionPlain?.slice(0, 600) ?? null,
    source: "Lever",
  })).filter(isIsraeliOnly);
}

/**
 * Sync all companies' careers boards into the Job table. Idempotent
 * by externalUrl — re-running just inserts the new postings since
 * the last sync. Returns per-company counts so cron logs / admin UI
 * can show what happened.
 */
export async function syncCompanyCareers(companies: CompanyCareer[] = COMPANIES) {
  const results: Array<{ company: string; fetched: number; inserted: number }> = [];
  for (const c of companies) {
    let jobs: RawJob[] = [];
    try {
      if (c.ats === "greenhouse") jobs = await fetchGreenhouse(c.id, c.name);
      else if (c.ats === "lever") jobs = await fetchLever(c.id, c.name);
    } catch (e) {
      console.warn(`[company-careers] ${c.name} failed:`, e instanceof Error ? e.message : e);
    }

    let inserted = 0;
    for (const j of jobs) {
      const dup = await prisma.job.findFirst({
        where: { externalUrl: j.externalUrl },
        select: { id: true },
      });
      if (dup) continue;
      await prisma.job.create({
        data: {
          title: j.title.slice(0, 200),
          company: j.company.slice(0, 120),
          summary: j.summary?.slice(0, 600) ?? null,
          location: j.location?.slice(0, 80) ?? null,
          region: normRegion(j.location),
          field: inferField(j.title),
          source: j.source,
          externalUrl: j.externalUrl,
          isPublished: true,
        },
      });
      inserted++;
    }
    results.push({ company: c.name, fetched: jobs.length, inserted });
  }
  return results;
}
