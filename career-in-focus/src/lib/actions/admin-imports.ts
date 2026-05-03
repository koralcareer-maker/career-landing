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
import {
  YONI_EMAIL,
  YONI_FULL_NAME,
  YONI_TARGET_ROLE,
  YONI_APPLICATIONS,
} from "@/lib/imports/yoni-data";

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

interface ApplicationRow {
  dateApplied: string;
  source: string;
  company: string;
  role: string;
  jobLink?: string;
  notes?: string;
  status?: string;
}

interface ImportConfig {
  email:        string;
  fullName:     string;
  phone?:       string;
  targetRole?:  string;
  photoUrl?:    string;
  cvUrl?:       string;
  applications: ApplicationRow[];
}

// ─── Generic importer — used by all per-client server actions ─────────────
async function runClientImport(cfg: ImportConfig): Promise<ImportResult> {
  // 1. Find the user
  const user = await prisma.user.findUnique({
    where:   { email: cfg.email },
    include: { profile: true },
  });
  if (!user) {
    return {
      ok: false,
      message: `לא מצאתי משתמשת עם המייל ${cfg.email} — קודם תיצרי אותה ב-/admin/users.`,
    };
  }

  // 2. Set profile photo on the User row (NextAuth uses User.image for the avatar)
  if (cfg.photoUrl) {
    await prisma.user.update({
      where: { id: user.id },
      data:  { image: cfg.photoUrl },
    });
  }

  // 3. Upsert the Profile
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      fullName:   cfg.fullName,
      ...(cfg.phone      ? { phone: cfg.phone } : {}),
      ...(cfg.targetRole ? { targetRole: cfg.targetRole } : {}),
      ...(cfg.cvUrl      ? { resumeUrl: cfg.cvUrl } : {}),
      ...(cfg.photoUrl   ? { imageUrl: cfg.photoUrl } : {}),
    },
    create: {
      userId:     user.id,
      fullName:   cfg.fullName,
      phone:      cfg.phone,
      targetRole: cfg.targetRole,
      resumeUrl:  cfg.cvUrl,
      imageUrl:   cfg.photoUrl,
    },
  });

  // 4. Insert applications — skip duplicates (matched on company+role+date)
  const existing = await prisma.jobApplication.findMany({
    where:  { userId: user.id },
    select: { company: true, role: true, dateApplied: true },
  });
  const existingKey = new Set(
    existing.map((a) =>
      `${(a.company ?? "").trim()}::${(a.role ?? "").trim()}::${
        a.dateApplied?.toISOString().slice(0, 10) ?? ""
      }`,
    ),
  );

  let created = 0;
  let skipped = 0;

  for (const app of cfg.applications) {
    const key = `${app.company.trim()}::${app.role.trim()}::${app.dateApplied}`;
    if (existingKey.has(key)) { skipped++; continue; }

    await prisma.jobApplication.create({
      data: {
        userId:      user.id,
        company:     app.company,
        role:        app.role,
        dateApplied: new Date(app.dateApplied),
        source:      app.source,
        jobLink:     app.jobLink ?? null,
        notes:       app.notes ?? null,
        status:      (app.status ?? "APPLIED") as never,
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
      photoSet:            !!cfg.photoUrl,
      cvSet:               !!cfg.cvUrl,
      applicationsCreated: created,
      applicationsSkipped: skipped,
    },
  };
}

// ─── Per-client wrappers ──────────────────────────────────────────────────

export async function importRachelliData(): Promise<ImportResult> {
  await requireAdmin();
  return runClientImport({
    email:        RACHELLI_EMAIL,
    fullName:     RACHELLI_FULL_NAME,
    phone:        RACHELLI_PHONE,
    targetRole:   RACHELLI_TARGET_ROLE,
    photoUrl:     RACHELLI_PHOTO_URL,
    cvUrl:        RACHELLI_CV_URL,
    applications: RACHELLI_APPLICATIONS,
  });
}

export async function importYoniData(): Promise<ImportResult> {
  await requireAdmin();
  return runClientImport({
    email:        YONI_EMAIL,
    fullName:     YONI_FULL_NAME,
    targetRole:   YONI_TARGET_ROLE,
    // no photo or CV in his Drive folder yet — only profile + applications.
    applications: YONI_APPLICATIONS,
  });
}
