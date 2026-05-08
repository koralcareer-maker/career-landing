/**
 * Tier-gating helpers used by routes + pages that need to lock
 * features behind PRO+ or VIP-only.
 *
 * Internal enum vs. display labels (after Coral's rename):
 *   MEMBER   → "השקה"  (₪19 launch / ₪49 base)
 *   VIP      → "PRO"   (₪149)
 *   PREMIUM  → "VIP"   (₪499)
 *
 * "PRO+" therefore means {VIP, PREMIUM} on the enum.
 * "VIP-only" (highest tier) means {PREMIUM}.
 *
 * Admins always pass — the gate is a paywall, not an authorization
 * boundary. Use a separate role check for actual auth.
 */

export type MembershipKey = "MEMBER" | "VIP" | "PREMIUM" | "NONE" | string | null | undefined;
export type RoleKey = "ADMIN" | "SUPER_ADMIN" | "MEMBER" | string | null | undefined;

function isAdmin(role: RoleKey): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Display "PRO" or "VIP" tier (= enum VIP or PREMIUM). Admins also pass. */
export function isProOrHigher(membership: MembershipKey, role?: RoleKey): boolean {
  if (isAdmin(role)) return true;
  return membership === "VIP" || membership === "PREMIUM";
}

/** Display "VIP" tier only (= enum PREMIUM). Admins also pass. */
export function isTopTier(membership: MembershipKey, role?: RoleKey): boolean {
  if (isAdmin(role)) return true;
  return membership === "PREMIUM";
}
