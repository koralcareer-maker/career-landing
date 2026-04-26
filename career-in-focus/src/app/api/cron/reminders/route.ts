import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEventReminder, sendWeeklyDigest } from "@/lib/email/resend";
import { generateWeeklyAnalysis } from "@/lib/actions/coaching";
import { getReadinessScore } from "@/lib/utils";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://careerinfocus.co.il";

// Called by Vercel Cron — secured by CRON_SECRET
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "events";
  const results: string[] = [];

  // ── Event reminders ──────────────────────────────────────────────────────────
  if (type === "events") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const events = await prisma.event.findMany({
      where: { isPublished: true, startAt: { gte: tomorrow, lt: dayAfter } },
    });

    const users = await prisma.user.findMany({
      where: { accessStatus: "ACTIVE" },
      select: { id: true, email: true, name: true },
    });

    for (const event of events) {
      for (const user of users) {
        try {
          await sendEventReminder({
            to: user.email,
            name: user.name?.split(" ")[0] ?? "חבר",
            eventTitle: event.title,
            eventDate: new Date(event.startAt).toLocaleString("he-IL", {
              weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"
            }),
            isOnline: event.isOnline,
            location: event.location ?? undefined,
            appUrl: APP_URL,
          });
          results.push(`✅ Event reminder → ${user.email}`);
        } catch (e) {
          results.push(`❌ Failed → ${user.email}: ${e}`);
        }
      }
    }
  }

  // ── Weekly digest ─────────────────────────────────────────────────────────────
  if (type === "weekly") {
    const users = await prisma.user.findMany({
      where: { accessStatus: "ACTIVE" },
      select: { id: true, email: true, name: true, profile: true },
    });

    for (const user of users) {
      try {
        const { analysis, actionItems } = await generateWeeklyAnalysis(user.id);

        // Save analysis to coaching session
        await prisma.coachingSession.upsert({
          where: { userId: user.id },
          create: { userId: user.id, messages: "[]", lastAnalysis: analysis, analyzedAt: new Date() },
          update: { lastAnalysis: analysis, analyzedAt: new Date() },
        });

        await sendWeeklyDigest({
          to: user.email,
          name: user.name?.split(" ")[0] ?? "חבר",
          analysis,
          actionItems,
          appUrl: APP_URL,
        });

        results.push(`✅ Weekly digest → ${user.email}`);
      } catch (e) {
        results.push(`❌ Failed → ${user.email}: ${e}`);
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
