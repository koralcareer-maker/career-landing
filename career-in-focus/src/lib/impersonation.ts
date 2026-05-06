/**
 * Admin "view as user" support — lets a SUPER_ADMIN/ADMIN walk in the
 * member's shoes (dashboard, jobs, profile, etc.) without knowing the
 * member's password.
 *
 * Mechanism: a signed cookie carries the target user id. The jwt
 * callback in auth.ts checks for it on every session refresh, and if
 * the underlying admin token is allowed to impersonate, swaps the
 * token's identity to the target while remembering the admin id in
 * `impersonatedByAdminId`. Stop = clear the cookie.
 *
 * Threat model: the cookie itself is HMAC-signed so a non-admin
 * cannot forge it, BUT the underlying admin session is the real
 * authority — the jwt callback double-checks the admin role before
 * honoring the cookie. A leaked cookie alone gives no privilege.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const IMPERSONATE_COOKIE = "cif_imp_uid";

function getSecret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  if (!s) throw new Error("AUTH_SECRET is required for impersonation cookie signing");
  return s;
}

/** Sign a userId so the auth callback knows it came from a real admin click. */
export function signImpersonationToken(userId: string): string {
  const sig = createHmac("sha256", getSecret()).update(userId).digest("base64url");
  return `${userId}.${sig}`;
}

/**
 * Validate a cookie value. Returns the userId if the signature matches,
 * or null otherwise. Uses timingSafeEqual to avoid timing attacks on the
 * HMAC comparison.
 */
export function verifyImpersonationToken(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [userId, providedSig] = parts;
  if (!userId || !providedSig) return null;

  const expectedSig = createHmac("sha256", getSecret()).update(userId).digest("base64url");
  if (expectedSig.length !== providedSig.length) return null;

  try {
    if (!timingSafeEqual(Buffer.from(expectedSig), Buffer.from(providedSig))) {
      return null;
    }
  } catch {
    return null;
  }
  return userId;
}
