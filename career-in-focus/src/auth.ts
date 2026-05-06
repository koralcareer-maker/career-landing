import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { Role, AccessStatus } from "@/generated/prisma/client";
import { authConfig } from "./auth.config";
import { recordLogin } from "@/lib/device-limit";
import { IMPERSONATE_COOKIE, verifyImpersonationToken } from "@/lib/impersonation";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      accessStatus: AccessStatus;
      membershipType?: string | null;
      gender?: string | null;   // "f" | "m" | null — drives gendered copy
      // When admin clicks "view as user", we swap the token's identity
      // and stash the admin's real id here. UI uses this to render the
      // "אתה מצפה כ-X — חזור" banner.
      impersonatedByAdminId?: string | null;
    };
  }
  interface User {
    role: Role;
    accessStatus: AccessStatus;
    membershipType?: string | null;
    gender?: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // Normalize email — DB stores lowercased emails, so any case the user
        // types (autocomplete from contacts, capital first letter on mobile,
        // trailing whitespace) needs to be normalized before lookup.
        const normalizedEmail = String(credentials.email).toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        // Track this device against the 3-per-user cap. New devices beyond
        // the cap will displace the oldest one (by lastSeenAt). Best-effort:
        // if recordLogin throws (DB transient), don't block the login.
        try {
          const headers = request?.headers as Headers | undefined;
          const userAgent = headers?.get("user-agent") ?? null;
          const ipAddress = headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
          await recordLogin({ userId: user.id, userAgent, ipAddress });
        } catch (e) {
          console.warn("[auth] recordLogin failed:", e instanceof Error ? e.message : e);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          accessStatus: user.accessStatus,
          membershipType: user.membershipType,
          gender: user.gender,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessStatus = user.accessStatus;
        token.membershipType = user.membershipType;
        token.gender = user.gender;
      }

      // Step 1 — refresh the REAL identity from DB. If we were
      // previously impersonating, restore the admin first; the
      // impersonation step below will re-apply the swap if the cookie
      // is still set.
      if (token.id && !user) {
        const realUserId =
          (token.impersonatedByAdminId as string | undefined) ?? (token.id as string);
        const dbUser = await prisma.user.findUnique({
          where: { id: realUserId },
          select: { id: true, email: true, role: true, accessStatus: true, membershipType: true, name: true, image: true, gender: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.role = dbUser.role;
          token.accessStatus = dbUser.accessStatus;
          token.membershipType = dbUser.membershipType;
          token.name = dbUser.name;
          token.picture = dbUser.image;
          token.gender = dbUser.gender;
        }
        delete token.impersonatedByAdminId;
      }

      // Step 2 — apply impersonation if the admin set the cookie.
      // We re-read the cookie on every JWT refresh so clearing it
      // (via stopImpersonating) takes effect on the next page load.
      try {
        const cookieStore = await cookies();
        const impCookie = cookieStore.get(IMPERSONATE_COOKIE)?.value;
        const targetId = verifyImpersonationToken(impCookie);
        const isAdmin = token.role === "ADMIN" || token.role === "SUPER_ADMIN";
        if (targetId && isAdmin && targetId !== token.id) {
          const target = await prisma.user.findUnique({
            where: { id: targetId },
            select: { id: true, email: true, role: true, accessStatus: true, membershipType: true, name: true, image: true, gender: true },
          });
          if (target) {
            token.impersonatedByAdminId = token.id;
            token.id = target.id;
            token.email = target.email;
            token.role = target.role;
            token.accessStatus = target.accessStatus;
            token.membershipType = target.membershipType;
            token.name = target.name;
            token.picture = target.image;
            token.gender = target.gender;
          }
        }
      } catch (e) {
        // cookies() throws when called outside a request context —
        // safe to ignore; impersonation only matters during HTTP
        // requests anyway.
        if (process.env.NODE_ENV !== "production") {
          console.warn("[auth] impersonation cookie check failed:", e);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.accessStatus = token.accessStatus as AccessStatus;
        session.user.membershipType = token.membershipType as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        session.user.gender = token.gender as string | null;
        session.user.impersonatedByAdminId =
          (token.impersonatedByAdminId as string | undefined) ?? null;
      }
      return session;
    },
  },
});
