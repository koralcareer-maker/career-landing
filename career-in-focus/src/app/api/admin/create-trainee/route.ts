/**
 * POST /api/admin/create-trainee
 *
 * Provision a single coaching trainee as a full-access platform user —
 * the same shape bulkCreateTrainees produces (role MEMBER,
 * accessStatus ACTIVE, membershipType PREMIUM, paymentProvider MANUAL),
 * but for one new person at a time instead of the hardcoded roster.
 *
 * Body: { name, email, gender?: "f"|"m", targetRole?, phone?,
 *         password?, sendEmail?: boolean }
 *
 * - password defaults to "<Firstname>Koral2026!" (the roster pattern);
 *   a Hebrew first name falls back to "TraineeKoral2026!".
 * - creates or repairs the User (idempotent by email), upserts a
 *   Profile with targetRole/phone so the /jobs board can personalise
 *   matches for them, and optionally emails the welcome + credentials.
 *
 * Returns the email + password so the operator can hand them over.
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function defaultPassword(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  // Use the Latin first name if the roster convention applies; Hebrew
  // names have no clean Latin form here, so fall back to a fixed base.
  const latin = /^[A-Za-z]+$/.test(first) ? first : "Trainee";
  return `${latin}Koral2026!`;
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    gender?: "f" | "m";
    targetRole?: string;
    phone?: string;
    password?: string;
    sendEmail?: boolean;
  } | null;

  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "name + valid email required" }, { status: 400 });
  }
  const gender = body?.gender === "m" ? "m" : "f";
  const password = body?.password?.trim() || defaultPassword(name);
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  let action: "created" | "repaired";
  let userId: string;
  if (!existing) {
    const u = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        gender,
        role: "MEMBER",
        accessStatus: "ACTIVE",
        membershipType: "PREMIUM" as never,
        paymentProvider: "MANUAL",
        paidAt: new Date(),
      },
      select: { id: true },
    });
    userId = u.id;
    action = "created";
  } else {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        accessStatus: "ACTIVE",
        gender,
        ...(existing.name ? {} : { name }),
        ...(existing.membershipType ? {} : { membershipType: "PREMIUM" as never }),
      },
    });
    userId = existing.id;
    action = "repaired";
  }

  // Profile so the board personalises job matches for the trainee.
  if (body?.targetRole || body?.phone) {
    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        ...(body.targetRole ? { targetRole: body.targetRole } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
      },
      update: {
        ...(body.targetRole ? { targetRole: body.targetRole } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
      },
    });
  }

  let emailed = false;
  if (body?.sendEmail) {
    try {
      await sendWelcomeEmail({ name, email, membershipType: "PREMIUM", password, gender });
      emailed = true;
    } catch {
      emailed = false;
    }
  }

  return NextResponse.json({
    ok: true,
    action,
    email,
    password,
    emailed,
  });
}
