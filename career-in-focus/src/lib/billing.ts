/**
 * Subscription billing — CardCom Tokenized model.
 *
 * Plan amounts in agorot (NIS × 100). The Member tier has a 2-month
 * launch promo: ₪29 for the first two charges, then ₪49 onward.
 * VIP and Premium are flat-rate.
 *
 * Flow:
 *   1. User completes initial signup payment via CardCom Low-Profile.
 *      The webhook saves cardToken + cardLast4 on the User row, sets
 *      chargeCount=1, schedules nextChargeAt = +30 days.
 *   2. /api/cron/billing runs daily. For every User where nextChargeAt
 *      <= now AND subscriptionStatus = "ACTIVE", we charge the saved
 *      token via CardCom's Direct/ChargeToken API.
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
  /** Optional launch promo (overrides amount for the first N cycles). */
  launchPromo?:  { amount: number; cycles: number };
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  MEMBER: {
    baseAmount: 4900,
    label:      "חברות בקריירה בפוקוס",
    launchPromo: { amount: 2900, cycles: 2 },  // ₪29 × first 2 months → ₪49
  },
  VIP: {
    baseAmount: 14900,
    label:      "VIP — קריירה בפוקוס",
  },
  PREMIUM: {
    baseAmount: 44900,
    label:      "פרמיום — קורל מפעילה קשרים",
  },
};

/**
 * Amount to charge on the NEXT billing cycle for a given user.
 * `chargeCount` is the number of charges already completed.
 *   chargeCount=0 → first charge → if Member, ₪29
 *   chargeCount=1 → second charge → if Member, ₪29
 *   chargeCount>=2 → ₪49
 * VIP/Premium always charge the base amount.
 */
export function amountForCycle(plan: PlanKey, chargeCount: number): number {
  const cfg = PLANS[plan];
  if (cfg.launchPromo && chargeCount < cfg.launchPromo.cycles) {
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
