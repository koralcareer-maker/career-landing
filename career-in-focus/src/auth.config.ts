/**
 * Edge-safe NextAuth config — NO Prisma / Node.js-only imports here.
 * Used by proxy.ts which runs in Edge Runtime.
 */
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // In middleware (edge), jwt only decodes the token — no DB calls needed.
    async jwt({ token, user }: { token: JWT; user?: { id?: string; role?: string; accessStatus?: string } | null }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessStatus = user.accessStatus;
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: JWT }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.accessStatus = token.accessStatus;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  providers: [], // Credentials provider added in auth.ts (Node.js only)
};
