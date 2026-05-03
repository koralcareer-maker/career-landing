"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  RACHELLI_EMAIL,
  RACHELLI_FULL_NAME,
  RACHELLI_PHONE,
  RACHELLI_TARGET_ROLE,
  RACHELLI_PHOTO_URL,
  RACHELLI_CV_URL,
  RACHELLI_APPLICATIONS,
} from "@/lib/imports/rachelli-data";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("אין הרשאה");
  }
  return session!;
}

export interface ImportResult {
  ok: boolean;
  message: string;
  details?: {
    userFound: boolean;
    profileUpdated: boolean;
    photoSet: boolean;
    cvSet: boolean;
    applicationsCreated: number;
    applicationsSkipped: number;
  };
}

// ─── One-shot importer for Rachelli's data ────────────────────────────────
// Idempotent: looks up the user by email, fills missing profile fields,
// and inserts only applications that don't already exist (matched on
// company + role + dateApplied so re-running is safe).

export async function importRachelliData(): Promise<ImportResult> {
  await requireAdmin();

  // 1. Find Rachelli's user
  const user = await prisma.user.findUnique({
    where: { email: RACHELLI_EMAIL },
    include: { profile: true },
  });
  if (!user) {
    return {
      ok: false,
      message: `לא מצאתי משתמשת עם המייל ${RACHELLI_EMAIL} — קודם תיצרי אותה ב-/admin/users.`,
    };
  }

  // 2. Set the photo on the User row (NextAuth uses User.image for the avatar)
  await prisma.user.update({
    where: { id: user.id },
    data: { image: RACHELLI_PHOTO_URL },
  });

  // 3. Upsert the Profile with name, phone, target role, CV, photo
  await prisma.profile.upsert({
    where:  { userId: user.id },
    update: {
      fullName:   RACHELLI_FULL_NAME,
      phone:      RACHELLI_PHONE,
      targetRole: RACHELLI_TARGET_ROLE,
      resumeUrl:  RACHELLI_CV_URL,
      imageUrl:   RACHELLI_PHOTO_URL,
    },
    create: {
      userId:     user.id,
      fullName:   RACHELLI_FULL_NAME,
      phone:      RACHELLI_PHONE,
      targetRole: RACHELLI_TARGET_ROLE,
      resumeUrl:  RACHELLI_CV_URL,
      imageUrl:   RACHELLI_PHOTO_URL,
    },
  });

  // 4. Insert applications — skip duplicates
  const existing = await prisma.jobApplication.findMany({
    where: { userId: user.id },
    select: { company: true, role: true, dateApplied: true },
  });
  const existingKey = new Set(
    existing.map((a) =>
      `${(a.company ?? "").trim()}::${(a.role ?? "").trim()}::${
        a.dateApplied?.toISOString().slice(0, 10) ?? ""
      }`,
    ),
  );

  let created  = 0;
  let skipped  = 0;

  for (const app of RACHELLI_APPLICATIONS) {
    const key = `${app.company.trim()}::${app.role.trim()}::${app.dateApplied}`;
    if (existingKey.has(key)) {
      skipped++;
      continue;
    }

    await prisma.jobApplication.create({
      data: {
        userId:      user.id,
        company:     app.company,
        role:        app.role,
        dateApplied: new Date(app.dateApplied),
        source:      app.source,
        jobLink:     app.jobLink ?? null,
        notes:       app.notes ?? null,
        status:      app.status ?? "APPLIED",
      },
    });
    created++;
  }

  return {
    ok: true,
    message: `הייבוא הושלם — ${created} משרות נוספו, ${skipped} כבר היו קיימות.`,
    details: {
      userFound:           true,
      profileUpdated:      true,
      photoSet:            true,
      cvSet:               true,
      applicationsCreated: created,
      applicationsSkipped: skipped,
    },
  };
}
