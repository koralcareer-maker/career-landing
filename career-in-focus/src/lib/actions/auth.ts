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

const VALID_PLANS = ["MEMBER", "VIP", "PREMIUM"] as const;
type Plan = typeof VALID_PLANS[number];

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

  // Read plan from form (passed as hidden field from pricing page)
  const planRaw = ((formData.get("plan") as string) ?? "MEMBER").toUpperCase();
  const plan: Plan = VALID_PLANS.includes(planRaw as Plan) ? (planRaw as Plan) : "MEMBER";

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
      membershipType: plan, // store chosen plan — activated after payment
    },
  });

  // Auto sign in and redirect to payment with plan
  await signIn("credentials", {
    email,
    password,
    redirectTo: `/payment/pending?plan=${plan.toLowerCase()}`,
  });
}

export async function login(prevState: unknown, formData: FormData) {
  const rawEmail    = formData.get("email") as string;
  const rawPassword = formData.get("password") as string;

  if (!rawEmail || !rawPassword) {
    return { error: "נא למלא אימייל וסיסמה" };
  }

  // Trim whitespace and lowercase the email so autocomplete or mobile
  // capitalization doesn't break login. Password is trimmed of surrounding
  // whitespace only — interior characters preserved.
  const email    = rawEmail.toLowerCase().trim();
  const password = rawPassword.trim();

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
