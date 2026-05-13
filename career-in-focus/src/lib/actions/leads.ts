"use server";

/**
 * Server actions for the admin leads panel — flip the "handled" flag
 * so Coral can clear leads as she follows up.
 */

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }
}

export async function markLeadHandled(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.lead.update({
    where: { id },
    data: { handled: true, handledAt: new Date() },
  });
  revalidatePath("/admin/leads");
}

export async function unmarkLeadHandled(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.lead.update({
    where: { id },
    data: { handled: false, handledAt: null },
  });
  revalidatePath("/admin/leads");
}
