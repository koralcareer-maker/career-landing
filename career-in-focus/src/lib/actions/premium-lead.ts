"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { safeSendPremiumLeadNotification } from "@/lib/email/resend";

export type PremiumLeadFormData = {
  fullName: string;
  phone: string;
  email: string;
  targetRole: string;
  description?: string;
  whyNow?: string;
};

export async function submitPremiumLead(data: PremiumLeadFormData) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Validate
  if (!data.fullName || !data.phone || !data.email || !data.targetRole) {
    return { error: "יש למלא את כל שדות החובה" };
  }

  try {
    const lead = await prisma.premiumLead.create({
      data: {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        email: data.email.trim().toLowerCase(),
        targetRole: data.targetRole.trim(),
        description: data.description?.trim() || null,
        whyNow: data.whyNow?.trim() || null,
        userId,
        status: "NEW",
      },
    });

    // Notify admin (fire-and-forget)
    safeSendPremiumLeadNotification({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      targetRole: data.targetRole,
      description: data.description,
      whyNow: data.whyNow,
      leadId: lead.id,
      appUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    }).catch(() => {});

    revalidatePath("/koral-connections");
    return { success: true, leadId: lead.id };
  } catch (e) {
    console.error("PremiumLead error:", e);
    return { error: "אירעה שגיאה, נסי שוב" };
  }
}
