"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendNetworkRequestToAdmin } from "@/lib/email/resend";
import { revalidatePath } from "next/cache";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function submitNetworkRequest(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("לא מחובר");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { membershipType: true, name: true, email: true },
  });

  if (user?.membershipType !== "PREMIUM") {
    return { error: "פיצר זה זמין לחברי פרימיום בלבד" };
  }

  const targetRole = formData.get("targetRole") as string;
  const targetCompanies = formData.get("targetCompanies") as string;
  const notes = formData.get("notes") as string;

  if (!targetRole?.trim()) return { error: "נא לציין את התפקיד המבוקש" };

  // Check if already has pending request
  const existing = await prisma.networkRequest.findFirst({
    where: { userId: session.user.id, status: { in: ["PENDING", "IN_PROGRESS"] } },
  });
  if (existing) return { error: "כבר יש לך בקשה פעילה — המתיני לעדכון" };

  await prisma.networkRequest.create({
    data: {
      userId: session.user.id,
      targetRole: targetRole.trim(),
      targetCompanies: targetCompanies?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  // Notify Koral by email
  try {
    await sendNetworkRequestToAdmin({
      userName: user?.name ?? "משתמש",
      userEmail: user?.email ?? "",
      targetRole: targetRole.trim(),
      targetCompanies: targetCompanies?.trim(),
      notes: notes?.trim(),
      appUrl: APP_URL,
    });
  } catch (e) {
    console.error("Failed to send admin email:", e);
  }

  revalidatePath("/network");
  return { success: true };
}

export async function getMyNetworkRequests() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.networkRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
}
