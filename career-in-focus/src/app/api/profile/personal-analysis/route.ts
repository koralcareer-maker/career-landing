/**
 * POST /api/profile/personal-analysis
 *
 * Generates a fresh numerology + career-psychology analysis for the
 * currently logged-in user. Pulls birthDate + birthPlace from Profile,
 * calls Claude via lib/personal-analysis, caches the result on the
 * Profile row, and copies the role recommendations into the user's
 * CareerPassport.likelyFitRoles so the job-matching score on /jobs
 * picks them up immediately.
 *
 * The route is intentionally idempotent-by-overwrite: each call burns
 * one LLM credit and replaces the cached analysis. Frontend gates it
 * behind an explicit "צרי ניתוח" button so we don't burn credit on
 * every page load.
 *
 * Body: optional JSON `{ birthDate, birthPlace }` to update those
 * fields in-place before generating. Useful for the modal where the
 * user fills both fields and hits generate in one go.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  generatePersonalAnalysis,
  PersonalAnalysisError,
} from "@/lib/personal-analysis";

export const runtime = "nodejs";
// Claude can take 30–60s for a full structured Hebrew response.
// 300s gives plenty of head-room without blowing the plan's max.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pick up the (optional) inline form data — the modal sends both
  // fields with the click, so the user doesn't have to "save profile"
  // separately.
  let inline: { birthDate?: string; birthPlace?: string } = {};
  try {
    inline = (await req.json().catch(() => ({}))) as typeof inline;
  } catch {
    inline = {};
  }

  // Apply inline updates if present, then load the canonical profile.
  if (inline.birthDate || inline.birthPlace) {
    await prisma.profile.update({
      where: { userId },
      data: {
        ...(inline.birthDate ? { birthDate: new Date(inline.birthDate) } : {}),
        ...(inline.birthPlace ? { birthPlace: inline.birthPlace.trim() } : {}),
      },
    });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      fullName: true,
      currentRole: true,
      targetRole: true,
      birthDate: true,
      birthPlace: true,
    },
  });

  if (!profile?.birthDate) {
    return NextResponse.json(
      { error: "missing-birth-date", message: "תאריך לידה דרוש כדי ליצור ניתוח אישי" },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await generatePersonalAnalysis({
      birthDate: profile.birthDate,
      birthPlace: profile.birthPlace,
      fullName: profile.fullName,
      currentRole: profile.currentRole,
      targetRole: profile.targetRole,
    });
  } catch (e) {
    if (e instanceof PersonalAnalysisError) {
      const status = e.code === "no-key" ? 503 : e.code === "bad-input" ? 400 : 502;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    throw e;
  }

  // Cache the result on the profile.
  const now = new Date();
  await prisma.profile.update({
    where: { userId },
    data: {
      personalAnalysis: JSON.stringify(result),
      personalAnalysisAt: now,
    },
  });

  // Push the role recommendations into the user's CareerPassport so the
  // matching score and dashboard "fit roles" panel pick them up. Merge
  // with any AI-generated likelyFitRoles already there — we don't want
  // the personal-analysis to wipe the AI passport's recommendations.
  if (result.recommendedRoles.length > 0) {
    const passport = await prisma.careerPassport.findUnique({
      where: { userId },
      select: { id: true, likelyFitRoles: true },
    });
    const existing: string[] = passport?.likelyFitRoles
      ? safeJsonArray(passport.likelyFitRoles)
      : [];
    const merged = Array.from(
      new Set([...result.recommendedRoles, ...existing].map((r) => r.trim()).filter(Boolean)),
    );
    if (passport) {
      await prisma.careerPassport.update({
        where: { userId },
        data: { likelyFitRoles: JSON.stringify(merged), updatedAt: now },
      });
    } else {
      // No passport yet — create a minimal one carrying the roles. The
      // user can still run the full AI-passport generator later; it
      // will overwrite with richer data.
      await prisma.careerPassport.create({
        data: {
          userId,
          likelyFitRoles: JSON.stringify(merged),
        },
      });
    }
  }

  return NextResponse.json({ ok: true, analysis: result, generatedAt: now });
}

function safeJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}
