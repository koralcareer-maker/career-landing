"use server";

import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { matchCandidateToJobs } from "@/lib/candidate-matching";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

/**
 * FREE-tier signup — the "join" flow linked from Coral's Instagram
 * stories. Creates a User (FREE tier, no payment) + a Candidate row
 * so the person also shows up in Coral's talent pool. On success the
 * user is auto-signed-in and dropped straight into /jobs.
 *
 * The candidate.field carries the comma-joined list of fields the
 * user picked at signup — that's what the daily-digest cron matches
 * against when picking new jobs to email them.
 */

const JoinSchema = z.object({
  name:   z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  email:  z.string().email("כתובת אימייל לא תקינה"),
  phone:  z.string().min(9, "מספר טלפון לא תקין"),
  fields: z.string().min(1, "יש לבחור לפחות תחום אחד"),
  gender: z.enum(["f", "m"]).optional(),
});

// Auto-generated password so the account exists in the auth system
// (NextAuth's Credentials provider needs *some* passwordHash). The
// user never types this — they land on /jobs already signed-in via
// the server action's signIn call. If they want to log in again from
// another device we send them a magic reset link.
function randomPassword() {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10).toUpperCase() +
    "!"
  );
}

function makeReferralCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function joinJobBoard(prevState: unknown, formData: FormData) {
  const raw = {
    name:   (formData.get("name")   as string) ?? "",
    email:  (formData.get("email")  as string) ?? "",
    phone:  (formData.get("phone")  as string) ?? "",
    fields: (formData.get("fields") as string) ?? "",
    gender: ((formData.get("gender") as string) || undefined) as "f" | "m" | undefined,
  };

  const parsed = JoinSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, phone, fields, gender } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();
  // Comma-joined string in the DB (`Candidate.field` uses the same
  // shape when the operator multi-selects) — split on the client when
  // the daily digest needs the individual field names.
  const fieldList = fields
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  const fieldsForDb = fieldList.join(", ");

  const password = randomPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  // Case 1 — a real paid account already exists → bounce to login.
  // Case 2 — an unfinished / placeholder row → claim it as FREE and
  //          overwrite the fields; keep the id / referralCode intact.
  // Case 3 — brand new email → create both User + Candidate rows.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const hasPassword = !!existing.passwordHash;
    const hasPaid = !!existing.paidAt;
    if (hasPassword && hasPaid) {
      return {
        error:
          "אימייל זה כבר רשום במערכת. אם זה החשבון שלכם, נסו להתחבר עם הסיסמה שלכם.",
      };
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        passwordHash,
        gender,
        accessStatus: "ACTIVE",
        membershipType: "NONE",
        subscriptionStatus: "FREE",
      },
    });
  } else {
    let referralCode = makeReferralCode();
    try {
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          gender,
          role: "MEMBER",
          accessStatus: "ACTIVE",
          membershipType: "NONE",
          subscriptionStatus: "FREE",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...({ referralCode } as any),
        },
      });
    } catch {
      // referralCode collision — retry once with a fresh code.
      referralCode = makeReferralCode();
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          gender,
          role: "MEMBER",
          accessStatus: "ACTIVE",
          membershipType: "NONE",
          subscriptionStatus: "FREE",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...({ referralCode } as any),
        },
      });
    }
  }

  // Also stash them in the Candidate pool so Coral can see them in
  // /admin/candidates — same table she uses for paid leads. Dedupe by
  // email so re-signups don't create duplicates.
  const existingCand = await prisma.candidate.findFirst({
    where: { email },
    select: { id: true },
  });
  const candData = {
    name,
    email,
    phone,
    field: fieldsForDb,
    source: "הרשמה חינם ללוח משרות",
    sourceRef: email,
  };
  let candidateId: string;
  if (existingCand) {
    await prisma.candidate.update({ where: { id: existingCand.id }, data: candData });
    candidateId = existingCand.id;
  } else {
    const created = await prisma.candidate.create({ data: candData, select: { id: true } });
    candidateId = created.id;
  }

  // Auto-matcher — runs after the response is sent so it never slows
  // the signup. Finds title-matched jobs, emails the candidate their
  // offers, and surfaces the pairs on Coral's /admin/matches screen.
  after(async () => {
    try {
      await matchCandidateToJobs(candidateId, { notify: true });
    } catch (e) {
      console.warn("[join] matcher failed:", e instanceof Error ? e.message : e);
    }
  });

  // Auto sign-in so they land on /jobs already logged in. Same trick
  // as the paid signup — redirect:false + relative redirect below.
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch {
    // If auto sign-in fails they can still log in later — the login
    // page has a forgot-password link that emails a reset URL.
  }

  redirect("/jobs?welcome=1");
}
