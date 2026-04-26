"use server";

import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

const SignupSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().min(6, "סיסמה חייבת להכיל לפחות 6 תווים"),
});

export async function signup(prevState: unknown, formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = SignupSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { name, email, password } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "אימייל זה כבר רשום במערכת" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "MEMBER",
      accessStatus: "PENDING",
      membershipType: "NONE",
    },
  });

  // Auto sign in
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/payment/pending",
  });
}

export async function login(prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "נא למלא אימייל וסיסמה" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return { error: "אימייל או סיסמה שגויים" };
    }
    // redirect throws NEXT_REDIRECT — rethrow it
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

export async function createAdminUser() {
  // Create initial super admin — call once manually or via seed
  const existing = await prisma.user.findUnique({
    where: { email: "admin@career-in-focus.co.il" },
  });
  if (existing) return;

  const passwordHash = await bcrypt.hash("Admin@123!", 12);
  await prisma.user.create({
    data: {
      name: "מנהל ראשי",
      email: "admin@career-in-focus.co.il",
      passwordHash,
      role: "SUPER_ADMIN",
      accessStatus: "ACTIVE",
      membershipType: "VIP",
    },
  });
}
