/**
 * Candidate ↔ Job auto-matcher.
 *
 * Called whenever a candidate enters the system (/join signup, admin
 * add, nightly catch-up in the daily-job-digest cron). For one
 * candidate it:
 *
 *   1. Scores every published job with the same strict title-anchored
 *      heuristic the member-facing /jobs page uses (lib/matching.ts),
 *      feeding the candidate's targetRole / field / skills through the
 *      profile-shaped adapter.
 *   2. Keeps jobs at or above MATCH_THRESHOLD — with the title-anchored
 *      scorer these are only jobs whose TITLE overlaps the candidate's
 *      target role, which is Coral's "סנכרון בטייטל" requirement.
 *   3. Best-effort Gemini pass on the shortlist: does the candidate
 *      plausibly clear the job's MANDATORY requirements (דרישות חובה)?
 *      Quota failures degrade gracefully — the match survives with
 *      requirementsCheck=null rather than being dropped, because a
 *      missing AI verdict is not evidence of a bad match.
 *   4. Upserts CandidateMatch rows (unique per pair → idempotent).
 *   5. Optionally emails the candidate their new matches (one email
 *      per run, top MAX_JOBS_PER_EMAIL) and stamps status=EMAILED.
 *
 * Two modes, keyed on Candidate.source:
 *   - Free-tier signups (source "הרשמה חינם ללוח משרות") get the
 *     ZERO-TOKEN path: pure category matching against the job pool,
 *     no Gemini call and no matcher email (the daily digest already
 *     owns their inbox). Matches still land on /admin/matches.
 *   - Every other candidate (imports, admin adds — Coral's placement
 *     pipeline) gets the full path: title-anchored scoring, an AI
 *     mandatory-requirements verdict, and an offer email.
 *
 * Everything is capped and try/caught: this runs inside after() hooks
 * and cron routes, and a matcher failure must never break a signup.
 */

import { prisma } from "@/lib/prisma";
import { matchJobToUser, type MatchableJob } from "@/lib/matching";
import { mapFieldToCategory } from "@/lib/job-categories";

const MATCH_THRESHOLD = 60;
const MAX_MATCHES_PER_RUN = 12;      // stored per candidate per run
const MAX_JOBS_PER_EMAIL = 5;
const MAX_AI_CHECKS = 6;             // Gemini calls per run, quota-friendly
const RESEND_FROM =
  process.env.RESEND_FROM ?? "קורל <noreply@careerinfocus.co.il>";

interface JobLite {
  id: string;
  title: string;
  company: string | null;
  summary: string | null;
  description: string | null;
  field: string | null;
  location: string | null;
  externalUrl: string | null;
  isHot: boolean;
}

export interface MatchRunResult {
  candidateId: string;
  scored: number;
  newMatches: number;
  emailed: number;
  skippedReason?: string;
}

/** Load the published-jobs pool once so bulk runs can share it. */
export async function loadMatchableJobs(): Promise<JobLite[]> {
  return prisma.job.findMany({
    where: { isPublished: true },
    select: {
      id: true, title: true, company: true, summary: true,
      description: true, field: true, location: true,
      externalUrl: true, isHot: true,
    },
  });
}

/**
 * Best-effort AI check of the job's mandatory requirements against the
 * candidate's known profile. Returns a short Hebrew verdict string, or
 * null when Gemini is unavailable / over quota / not configured.
 */
async function checkMandatoryRequirements(
  candidateBlob: string,
  job: JobLite,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const description = (job.description ?? job.summary ?? "").slice(0, 3500);
  if (description.length < 40) return null; // nothing to check against

  const prompt = `משרה: ${job.title}
תיאור המשרה (כולל דרישות):
${description}

פרופיל המועמד/ת:
${candidateBlob.slice(0, 1500)}

האם המועמד/ת עומד/ת בדרישות החובה של המשרה? התייחסי רק לדרישות שמנוסחות כחובה (שנות ניסיון, השכלה, רישיון, שפה וכו'). אם אין מספיק מידע על המועמד/ת, כתבי שחסר מידע ואל תפסלי.

החזירי JSON בלבד:
{"verdict": "מתאים" | "כנראה מתאים" | "חסר מידע" | "לא עומד בדרישות חובה", "note": "נימוק קצר במשפט אחד"}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 256,
          },
        }),
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!r.ok) return null;
    const data = (await r.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(txt) as { verdict?: string; note?: string };
    if (!parsed.verdict) return null;
    return parsed.note ? `${parsed.verdict} — ${parsed.note}` : parsed.verdict;
  } catch {
    return null;
  }
}

function candidateProfileBlob(c: {
  name: string;
  targetRole: string | null;
  currentTitle: string | null;
  field: string | null;
  yearsExperience: number | null;
  skills: string | null;
  summary: string | null;
}): string {
  return [
    c.targetRole && `תפקיד מבוקש: ${c.targetRole}`,
    c.currentTitle && `תפקיד נוכחי: ${c.currentTitle}`,
    c.field && `תחומים: ${c.field}`,
    c.yearsExperience != null && `שנות ניסיון: ${c.yearsExperience}`,
    c.skills && `כישורים: ${c.skills}`,
    c.summary && `תקציר: ${c.summary}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendMatchEmail(opts: {
  to: string;
  name: string;
  matches: Array<{ job: JobLite; score: number }>;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const firstName = opts.name.split(" ")[0] || "";
  const label =
    opts.matches.length === 1
      ? "משרה שמתאימה לך"
      : `${opts.matches.length} משרות שמתאימות לך`;

  const rows = opts.matches
    .map(({ job }) => {
      const meta = [job.company, job.location, job.field].filter(Boolean).join(" · ");
      const url = job.externalUrl ?? `https://app.careerinfocus.co.il/jobs/${job.id}`;
      return `
      <tr><td style="padding:12px 0;border-bottom:1px solid #eee">
        <a href="${url}" style="color:#0d9488;font-weight:700;font-size:15px;text-decoration:none">${job.isHot ? "🔥 " : ""}${job.title}</a>
        ${meta ? `<div style="font-size:12px;color:#666;margin-top:4px">${meta}</div>` : ""}
      </td></tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html dir="rtl" lang="he"><body style="font-family:Arial,sans-serif;background:#fafafa;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #eee">
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-weight:900;color:#0d9488;font-size:22px">קריירה בפוקוס</div>
    </div>
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 6px 0">היי${firstName ? ` ${firstName}` : ""} 👋</h1>
    <p style="color:#475569;font-size:14px;margin:0 0 20px 0">
      עברתי על המאגר ומצאתי ${label} לפי התפקיד שאת/ה מחפש/ת. לחיצה על הכותרת מובילה ישירות להגשת מועמדות.
    </p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <div style="text-align:center;margin-top:24px">
      <a href="https://app.careerinfocus.co.il/jobs" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">לכל המשרות באתר</a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;line-height:1.6">
      קיבלתם את המייל הזה כי אתם רשומים במאגר המועמדים של קריירה בפוקוס.<br>
      קורל שלו · 053-5777005
    </p>
  </div>
</body></html>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: opts.to,
        subject: `🎯 ${firstName ? firstName + ", " : ""}נמצאה ${label} במאגר של קורל`,
        html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Match one candidate against the job pool. Pass preloaded `jobs` when
 * running in bulk so the pool is fetched once.
 */
export async function matchCandidateToJobs(
  candidateId: string,
  opts?: { notify?: boolean; jobs?: JobLite[]; aiBudget?: { remaining: number } },
): Promise<MatchRunResult> {
  const notify = opts?.notify ?? false;

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true, name: true, email: true, source: true,
      targetRole: true, currentTitle: true, field: true,
      yearsExperience: true, skills: true, summary: true,
      isActive: true,
    },
  });
  if (!candidate || !candidate.isActive) {
    return { candidateId, scored: 0, newMatches: 0, emailed: 0, skippedReason: "candidate missing or inactive" };
  }

  const jobs = opts?.jobs ?? (await loadMatchableJobs());

  // Free-tier signups: zero-token category matching. They picked
  // canonical categories in the /join dropdown; jobs carry free-form
  // fields — compare both in category space, write the pairs for the
  // admin screen, and send nothing (the daily digest emails them).
  const isFreeTierSignup = candidate.source === "הרשמה חינם ללוח משרות";
  if (isFreeTierSignup) {
    const categories = new Set(
      (candidate.field ?? "")
        .split(/[,;]+/)
        .map((f) => f.trim())
        .filter(Boolean)
        .map((f) => mapFieldToCategory(f)),
    );
    categories.delete("אחר");
    if (categories.size === 0) {
      return { candidateId, scored: 0, newMatches: 0, emailed: 0, skippedReason: "no categories" };
    }
    const inCategory = jobs
      .filter((j) => categories.has(mapFieldToCategory(j.field)))
      .sort((a, b) => Number(b.isHot) - Number(a.isHot))
      .slice(0, MAX_MATCHES_PER_RUN);
    if (inCategory.length === 0) {
      return { candidateId, scored: jobs.length, newMatches: 0, emailed: 0 };
    }
    const existingFree = await prisma.candidateMatch.findMany({
      where: { candidateId, jobId: { in: inCategory.map((j) => j.id) } },
      select: { jobId: true },
    });
    const seen = new Set(existingFree.map((e) => e.jobId));
    let created = 0;
    for (const job of inCategory) {
      if (seen.has(job.id)) continue;
      await prisma.candidateMatch.create({
        data: {
          candidateId,
          jobId: job.id,
          score: job.isHot ? 70 : 65,
          reasons: JSON.stringify([`תחום תואם: ${mapFieldToCategory(job.field)}`]),
        },
      }).catch(() => { /* unique-race — fine */ });
      created++;
    }
    return { candidateId, scored: jobs.length, newMatches: created, emailed: 0 };
  }

  // The title anchor is the whole point ("סנכרון בטייטל") — without a
  // target role or current title there is nothing trustworthy to
  // match on and every score would sit under the threshold anyway.
  const anchor = candidate.targetRole || candidate.currentTitle;
  if (!anchor) {
    return { candidateId, scored: 0, newMatches: 0, emailed: 0, skippedReason: "no target role/title" };
  }

  const profile = {
    targetRole: anchor,
    currentRole: candidate.currentTitle,
    desiredField: candidate.field,
    yearsExperience: candidate.yearsExperience,
    strengths: candidate.skills, // JSON array shape matches
  };

  const scored = jobs
    .map((job) => ({ job, result: matchJobToUser(job as MatchableJob, profile, null) }))
    .filter(({ result }) => result.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, MAX_MATCHES_PER_RUN);

  if (scored.length === 0) {
    return { candidateId, scored: jobs.length, newMatches: 0, emailed: 0 };
  }

  // Skip pairs that already exist so re-runs never duplicate or
  // re-email the same offer.
  const existing = await prisma.candidateMatch.findMany({
    where: { candidateId, jobId: { in: scored.map((s) => s.job.id) } },
    select: { jobId: true },
  });
  const existingJobIds = new Set(existing.map((e) => e.jobId));
  const fresh = scored.filter((s) => !existingJobIds.has(s.job.id));
  if (fresh.length === 0) {
    return { candidateId, scored: jobs.length, newMatches: 0, emailed: 0 };
  }

  // Mandatory-requirements verdicts for the best few (quota-capped).
  const blob = candidateProfileBlob(candidate);
  const verdicts = new Map<string, string | null>();
  const aiBudget = opts?.aiBudget ?? { remaining: MAX_AI_CHECKS };
  for (const s of fresh.slice(0, MAX_AI_CHECKS)) {
    if (aiBudget.remaining <= 0) break;
    aiBudget.remaining--;
    verdicts.set(s.job.id, await checkMandatoryRequirements(blob, s.job));
  }

  // A hard AI "no" excludes the pair from offers, but the row is still
  // persisted (status REJECTED) so the next run's dedupe skips it —
  // otherwise every nightly run would burn a Gemini call re-checking
  // the same rejected pair — and so Coral can see what was filtered.
  const kept: typeof fresh = [];
  for (const s of fresh) {
    const verdict = verdicts.get(s.job.id) ?? null;
    const rejected = (verdict ?? "").startsWith("לא עומד");
    if (!rejected) kept.push(s);
    await prisma.candidateMatch.create({
      data: {
        candidateId,
        jobId: s.job.id,
        score: s.result.score,
        reasons: JSON.stringify(s.result.reasons),
        requirementsCheck: verdict,
        status: rejected ? "REJECTED" : "NEW",
      },
    }).catch(() => { /* unique-race with a parallel run — fine */ });
  }

  let emailed = 0;
  if (notify && candidate.email) {
    // Pull pending offers from the DB, not from this run's list — this
    // retries rows stranded by a failed Resend call or created by a
    // notify:false backfill, and structurally can't re-email EMAILED
    // or REJECTED pairs.
    const pending = await prisma.candidateMatch.findMany({
      where: { candidateId, status: "NEW" },
      orderBy: { score: "desc" },
      take: MAX_JOBS_PER_EMAIL,
      select: { jobId: true, score: true },
    });
    const jobById = new Map(jobs.map((j) => [j.id, j]));
    const toEmail = pending
      .map((p) => ({ job: jobById.get(p.jobId), score: p.score }))
      .filter((m): m is { job: JobLite; score: number } => !!m.job);
    if (toEmail.length > 0) {
      const ok = await sendMatchEmail({ to: candidate.email, name: candidate.name, matches: toEmail });
      if (ok) {
        emailed = toEmail.length;
        await prisma.candidateMatch.updateMany({
          where: { candidateId, jobId: { in: toEmail.map((m) => m.job.id) } },
          data: { status: "EMAILED", emailedAt: new Date() },
        }).catch(() => { /* email went out; status catches up next run */ });
      }
    }
  }

  return { candidateId, scored: jobs.length, newMatches: kept.length, emailed };
}

/**
 * Bulk entry point — match every candidate created since `sinceHours`
 * ago (used by the nightly cron catch-up and the admin backfill).
 */
export async function matchRecentCandidates(opts: {
  sinceHours: number;
  notify: boolean;
  limit?: number;
}): Promise<{ candidates: number; results: MatchRunResult[] }> {
  const since = new Date(Date.now() - opts.sinceHours * 60 * 60 * 1000);
  const recent = await prisma.candidate.findMany({
    where: { createdAt: { gte: since }, isActive: true },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 200,
  });
  if (recent.length === 0) return { candidates: 0, results: [] };

  const jobs = await loadMatchableJobs();
  const results: MatchRunResult[] = [];
  // Stay well inside Vercel's 300s function cap — whatever doesn't fit
  // this run is picked up by the next nightly run (dedupe makes that
  // safe). The AI budget bounds worst-case Gemini latency per run.
  const deadline = Date.now() + 220_000;
  const aiBudget = { remaining: 30 };
  for (const c of recent) {
    if (Date.now() > deadline) break;
    try {
      results.push(await matchCandidateToJobs(c.id, { notify: opts.notify, jobs, aiBudget }));
    } catch (e) {
      results.push({
        candidateId: c.id, scored: 0, newMatches: 0, emailed: 0,
        skippedReason: e instanceof Error ? e.message.slice(0, 80) : "error",
      });
    }
  }
  return { candidates: recent.length, results };
}
