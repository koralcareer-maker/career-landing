"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function createRecruiter(prevState: unknown, formData: FormData) {
  await requireAdmin();

  const name    = (formData.get("name") as string)?.trim();
  const company = (formData.get("company") as string)?.trim();

  if (!name || !company) {
    return { error: "שם וחברה הם שדות חובה" };
  }

  await prisma.recruiter.create({
    data: {
      name,
      company,
      email:       (formData.get("email") as string)?.trim() || null,
      phone:       (formData.get("phone") as string)?.trim() || null,
      linkedinUrl: (formData.get("linkedinUrl") as string)?.trim() || null,
      type:        (formData.get("type") as string || "RECRUITER") as never,
      field:       (formData.get("field") as string)?.trim() || null,
      notes:       (formData.get("notes") as string)?.trim() || null,
      isActive:    true,
    },
  });

  revalidatePath("/admin/recruiters");
  revalidatePath("/recruiters");
  return { success: true };
}

export async function updateRecruiter(id: string, prevState: unknown, formData: FormData) {
  await requireAdmin();

  const name    = (formData.get("name") as string)?.trim();
  const company = (formData.get("company") as string)?.trim();

  if (!name || !company) {
    return { error: "שם וחברה הם שדות חובה" };
  }

  await prisma.recruiter.update({
    where: { id },
    data: {
      name,
      company,
      email:       (formData.get("email") as string)?.trim() || null,
      phone:       (formData.get("phone") as string)?.trim() || null,
      linkedinUrl: (formData.get("linkedinUrl") as string)?.trim() || null,
      type:        (formData.get("type") as string || "RECRUITER") as never,
      field:       (formData.get("field") as string)?.trim() || null,
      notes:       (formData.get("notes") as string)?.trim() || null,
      isActive:    formData.get("isActive") !== "false",
    },
  });

  revalidatePath("/admin/recruiters");
  revalidatePath("/recruiters");
  return { success: true };
}

export async function deleteRecruiter(id: string) {
  await requireAdmin();
  await prisma.recruiter.delete({ where: { id } });
  revalidatePath("/admin/recruiters");
  revalidatePath("/recruiters");
}
