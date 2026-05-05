/**
 * Device-limit enforcement — caps each user at 3 simultaneously active
 * devices to discourage account sharing.
 *
 * The fingerprint is a SHA-256 of the normalised User-Agent header. We
 * deliberately don't include IP in the hash: legitimate users on VPN /
 * mobile network switch IPs constantly, and we don't want to penalise
 * them. The User-Agent stays stable per device (browser/OS), which is
 * exactly the granularity we want.
 *
 * Flow:
 *  - On every successful credential login, call recordLogin().
 *  - If this fingerprint is new AND the user already has 3 active
 *    devices in the last 30 days, the OLDEST one (by lastSeenAt) is
 *    deactivated. Net effect: max 3 active devices, evict-oldest-first.
 *  - The active fingerprint's lastSeenAt is bumped to now.
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const MAX_DEVICES_PER_USER = 3;
const ACTIVE_WINDOW_DAYS = 30;

/**
 * Hash a User-Agent into a stable fingerprint. We strip a few fields
 * that change per browser update (Chrome version, etc.) so a Chrome
 * upgrade doesn't count as a new device.
 */
export function fingerprintFromUserAgent(ua: string): string {
  const normalized = ua
    .replace(/Chrome\/[\d.]+/, "Chrome/X")
    .replace(/Firefox\/[\d.]+/, "Firefox/X")
    .replace(/Safari\/[\d.]+/, "Safari/X")
    .replace(/Version\/[\d.]+/, "Version/X")
    .toLowerCase()
    .trim();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export interface RecordLoginInput {
  userId:    string;
  userAgent: string | null;
  ipAddress: string | null;
}

export async function recordLogin({ userId, userAgent, ipAddress }: RecordLoginInput) {
  // Without a UA we can't fingerprint — log it as "unknown" so we still
  // see the row, but it'll dedupe with other UA-less logins.
  const ua = (userAgent ?? "unknown").trim() || "unknown";
  const fingerprint = fingerprintFromUserAgent(ua);
  const now = new Date();

  // Has THIS device been seen for this user before?
  const existing = await prisma.userDevice.findUnique({
    where: { userId_fingerprint: { userId, fingerprint } },
  });

  if (existing) {
    await prisma.userDevice.update({
      where: { id: existing.id },
      data:  {
        lastSeenAt: now,
        isActive:   true,
        ...(ipAddress ? { lastIp: ipAddress } : {}),
        ...(userAgent ? { userAgent } : {}),
      },
    });
    return;
  }

  // Brand-new device for this user. Check the active count and evict
  // the oldest if we're over the cap.
  const cutoff = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * 86400000);
  const activeCount = await prisma.userDevice.count({
    where: { userId, isActive: true, lastSeenAt: { gte: cutoff } },
  });

  if (activeCount >= MAX_DEVICES_PER_USER) {
    const oldest = await prisma.userDevice.findFirst({
      where:   { userId, isActive: true },
      orderBy: { lastSeenAt: "asc" },
    });
    if (oldest) {
      await prisma.userDevice.update({
        where: { id: oldest.id },
        data:  { isActive: false },
      });
    }
  }

  await prisma.userDevice.create({
    data: {
      userId,
      fingerprint,
      userAgent: userAgent ?? null,
      lastIp:    ipAddress ?? null,
      isActive:  true,
    },
  });
}
