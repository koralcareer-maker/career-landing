"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const AppSchema = z.object({
  company: z.string().min(1, "שם חברה נדרש"),
  role: z.string().min(1, "תפקיד נדרש"),
  dateApplied: z.string().optional(),
  source: z.string().optional(),
  status: z.string().default("APPLIED"),
  notes: z.string().optional(),
  nextFollowUp: z.string().optional(),
  contactName: z.string().optional(),
  jobLink: z.string().optional(),
});

export async function addJobApplication(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };

  const raw = Object.fromEntries(formData.entries());
  const result = AppSchema.safeParse(raw);
  if (!result.success) return { error: result.error.issues[0].message };

  const data = result.data;
  const created = await prisma.jobApplication.create({
    data: {
      userId: session.user.id,
      company: data.company,
      role: data.role,
      dateApplied: data.dateApplied ? new Date(data.dateApplied) : undefined,
      source: data.source || undefined,
      status: data.status as never,
      notes: data.notes || undefined,
      nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : undefined,
      contactName: data.contactName || undefined,
      jobLink: data.jobLink || undefined,
    },
  });

  revalidatePath("/progress");
  return { success: true, id: created.id };
}

export async function updateJobApplication(
  id: string,
  data: {
    status?: string;
    notes?: string;
    nextFollowUp?: string;
    responseReceived?: boolean;
    interviewStage?: string;
  }
) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.jobApplication.update({
    where: { id, userId: session.user.id },
    data: {
      status: data.status as never,
      notes: data.notes,
      nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : undefined,
      responseReceived: data.responseReceived,
      interviewStage: data.interviewStage,
    },
  });

  revalidatePath("/progress");
}

export async function deleteJobApplication(id: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.jobApplication.delete({ where: { id, userId: session.user.id } });
  revalidatePath("/progress");
}
