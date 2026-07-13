import { NextResponse, type NextRequest } from "next/server";

/**
 * Adds `x-pathname` to every request so server components (layouts
 * especially) can read the current path via `headers()` without
 * needing a client component wrapper.
 *
 * Used by the (member) layout to gate FREE-tier users to /jobs only.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("x-pathname", req.nextUrl.pathname);
  return res;
}

export const config = {
  // Skip Next internals + static assets so the header set is cheap
  // (still runs for every real page + API route, which is what we want).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
