"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
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
import { TRAINEES } from "@/lib/imports/trainees-roster";

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

// ─── Bulk create / repair all trainees at once ────────────────────────────
// For each trainee on the roster:
//   • If user doesn't exist → create them with the password we emailed them
//   • If user exists but can't log in (no passwordHash, or status != ACTIVE)
//     → fix the password and unlock the account
//   • If user exists and is fine → skip
//
// Idempotent and safe to re-run.

export interface BulkResult {
  ok: boolean;
  created: number;
  repaired: number;
  alreadyOk: number;
  total: number;
  details: Array<{ email: string; action: "created" | "repaired" | "ok" | "error"; message?: string }>;
}

// ─── Diagnostic — does this user exist & can they log in? ─────────────────
export interface DiagnoseResult {
  emailLookedUp:    string;
  userExists:       boolean;
  hasPasswordHash:  boolean;
  accessStatus:     string | null;
  membershipType:   string | null;
  role:             string | null;
  passwordMatches:  boolean | null;   // null when no password supplied
  verdict:          "OK_CAN_LOGIN" | "USER_MISSING" | "NO_PASSWORD" | "WRONG_PASSWORD" | "NOT_ACTIVE" | "OTHER";
  hint:             string;
}

export async function diagnoseLogin(
  email: string,
  password?: string,
): Promise<DiagnoseResult> {
  await requireAdmin();

  const lookup = (email ?? "").toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: lookup } });

  if (!user) {
    return {
      emailLookedUp:   lookup,
      userExists:      false,
      hasPasswordHash: false,
      accessStatus:    null,
      membershipType:  null,
      role:            null,
      passwordMatches: null,
      verdict:         "USER_MISSING",
      hint:            "המשתמשת לא קיימת במאגר. הריצי /admin/create-trainees כדי ליצור.",
    };
  }

  if (!user.passwordHash) {
    return {
      emailLookedUp:   lookup,
      userExists:      true,
      hasPasswordHash: false,
      accessStatus:    user.accessStatus,
      membershipType:  user.membershipType,
      role:            user.role,
      passwordMatches: null,
      verdict:         "NO_PASSWORD",
      hint:            "המשתמשת קיימת אבל אין לה סיסמה. /admin/create-trainees יתקן.",
    };
  }

  let passwordMatches: boolean | null = null;
  if (password) {
    passwordMatches = await bcrypt.compare(password.trim(), user.passwordHash);
  }

  if (password && !passwordMatches) {
    return {
      emailLookedUp:   lookup,
      userExists:      true,
      hasPasswordHash: true,
      accessStatus:    user.accessStatus,
      membershipType:  user.membershipType,
      role:            user.role,
      passwordMatches: false,
      verdict:         "WRONG_PASSWORD",
      hint:            "הסיסמה שהוקלדה לא תואמת. /admin/create-trainees יאפס לסיסמה הסטנדרטית.",
    };
  }

  if (user.accessStatus !== "ACTIVE") {
    return {
      emailLookedUp:   lookup,
      userExists:      true,
      hasPasswordHash: true,
      accessStatus:    user.accessStatus,
      membershipType:  user.membershipType,
      role:            user.role,
      passwordMatches,
      verdict:         "NOT_ACTIVE",
      hint:            `המשתמשת קיימת אבל הסטטוס שלה הוא ${user.accessStatus}. /admin/create-trainees יתקן ל-ACTIVE.`,
    };
  }

  return {
    emailLookedUp:   lookup,
    userExists:      true,
    hasPasswordHash: true,
    accessStatus:    user.accessStatus,
    membershipType:  user.membershipType,
    role:            user.role,
    passwordMatches,
    verdict:         "OK_CAN_LOGIN",
    hint:            password
      ? "הכל תקין — אם עדיין לא מתחבר, סביר שהבעיה בדפדפן (cookies / cache)."
      : "המשתמשת קיימת ויכולה להתחבר. תזיני סיסמה כדי לבדוק האם הסיסמה הנכונה.",
  };
}

export async function bulkCreateTrainees(): Promise<BulkResult> {
  await requireAdmin();

  let created = 0;
  let repaired = 0;
  let alreadyOk = 0;
  const details: BulkResult["details"] = [];

  for (const t of TRAINEES) {
    const email = t.email.toLowerCase().trim();
    try {
      const passwordHash = await bcrypt.hash(t.password, 12);
      const existing = await prisma.user.findUnique({ where: { email } });

      if (!existing) {
        await prisma.user.create({
          data: {
            name:            t.name,
            email,
            passwordHash,
            role:            "MEMBER",
            accessStatus:    "ACTIVE",
            membershipType:  "PREMIUM" as never,
            paymentProvider: "MANUAL",
            paidAt:          new Date(),
          },
        });
        created++;
        details.push({ email, action: "created" });
      } else if (
        !existing.passwordHash ||
        existing.accessStatus !== "ACTIVE"
      ) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            accessStatus:   "ACTIVE",
            // only fill name if it was empty — don't clobber a name the user updated
            ...(existing.name ? {} : { name: t.name }),
            ...(existing.membershipType ? {} : { membershipType: "PREMIUM" as never }),
          },
        });
        repaired++;
        details.push({ email, action: "repaired" });
      } else {
        alreadyOk++;
        details.push({ email, action: "ok" });
      }
    } catch (e) {
      details.push({
        email,
        action: "error",
        message: e instanceof Error ? e.message : "שגיאה לא ידועה",
      });
    }
  }

  return {
    ok:        true,
    created,
    repaired,
    alreadyOk,
    total:     TRAINEES.length,
    details,
  };
}
