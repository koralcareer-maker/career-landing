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

  const { name, password, gender } = result.data;
  // Always store + look up email lowercased + trimmed. Without this,
  // an admin-imported `Customer@gmail.com` and a user-typed
  // `customer@gmail.com` create two non-matching records.
  const email = result.data.email.toLowerCase().trim();

  // Read plan from form (passed as hidden field from pricing page)
  const planRaw = ((formData.get("plan") as string) ?? "MEMBER").toUpperCase();
  const plan: Plan = VALID_PLANS.includes(planRaw as Plan) ? (planRaw as Plan) : "MEMBER";

  // Look for an existing row. Three possible cases:
  //   1. real account (has password AND has paid)   → bounce to login
  //   2. admin pre-create (no password, no payment) → let new owner claim
  //   3. stuck signup (has password, never paid)    → let them reset by
  //      signing up again — we treat it as "claim" too, since they
  //      clearly forgot they started before and were blocked previously
  // Coral on 2026-05-19: a lead reported "the system says I'm registered
  // but I'm not" — turned out to be case (2). She had pre-opened a
  // courtesy account for the customer; the customer typing the same
  // email at /signup hit the old blanket "אימייל כבר רשום" error and
  // gave up. We were losing customers.
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    const hasPassword = !!existing.passwordHash;
    const hasPaid     = !!existing.paidAt;
    const realAccount = hasPassword && hasPaid;
    if (realAccount) {
      return {
        error:
          "אימייל זה כבר רשום במערכת. אם זה החשבון שלך, נסי להתחבר. שכחת סיסמה? יש כפתור איפוס בעמוד ההתחברות.",
      };
    }
    // Claim path: overwrite the placeholder/unfinished row with the
    // user's chosen name + password + plan. Keep the existing id +
    // referralCode + referredById so any links already shared remain
    // valid. Reset accessStatus to PENDING so the payment flow re-runs.
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        passwordHash,
        gender,
        accessStatus: "PENDING",
        membershipType: plan,
      },
    });
    // Skip the create block entirely. Auto sign-in below still runs.
  } else {
    // Referral handling — if the user arrived via a `ref` link, the
    // signup page tucks the code into a hidden form field. We look up
    // the referrer and pin the new user to them. The reward (free month)
    // gets credited in the CardCom webhook after the new user pays, not
    // here — we don't want to gift months to fake signups that never
    // convert.
    const referralCodeRaw = ((formData.get("ref") as string) ?? "").trim().toUpperCase();
    let referredById: string | undefined;
    if (referralCodeRaw && referralCodeRaw.length >= 6 && referralCodeRaw.length <= 12) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const referrer = await (prisma.user as any).findUnique({
        where: { referralCode: referralCodeRaw },
        select: { id: true },
      });
      if (referrer) referredById = referrer.id;
    }

    // Generate a unique referral code for the new user — they can start
    // sharing it the moment they're in. Collisions on the 8-char code
    // are astronomically rare but we retry once defensively.
    function makeCode() {
      return Math.random().toString(36).slice(2, 10).toUpperCase();
    }
    let referralCode = makeCode();

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        gender,
        role: "MEMBER",
        accessStatus: "PENDING",
        membershipType: plan, // store chosen plan — activated after payment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ referralCode, referredById } as any),
      },
    }).catch(async () => {
      // Almost certainly the referralCode unique-collision — regenerate once.
      referralCode = makeCode();
      await prisma.user.create({
        data: {
          name, email, passwordHash, gender,
          role: "MEMBER", accessStatus: "PENDING", membershipType: plan,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...({ referralCode, referredById } as any),
        },
      });
    });
  }

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

  // Per Coral: signup flow goes straight to CardCom — no intermediate
  // /payment/pending step. The redirect route handles the CardCom
  // call and bounces back to /payment/success on success or to
  // /payment/pending only when something went wrong.
  redirect(`/api/payment/cardcom/redirect?plan=${plan.toLowerCase()}`);
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

// ─── Password reset stubs ─────────────────────────────────────────────────
// The /forgot-password and /reset-password pages were scaffolded ahead of
// the backend implementation. Until we add a PasswordReset model + email
// dispatch, these return a friendly "contact us" response so the build
// passes and users still get a path forward (admin can reset manually via
// the users panel — same flow Coral already uses for individual resets).

export async function requestPasswordReset(
  prevState: unknown,
  formData: FormData,
) {
  const email = (formData.get("email") as string | null)?.toLowerCase().trim();
  if (!email) return { error: "נא למלא אימייל" };
  // Don't reveal whether the email is in the system — return the same
  // "we contacted you" message either way. Coral resets passwords for
  // members manually from the admin panel; once a member uses this
  // form we get a notification (via the email below) and act on it.
  console.warn("[forgot-password] member requested reset:", email);
  return {
    success: true,
    message:
      "תודה. אם האימייל רשום אצלנו ניצור אתך קשר בקרוב לאיפוס. (איפוס אוטומטי יתווסף בקרוב — כרגע ידני דרך המנהל.)",
  };
}

// Signature matches the form usage: the page does
//   resetPassword.bind(null, token)
// which binds `token` as the first arg, leaving (prevState, formData) for
// useActionState. Both `prevState` and `formData` are unused while the
// feature is stubbed.
export async function resetPassword(
  _token: string,
  _prevState: unknown,
  _formData: FormData,
) {
  return {
    error:
      "איפוס סיסמה אוטומטי טרם זמין. נא לפנות למנהלת המערכת לאיפוס (קישור בתחתית הדף).",
  };
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
