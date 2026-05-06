/**
 * Subscription billing — CardCom Tokenized model.
 *
 * Plan amounts in agorot (NIS × 100). The Member tier has a date-gated
 * launch promo: ₪19 until 2026-07-01, then ₪49 from that date forward.
 * VIP and Premium are flat-rate.
 *
 * Flow:
 *   1. User completes initial signup payment via CardCom Low-Profile.
 *      The webhook saves cardToken + cardLast4 on the User row, sets
 *      chargeCount=1, schedules nextChargeAt = +30 days.
 *   2. /api/cron/billing runs daily. For every User where nextChargeAt
 *      <= now AND subscriptionStatus = "ACTIVE", we charge the saved
 *      token via CardCom's Direct/ChargeToken API at amountForCycle().
 *   3. Success: increment chargeCount, set lastChargedAt, schedule
 *      next at +30 days. Failure: leave the row alone (will retry
 *      tomorrow). After 3 consecutive failures, switch the user's
 *      accessStatus to PENDING and notify them.
 */

export type PlanKey = "MEMBER" | "VIP" | "PREMIUM";

interface PlanConfig {
  /** Amount in agorot (₪ × 100) — what CardCom expects. */
  baseAmount:    number;
  /** Hebrew label for receipts and product descriptions. */
  label:         string;
  /**
   * Optional launch promo. Charges `amount` instead of `baseAmount`
   * for any cycle whose charge date is strictly before `until`.
   */
  launchPromo?:  { amount: number; until: Date };
}

// Cutoff for the Member launch promo. Charges scheduled before this
// date pay ₪19; from this date forward they pay the regular ₪49.
export const LAUNCH_PROMO_END = new Date("2026-07-01T00:00:00+03:00");

export const PLANS: Record<PlanKey, PlanConfig> = {
  MEMBER: {
    baseAmount: 4900,
    label:      "חברות בקריירה בפוקוס",
    launchPromo: { amount: 1900, until: LAUNCH_PROMO_END },  // ₪19 → ₪49 on 2026-07-01
  },
  VIP: {
    baseAmount: 14900,
    label:      "VIP — קריירה בפוקוס",
  },
  PREMIUM: {
    baseAmount: 49900,
    label:      "פרמיום — קורל מפעילה קשרים",
  },
};

/**
 * Amount to charge on the NEXT billing cycle for a given user.
 * Returns the launch-promo amount when the upcoming charge date is
 * before the promo cutoff; otherwise the base amount. The cron passes
 * its own "now" so each daily run charges based on that date.
 *
 * `chargeCount` is unused now — keeping the param so the existing
 * call sites compile without churn. Date-only is what matters.
 */
export function amountForCycle(plan: PlanKey, _chargeCount: number, now: Date = new Date()): number {
  const cfg = PLANS[plan];
  if (cfg.launchPromo && now < cfg.launchPromo.until) {
    return cfg.launchPromo.amount;
  }
  return cfg.baseAmount;
}

/** ₪ value (e.g. 29) for display. */
export function formatPrice(amountAgorot: number): string {
  return `₪${(amountAgorot / 100).toFixed(0)}`;
}

/** Human-readable plan name for the UI / receipts. */
export function planLabel(plan: PlanKey): string {
  return PLANS[plan].label;
}

/** Days between recurring charges. Standard is 30. */
export const CYCLE_DAYS = 30;

/** Add the cycle to a date (returns a new Date). */
export function nextChargeDate(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + CYCLE_DAYS);
  return d;
}

/** Reasons we offer in the cancellation survey, in display order. */
export const CANCELLATION_REASONS = [
  { code: "FOUND_JOB",      label: "מצאתי עבודה 🎉",                         followUp: "מזל טוב! ספר/י לנו איפה — אנחנו אוהבים סיפורי הצלחה" },
  { code: "NO_VALUE",       label: "לא קיבלתי ערך מהמערכת",                  followUp: "מה היה חסר? כל פידבק עוזר לנו להשתפר" },
  { code: "STOPPED_SEARCH", label: "הפסקתי לחפש עבודה כרגע",                  followUp: "אופציונלי: ספר/י מה השתנה" },
  { code: "OTHER",          label: "אחר",                                    followUp: "ספר/י לנו, נשמח להבין" },
] as const;

export type CancellationReasonCode = typeof CANCELLATION_REASONS[number]["code"];
