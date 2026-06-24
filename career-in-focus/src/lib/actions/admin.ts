"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email";
import { IMPERSONATE_COOKIE, signImpersonationToken } from "@/lib/impersonation";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

/**
 * Send the same in-app notification to every active member.
 *
 * Coral wants users notified on any platform change — new content,
 * new feature, edit to a published announcement. This helper unifies
 * the broadcast (the bell icon in TopBar reads the Notification
 * table). Best-effort: a write failure here doesn't bubble back to
 * the admin who's creating content.
 *
 * `type` is the existing Notification.type union: "update", "event",
 * "course", "tool", "feature", "general".
 */
async function notifyAllActiveMembers(notification: {
  type: string;
  title: string;
  message: string;
  link?: string | null;
  refId?: string | null;
}): Promise<void> {
  try {
    const members = await prisma.user.findMany({
      where: {
        accessStatus: "ACTIVE",
        // Skip users who turned notifications off in their settings.
        notificationsEnabled: true,
      },
      select: { id: true },
    });
    if (members.length === 0) return;
    await prisma.notification.createMany({
      data: members.map((m) => ({
        userId:  m.id,
        type:    notification.type,
        title:   notification.title,
        message: notification.message.slice(0, 240),
        link:    notification.link ?? undefined,
        refId:   notification.refId ?? undefined,
      })),
    });
  } catch (e) {
    console.warn("[admin] notifyAllActiveMembers failed:", e);
  }
}

// ── Jobs ────────────────────────────────────────────────────────────────────

export async function createJob(formData: FormData) {
  const admin = await requireAdmin();
  await prisma.job.create({
    data: {
      title:           formData.get("title") as string,
      company:         formData.get("company") as string,
      companyLogo:     formData.get("companyLogo") as string || undefined,
      summary:         formData.get("summary") as string || undefined,
      description:     formData.get("description") as string || undefined,
      location:        formData.get("location") as string || undefined,
      field:           formData.get("field") as string || undefined,
      experienceLevel: formData.get("experienceLevel") as string || undefined,
      source:          formData.get("source") as string || undefined,
      externalUrl:     formData.get("externalUrl") as string || undefined,
      isHot:           formData.get("isHot") === "on",
      isPublished:     formData.get("isPublished") === "on",
      createdById:     admin.id,
    },
  });
  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
  redirect("/admin/jobs");
}

export async function updateJob(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.job.update({
    where: { id },
    data: {
      title:           formData.get("title") as string,
      company:         formData.get("company") as string,
      companyLogo:     formData.get("companyLogo") as string || undefined,
      summary:         formData.get("summary") as string || undefined,
      description:     formData.get("description") as string || undefined,
      location:        formData.get("location") as string || undefined,
      field:           formData.get("field") as string || undefined,
      experienceLevel: formData.get("experienceLevel") as string || undefined,
      source:          formData.get("source") as string || undefined,
      externalUrl:     formData.get("externalUrl") as string || undefined,
      isHot:           formData.get("isHot") === "on",
      isPublished:     formData.get("isPublished") !== "off",
    },
  });
  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
  redirect("/admin/jobs");
}

export async function deleteJob(id: string) {
  await requireAdmin();
  await prisma.job.delete({ where: { id } });
  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
}

export async function toggleJobPublished(id: string, published: boolean) {
  await requireAdmin();
  await prisma.job.update({ where: { id }, data: { isPublished: published } });
  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
}

// ── Events ──────────────────────────────────────────────────────────────────

export async function createEvent(formData: FormData) {
  const admin = await requireAdmin();
  const isPublished = formData.get("isPublished") !== "off";
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const startAt = new Date(formData.get("startAt") as string);
  const event = await prisma.event.create({
    data: {
      title,
      description: description || undefined,
      type:        (formData.get("type") as string || "WEBINAR") as never,
      startAt,
      endAt:       formData.get("endAt") ? new Date(formData.get("endAt") as string) : undefined,
      location:    formData.get("location") as string || undefined,
      isOnline:    formData.get("isOnline") === "on",
      meetingUrl:  formData.get("meetingUrl") as string || undefined,
      registerUrl: formData.get("registerUrl") as string || undefined,
      isPublished,
      createdById: admin.id,
    },
  });
  if (isPublished) {
    await notifyAllActiveMembers({
      type:    "event",
      title:   `📅 אירוע חדש: ${title}`,
      message: `${startAt.toLocaleDateString("he-IL", { day: "numeric", month: "long" })}${description ? ` · ${description}` : ""}`,
      link:    "/events",
      refId:   event.id,
    });
  }
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/dashboard");
  redirect("/admin/events");
}

export async function updateEvent(id: string, formData: FormData) {
  await requireAdmin();
  const previous = await prisma.event.findUnique({
    where: { id }, select: { isPublished: true },
  });
  const willBePublished = formData.get("isPublished") !== "off";
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const startAt = new Date(formData.get("startAt") as string);
  await prisma.event.update({
    where: { id },
    data: {
      title,
      description: description || undefined,
      type:        (formData.get("type") as string || "WEBINAR") as never,
      startAt,
      endAt:       formData.get("endAt") ? new Date(formData.get("endAt") as string) : undefined,
      location:    formData.get("location") as string || undefined,
      isOnline:    formData.get("isOnline") === "on",
      meetingUrl:  formData.get("meetingUrl") as string || undefined,
      registerUrl: formData.get("registerUrl") as string || undefined,
      isPublished: willBePublished,
    },
  });
  if (willBePublished && !previous?.isPublished) {
    await notifyAllActiveMembers({
      type:    "event",
      title:   `📅 אירוע חדש: ${title}`,
      message: `${startAt.toLocaleDateString("he-IL", { day: "numeric", month: "long" })}${description ? ` · ${description}` : ""}`,
      link:    "/events",
      refId:   id,
    });
  }
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/dashboard");
  redirect("/admin/events");
}

export async function deleteEvent(id: string) {
  await requireAdmin();
  await prisma.event.delete({ where: { id } });
  revalidatePath("/admin/events");
  revalidatePath("/events");
}

// ── Updates ─────────────────────────────────────────────────────────────────

export async function createUpdate(formData: FormData) {
  const admin = await requireAdmin();
  const isPublished = formData.get("isPublished") !== "off";
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const update = await prisma.update.create({
    data: {
      title,
      content,
      category:    formData.get("category") as string || "general",
      isPinned:    formData.get("isPinned") === "on",
      isPublished,
      ctaText:     formData.get("ctaText") as string || undefined,
      ctaUrl:      formData.get("ctaUrl") as string || undefined,
      createdById: admin.id,
    },
  });
  if (isPublished) {
    await notifyAllActiveMembers({
      type:    "update",
      title:   `📰 ${title}`,
      message: content,
      link:    "/updates",
      refId:   update.id,
    });
  }
  revalidatePath("/admin/updates");
  revalidatePath("/updates");
  revalidatePath("/dashboard");
  redirect("/admin/updates");
}

export async function updateUpdate(id: string, formData: FormData) {
  await requireAdmin();
  // Read the previous state so we can detect a draft→published flip
  // and notify members only on that transition (not on cosmetic edits).
  const previous = await prisma.update.findUnique({
    where: { id },
    select: { isPublished: true },
  });
  const willBePublished = formData.get("isPublished") !== "off";
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  await prisma.update.update({
    where: { id },
    data: {
      title,
      content,
      category:    formData.get("category") as string || "general",
      isPinned:    formData.get("isPinned") === "on",
      isPublished: willBePublished,
      ctaText:     formData.get("ctaText") as string || undefined,
      ctaUrl:      formData.get("ctaUrl") as string || undefined,
    },
  });
  if (willBePublished && !previous?.isPublished) {
    await notifyAllActiveMembers({
      type:    "update",
      title:   `📰 ${title}`,
      message: content,
      link:    "/updates",
      refId:   id,
    });
  }
  revalidatePath("/admin/updates");
  revalidatePath("/updates");
  redirect("/admin/updates");
}

export async function deleteUpdate(id: string) {
  await requireAdmin();
  await prisma.update.delete({ where: { id } });
  revalidatePath("/admin/updates");
}

// ── Courses ─────────────────────────────────────────────────────────────────

export async function createCourse(formData: FormData) {
  const admin = await requireAdmin();
  const isPublished = formData.get("isPublished") !== "off";
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const course = await prisma.course.create({
    data: {
      title,
      description: description || undefined,
      category:   formData.get("category") as string || undefined,
      formatType: formData.get("formatType") as string || undefined,
      accessType: (formData.get("accessType") as string || "INCLUDED") as never,
      isPublished,
      ctaText:    formData.get("ctaText") as string || undefined,
      ctaUrl:     formData.get("ctaUrl") as string || undefined,
      createdById:admin.id,
    },
  });
  if (isPublished) {
    await notifyAllActiveMembers({
      type:    "course",
      title:   `📚 קורס חדש: ${title}`,
      message: description || "נוסף קורס חדש לספריית התכנים — שווה לבדוק.",
      link:    "/courses",
      refId:   course.id,
    });
  }
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect("/admin/courses");
}

export async function updateCourse(id: string, formData: FormData) {
  await requireAdmin();
  const previous = await prisma.course.findUnique({
    where: { id }, select: { isPublished: true },
  });
  const willBePublished = formData.get("isPublished") !== "off";
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  await prisma.course.update({
    where: { id },
    data: {
      title,
      description: description || undefined,
      category:    formData.get("category") as string || undefined,
      formatType:  formData.get("formatType") as string || undefined,
      accessType:  (formData.get("accessType") as string || "INCLUDED") as never,
      isPublished: willBePublished,
      ctaText:     formData.get("ctaText") as string || undefined,
      ctaUrl:      formData.get("ctaUrl") as string || undefined,
    },
  });
  if (willBePublished && !previous?.isPublished) {
    await notifyAllActiveMembers({
      type:    "course",
      title:   `📚 קורס חדש: ${title}`,
      message: description || "נוסף קורס חדש לספריית התכנים — שווה לבדוק.",
      link:    "/courses",
      refId:   id,
    });
  }
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect("/admin/courses");
}

export async function deleteCourse(id: string) {
  await requireAdmin();
  await prisma.course.delete({ where: { id } });
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
}

// ── Tools ────────────────────────────────────────────────────────────────────

export async function createTool(formData: FormData) {
  const admin = await requireAdmin();
  const isPublished = formData.get("isPublished") !== "off";
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const tool = await prisma.tool.create({
    data: {
      title,
      description: description || undefined,
      category:    formData.get("category") as string || undefined,
      type:        (formData.get("type") as string || "LINK") as never,
      externalUrl: formData.get("externalUrl") as string || undefined,
      adminTip:    formData.get("adminTip") as string || undefined,
      notes:       formData.get("notes") as string || undefined,
      targetRole:  formData.get("targetRole") as string || undefined,
      isPublished,
      createdById: admin.id,
    },
  });
  if (isPublished) {
    await notifyAllActiveMembers({
      type:    "tool",
      title:   `🛠️ כלי חדש בערכת הכלים: ${title}`,
      message: description || "נוסף כלי חדש שיעזור לך בחיפוש העבודה.",
      link:    "/tools",
      refId:   tool.id,
    });
  }
  revalidatePath("/admin/tools");
  revalidatePath("/tools");
  redirect("/admin/tools");
}

export async function updateTool(id: string, formData: FormData) {
  await requireAdmin();
  const previous = await prisma.tool.findUnique({
    where: { id }, select: { isPublished: true },
  });
  const willBePublished = formData.get("isPublished") !== "off";
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  await prisma.tool.update({
    where: { id },
    data: {
      title,
      description: description || undefined,
      category:    formData.get("category") as string || undefined,
      type:        (formData.get("type") as string || "LINK") as never,
      externalUrl: formData.get("externalUrl") as string || undefined,
      adminTip:    formData.get("adminTip") as string || undefined,
      notes:       formData.get("notes") as string || undefined,
      targetRole:  formData.get("targetRole") as string || undefined,
      isPublished: willBePublished,
    },
  });
  if (willBePublished && !previous?.isPublished) {
    await notifyAllActiveMembers({
      type:    "tool",
      title:   `🛠️ כלי חדש: ${title}`,
      message: description || "נוסף כלי חדש שיעזור לך בחיפוש העבודה.",
      link:    "/tools",
      refId:   id,
    });
  }
  revalidatePath("/admin/tools");
  revalidatePath("/tools");
  redirect("/admin/tools");
}

export async function deleteTool(id: string) {
  await requireAdmin();
  await prisma.tool.delete({ where: { id } });
  revalidatePath("/admin/tools");
  revalidatePath("/tools");
}

// ── Featured Candidate ───────────────────────────────────────────────────────

export async function setFeaturedCandidate(formData: FormData) {
  const admin = await requireAdmin();
  // Deactivate current
  await prisma.featuredCandidate.updateMany({ where: { isActive: true }, data: { isActive: false } });
  // Create new
  await prisma.featuredCandidate.create({
    data: {
      name:        formData.get("name") as string,
      targetRole:  formData.get("targetRole") as string,
      summary:     formData.get("summary") as string || undefined,
      strengths:   formData.get("strengths") as string || undefined,
      lookingFor:  formData.get("lookingFor") as string || undefined,
      imageUrl:    formData.get("imageUrl") as string || undefined,
      linkedinUrl: formData.get("linkedinUrl") as string || undefined,
      isActive:    true,
      weekOf:      new Date(),
      createdById: admin.id,
    },
  });
  revalidatePath("/admin/candidate");
  revalidatePath("/dashboard");
  redirect("/admin/candidate");
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function activateUser(id: string) {
  await requireAdmin();
  const user = await prisma.user.update({
    where: { id },
    data: { accessStatus: "ACTIVE", membershipType: "MEMBER", paymentProvider: "MANUAL", paidAt: new Date() },
    select: { name: true, email: true, membershipType: true, gender: true },
  });
  await prisma.notification.create({
    data: {
      userId:  id,
      type:    "general",
      title:   "החברות שלך אושרה!",
      message: "ברוכה הבאה לקהילה. יש לך עכשיו גישה מלאה לכל הפלטפורמה.",
      link:    "/dashboard",
    },
  });
  // Send welcome email (non-blocking)
  sendWelcomeEmail({
    name:           user.name ?? user.email,
    email:          user.email,
    membershipType: user.membershipType,
    gender:         user.gender === "m" ? "m" : "f",
  }).catch(console.error);
  revalidatePath("/admin/users");
}

export async function suspendUser(id: string) {
  await requireAdmin();
  await prisma.user.update({ where: { id }, data: { accessStatus: "SUSPENDED" } });
  revalidatePath("/admin/users");
}

/**
 * Hard-delete a user. Cascade rules in schema.prisma will remove their
 * Profile, JobApplications, EventRegistrations, etc. We block deleting
 * yourself or other admins so a stray click can't lock everyone out.
 */
export async function deleteUser(id: string) {
  const admin = await requireAdmin();
  if (id === admin.id) {
    throw new Error("לא ניתן למחוק את עצמך");
  }
  // Prevent collateral lockout — only SUPER_ADMIN can delete admins.
  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!target) return; // already gone — no-op
  if (
    (target.role === "ADMIN" || target.role === "SUPER_ADMIN") &&
    admin.role !== "SUPER_ADMIN"
  ) {
    throw new Error("רק סופר-אדמין יכול למחוק אדמינים");
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}

export async function setUserRole(id: string, role: string) {
  const admin = await requireAdmin();
  if (admin.role !== "SUPER_ADMIN") throw new Error("Only Super Admin can change roles");
  await prisma.user.update({ where: { id }, data: { role: role as never } });
  revalidatePath("/admin/users");
}

// ── Manual user creation (no payment required) ────────────────────────────────

// Generates an easy-to-read temporary password Coral can WhatsApp.
// Pattern: <Capitalised name fragment>Koral2026 — same shape as the
// passwords already in the trainee roster, so we stay consistent and
// easy to read aloud. Coral asked to drop the trailing "!" because
// users were misreading it / fat-fingering it on mobile keyboards.
function generateTempPassword(emailLocalPart: string): string {
  const cleaned = emailLocalPart.replace(/[^a-zA-Z]/g, "").slice(0, 8);
  const base = cleaned.length >= 3
    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
    : "User" + Math.floor(Math.random() * 900 + 100);
  return `${base}Koral2026`;
}

export async function createUserManually(prevState: unknown, formData: FormData) {
  await requireAdmin();

  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const name = (formData.get("name") as string)?.trim() ?? "";
  const phone = (formData.get("phone") as string)?.trim() ?? "";
  const rawPassword = (formData.get("password") as string)?.trim() ?? "";
  const membershipType = (formData.get("membershipType") as string) || "MEMBER";
  const genderRaw = (formData.get("gender") as string)?.trim() || "";
  const gender: "f" | "m" = genderRaw === "m" ? "m" : "f";

  if (!email || !name || !phone) {
    return { error: "שם, אימייל וטלפון הם שדות חובה" };
  }

  // Password auto-generates when the admin didn't type one — that's
  // the whole point of the "quick add" flow. Stays deterministic-ish
  // so Coral can predict what got generated if the email never arrives.
  const password = rawPassword || generateTempPassword(email.split("@")[0] ?? "user");

  // Check for existing user
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "כבר קיים משתמש עם האימייל הזה" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      gender,
      role: "MEMBER",
      accessStatus: "ACTIVE",
      membershipType: membershipType as never,
      paymentProvider: "MANUAL",
      paidAt: new Date(),
      // Stash the phone on a fresh Profile row so it shows up in the
      // member's profile screen and is available for CRM/follow-up.
      profile: {
        create: {
          fullName: name,
          phone,
        },
      },
    },
  });

  // Send welcome notification
  await prisma.notification.create({
    data: {
      userId:  user.id,
      type:    "general",
      title:   `ברוכה הבאה לקריירה בפוקוס! 🎉`,
      message: `היי ${name}! החשבון שלך נוצר. כניסה עם האימייל והסיסמה שקיבלת.`,
      link:    "/dashboard",
    },
  });

  // Send welcome email with login details (non-blocking)
  sendWelcomeEmail({
    name,
    email,
    membershipType,
    password,
    gender,
  }).catch(console.error);

  revalidatePath("/admin/users");
  // Returning `password` lets the client surface the credentials so
  // Coral can copy them straight into WhatsApp without waiting for the
  // email round-trip — and as a backup if the welcome email bounces.
  return { success: true, userId: user.id, email, password, name };
}

// ── Resend credentials / password reset ───────────────────────────────────────
// Coral's manual support flow: a member loses their welcome email or
// can't sign in. From /admin/users she clicks "send credentials" on
// the row, we mint a fresh temporary password, replace the hash in DB,
// fire the welcome-email template, and surface the new password back
// to her so she can also paste it into WhatsApp on the spot.

export async function resendCredentials(id: string) {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, gender: true, membershipType: true },
  });
  if (!user) {
    return { error: "המשתמש/ת לא נמצא/ה" };
  }

  const password = generateTempPassword(user.email.split("@")[0] ?? "user");
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  // Fire the welcome email so the member gets the password by email
  // even if WhatsApp/SMS isn't an option. Same template Coral already
  // sees for new users — keeps the experience consistent.
  await sendWelcomeEmail({
    name:           user.name ?? user.email,
    email:          user.email,
    password,
    membershipType: user.membershipType,
    gender:         (user.gender === "m" ? "m" : "f"),
  }).catch(console.error);

  // Drop a notification too — if they're already logged in elsewhere,
  // the bell badge surfaces "we just reset your password".
  await prisma.notification.create({
    data: {
      userId:  user.id,
      type:    "general",
      title:   "פרטי כניסה חדשים",
      message: `שלחנו לך מייל עם סיסמה זמנית חדשה (${password}). התחבר/י איתה ואז שני/ה אותה ב'אבטחה'.`,
      link:    "/dashboard",
    },
  });

  revalidatePath("/admin/users");
  return { success: true, email: user.email, password, name: user.name ?? user.email };
}

// ── Impersonate a user ("view as") ────────────────────────────────────────────
// Coral wants to click a member's row and see exactly what they see —
// dashboard, jobs, profile, the works — so she can spot dead ends and
// answer "what's broken for X" questions without asking the member.
//
// Implementation: an HMAC-signed cookie carrying the target userId.
// The jwt callback in auth.ts swaps the session identity to that user
// when the cookie is present AND the underlying token is admin. To
// stop, we clear the cookie. The original admin id is stashed on the
// token as `impersonatedByAdminId` so the banner can revert cleanly.

export async function impersonateUser(targetUserId: string) {
  await requireAdmin();

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true },
  });
  if (!target) {
    throw new Error("המשתמש/ת לא נמצא/ה");
  }

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, signImpersonationToken(target.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours — long enough for a debug session, short enough to time out automatically
  });

  redirect("/dashboard");
}

export async function stopImpersonating() {
  // No admin guard — anyone "trapped" in an impersonated session
  // (e.g. session hung after the admin cookie rotated) should always
  // be able to clear it. Worst case for a random member: they clear
  // a cookie they don't have, no-op.
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);
  redirect("/admin/users");
}

// ── Change membership type ────────────────────────────────────────────────────

export async function setMembershipType(id: string, membershipType: string) {
  await requireAdmin();
  await prisma.user.update({
    where: { id },
    data: { membershipType: membershipType as never },
  });
  revalidatePath("/admin/users");
}
