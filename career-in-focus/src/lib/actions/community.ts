"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { PostCategory } from "@/generated/prisma/client";

// ─── createPost ───────────────────────────────────────────────────────────────

export async function createPost(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה למערכת" };

  const content = (formData.get("content") as string | null)?.trim();
  const categoryRaw = formData.get("category") as string | null;

  if (!content || content.length < 3) {
    return { error: "התוכן חייב להכיל לפחות 3 תווים" };
  }

  const validCategories: PostCategory[] = ["QUESTION", "JOB", "WIN", "TIP"];
  const category = validCategories.includes(categoryRaw as PostCategory)
    ? (categoryRaw as PostCategory)
    : "QUESTION";

  try {
    await prisma.post.create({
      data: {
        authorId: session.user.id,
        content,
        category,
      },
    });

    revalidatePath("/community");
    return { success: true };
  } catch {
    return { error: "שגיאה בשמירת הפוסט. נסה שוב." };
  }
}

// ─── likePost ─────────────────────────────────────────────────────────────────

export async function likePost(postId: string) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה למערכת" };

  const userId = session.user.id;

  try {
    // Toggle like
    const existing = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
    } else {
      await prisma.like.create({ data: { postId, userId } });
    }

    revalidatePath("/community");
    return { success: true, liked: !existing };
  } catch {
    return { error: "שגיאה בעיבוד הלייק" };
  }
}

// ─── addComment ──────────────────────────────────────────────────────────────

export async function addComment(postId: string, content: string) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה למערכת" };

  const trimmed = content.trim();
  if (!trimmed || trimmed.length < 2) {
    return { error: "התגובה חייבת להכיל לפחות 2 תווים" };
  }

  try {
    await prisma.comment.create({
      data: {
        postId,
        authorId: session.user.id,
        content: trimmed,
      },
    });

    revalidatePath("/community");
    return { success: true };
  } catch {
    return { error: "שגיאה בשמירת התגובה. נסה שוב." };
  }
}
