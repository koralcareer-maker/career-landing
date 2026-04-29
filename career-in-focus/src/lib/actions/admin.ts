"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Unauthorized");
  }
  return session.user;
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
  await prisma.event.create({
    data: {
      title:       formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      type:        (formData.get("type") as string || "WEBINAR") as never,
      startAt:     new Date(formData.get("startAt") as string),
      endAt:       formData.get("endAt") ? new Date(formData.get("endAt") as string) : undefined,
      location:    formData.get("location") as string || undefined,
      isOnline:    formData.get("isOnline") === "on",
      meetingUrl:  formData.get("meetingUrl") as string || undefined,
      registerUrl: formData.get("registerUrl") as string || undefined,
      isPublished: formData.get("isPublished") !== "off",
      createdById: admin.id,
    },
  });
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/dashboard");
  redirect("/admin/events");
}

export async function updateEvent(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.event.update({
    where: { id },
    data: {
      title:       formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      type:        (formData.get("type") as string || "WEBINAR") as never,
      startAt:     new Date(formData.get("startAt") as string),
      endAt:       formData.get("endAt") ? new Date(formData.get("endAt") as string) : undefined,
      location:    formData.get("location") as string || undefined,
      isOnline:    formData.get("isOnline") === "on",
      meetingUrl:  formData.get("meetingUrl") as string || undefined,
      registerUrl: formData.get("registerUrl") as string || undefined,
      isPublished: formData.get("isPublished") !== "off",
    },
  });
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
  await prisma.update.create({
    data: {
      title:       formData.get("title") as string,
      content:     formData.get("content") as string,
      category:    formData.get("category") as string || "general",
      isPinned:    formData.get("isPinned") === "on",
      isPublished: formData.get("isPublished") !== "off",
      ctaText:     formData.get("ctaText") as string || undefined,
      ctaUrl:      formData.get("ctaUrl") as string || undefined,
      createdById: admin.id,
    },
  });
  // Notify all active members
  const members = await prisma.user.findMany({ where: { accessStatus: "ACTIVE" }, select: { id: true } });
  await prisma.notification.createMany({
    data: members.map(m => ({
      userId:  m.id,
      type:    "update",
      title:   formData.get("title") as string,
      message: (formData.get("content") as string).substring(0, 120),
      link:    "/updates",
    })),
  });
  revalidatePath("/admin/updates");
  revalidatePath("/updates");
  revalidatePath("/dashboard");
  redirect("/admin/updates");
}

export async function updateUpdate(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.update.update({
    where: { id },
    data: {
      title:       formData.get("title") as string,
      content:     formData.get("content") as string,
      category:    formData.get("category") as string || "general",
      isPinned:    formData.get("isPinned") === "on",
      isPublished: formData.get("isPublished") !== "off",
      ctaText:     formData.get("ctaText") as string || undefined,
      ctaUrl:      formData.get("ctaUrl") as string || undefined,
    },
  });
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
  await prisma.course.create({
    data: {
      title:      formData.get("title") as string,
      description:formData.get("description") as string || undefined,
      category:   formData.get("category") as string || undefined,
      formatType: formData.get("formatType") as string || undefined,
      accessType: (formData.get("accessType") as string || "INCLUDED") as never,
      isPublished:formData.get("isPublished") !== "off",
      ctaText:    formData.get("ctaText") as string || undefined,
      ctaUrl:     formData.get("ctaUrl") as string || undefined,
      createdById:admin.id,
    },
  });
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect("/admin/courses");
}

export async function updateCourse(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.course.update({
    where: { id },
    data: {
      title:       formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      category:    formData.get("category") as string || undefined,
      formatType:  formData.get("formatType") as string || undefined,
      accessType:  (formData.get("accessType") as string || "INCLUDED") as never,
      isPublished: formData.get("isPublished") !== "off",
      ctaText:     formData.get("ctaText") as string || undefined,
      ctaUrl:      formData.get("ctaUrl") as string || undefined,
    },
  });
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
  await prisma.tool.create({
    data: {
      title:       formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      category:    formData.get("category") as string || undefined,
      type:        (formData.get("type") as string || "LINK") as never,
      externalUrl: formData.get("externalUrl") as string || undefined,
      adminTip:    formData.get("adminTip") as string || undefined,
      notes:       formData.get("notes") as string || undefined,
      targetRole:  formData.get("targetRole") as string || undefined,
      isPublished: formData.get("isPublished") !== "off",
      createdById: admin.id,
    },
  });
  revalidatePath("/admin/tools");
  revalidatePath("/tools");
  redirect("/admin/tools");
}

export async function updateTool(id: string, formData: FormData) {
  await requireAdmin();
  await prisma.tool.update({
    where: { id },
    data: {
      title:       formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      category:    formData.get("category") as string || undefined,
      type:        (formData.get("type") as string || "LINK") as never,
      externalUrl: formData.get("externalUrl") as string || undefined,
      adminTip:    formData.get("adminTip") as string || undefined,
      notes:       formData.get("notes") as string || undefined,
      targetRole:  formData.get("targetRole") as string || undefined,
      isPublished: formData.get("isPublished") !== "off",
    },
  });
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
    select: { name: true, email: true, membershipType: true },
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
  }).catch(console.error);
  revalidatePath("/admin/users");
}

export async function suspendUser(id: string) {
  await requireAdmin();
  await prisma.user.update({ where: { id }, data: { accessStatus: "SUSPENDED" } });
  revalidatePath("/admin/users");
}

export async function setUserRole(id: string, role: string) {
  const admin = await requireAdmin();
  if (admin.role !== "SUPER_ADMIN") throw new Error("Only Super Admin can change roles");
  await prisma.user.update({ where: { id }, data: { role: role as never } });
  revalidatePath("/admin/users");
}

// ── Manual user creation (no payment required) ────────────────────────────────

export async function createUserManually(prevState: unknown, formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = (formData.get("password") as string)?.trim();
  const membershipType = (formData.get("membershipType") as string) || "MEMBER";

  if (!name || !email || !password) {
    return { error: "שם, אימייל וסיסמה הם שדות חובה" };
  }

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
      role: "MEMBER",
      accessStatus: "ACTIVE",
      membershipType: membershipType as never,
      paymentProvider: "MANUAL",
      paidAt: new Date(),
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
  }).catch(console.error);

  revalidatePath("/admin/users");
  return { success: true, userId: user.id };
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
