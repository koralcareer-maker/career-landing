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
  gender: z.enum(["f", "m"]).optional(),
});

const VALID_PLANS = ["MEMBER", "VIP", "PREMIUM"] as const;
type Plan = typeof VALID_PLANS[number];

export async function signup(prevState: unknown, formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    gender: (formData.get("gender") as string) || undefined,
  };

  const result = SignupSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { name, email, password, gender } = result.data;

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
      gender,
      role: "MEMBER",
      accessStatus: "PENDING",
      membershipType: plan, // store chosen plan — activated after payment
    },
  });

  // Auto sign in. Same trick as login: redirect:false on signIn + Next.js
  // relative redirect → keeps the user on the request's host instead of
  // following NEXTAUTH_URL/AUTH_URL into a misconfigured absolute URL.
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return { error: "התחברות אוטומטית נכשלה — נסי להתחבר ידנית" };
    }
    throw error;
  }

  redirect(`/payment/pending?plan=${plan.toLowerCase()}`);
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
    // redirect:false → NextAuth doesn't try to build an absolute redirect URL
    // from NEXTAUTH_URL/AUTH_URL. We use Next.js's relative redirect below,
    // which always stays on the request's actual host.
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return { error: "אימייל או סיסמה שגויים" };
    }
    throw error;
  }

  redirect("/dashboard");
}

export async function logout() {
  await signOut({ redirect: false });
  redirect("/");
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
