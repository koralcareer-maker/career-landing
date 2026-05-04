import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Role, AccessStatus } from "@/generated/prisma/client";
import { authConfig } from "./auth.config";

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
      async authorize(credentials) {
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
      // Refresh role/status/gender from DB on subsequent token reads so a
      // gender update via admin/signup flows in without re-login.
      if (token.id && !user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, accessStatus: true, membershipType: true, name: true, image: true, gender: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.accessStatus = dbUser.accessStatus;
          token.membershipType = dbUser.membershipType;
          token.name = dbUser.name;
          token.picture = dbUser.image;
          token.gender = dbUser.gender;
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
      }
      return session;
    },
  },
});
