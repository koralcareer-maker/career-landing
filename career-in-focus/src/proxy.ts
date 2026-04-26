/**
 * Middleware — runs in Edge Runtime.
 * Uses authConfig (no Prisma) to decode the JWT token.
 */
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/login",
  "/signup",
  "/terms",
  "/privacy",
  "/api/auth",
  "/api/payment/cardcom",
  "/_next",
  "/favicon.ico",
  "/images",
];

const ADMIN_PATHS = ["/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Not logged in → redirect to login
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = session.user as { role?: string; accessStatus?: string };
  const role = user.role;
  const accessStatus = user.accessStatus;

  // Admin paths: require ADMIN or SUPER_ADMIN
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Member paths: require ACTIVE status (paid)
  if (accessStatus !== "ACTIVE") {
    // Allow /payment pages
    if (pathname.startsWith("/payment")) return NextResponse.next();
    return NextResponse.redirect(new URL("/payment/pending", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
