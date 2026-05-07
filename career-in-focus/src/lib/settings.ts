/**
 * Runtime settings store — DB-backed key/value with env-var fallback.
 *
 * The admin manages CardCom credentials (and any future config) from
 * /admin/settings/cardcom rather than editing Vercel env vars +
 * redeploying. Keeps everyday operational tweaks one click away.
 *
 * Read order on every call:
 *   1. Setting row in DB (admin-set, freshest)
 *   2. process.env (legacy fallback so existing deploys keep working
 *      even before the admin saves anything in the UI)
 *
 * Tolerates the Setting table not existing yet — pre-migration the
 * lookup throws "no such table" and we silently fall through to env.
 */

import { prisma } from "@/lib/prisma";

export const CARDCOM_KEYS = {
  terminal:    "cardcom_terminal",
  apiName:     "cardcom_api_name",
  apiPassword: "cardcom_api_password",
} as const;

async function readSetting(key: string): Promise<string | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    const v = row?.value?.trim();
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export interface CardcomCredentials {
  terminal:    string;
  apiName:     string;
  apiPassword: string;
  source: {
    terminal:    "db" | "env" | "missing";
    apiName:     "db" | "env" | "missing";
    apiPassword: "db" | "env" | "missing";
  };
}

/**
 * Resolve the three CardCom credentials with DB-first / env-fallback
 * semantics. Each field tracks its source so the admin diagnose page
 * can show "X is coming from the DB / from env / missing".
 */
export async function getCardcomCredentials(): Promise<CardcomCredentials> {
  const [dbTerm, dbName, dbPass] = await Promise.all([
    readSetting(CARDCOM_KEYS.terminal),
    readSetting(CARDCOM_KEYS.apiName),
    readSetting(CARDCOM_KEYS.apiPassword),
  ]);

  const envTerm = process.env.CARDCOM_TERMINAL?.trim() || "";
  const envName = process.env.CARDCOM_API_NAME?.trim() || "";
  const envPass = process.env.CARDCOM_API_PASSWORD?.trim() || "";

  const terminal    = dbTerm ?? envTerm;
  const apiName     = dbName ?? envName;
  const apiPassword = dbPass ?? envPass;

  return {
    terminal,
    apiName,
    apiPassword,
    source: {
      terminal:    dbTerm ? "db" : envTerm ? "env" : "missing",
      apiName:     dbName ? "db" : envName ? "env" : "missing",
      apiPassword: dbPass ? "db" : envPass ? "env" : "missing",
    },
  };
}

/** Admin-side saver. Empty value clears the row (revert to env). */
export async function setSetting(key: string, value: string): Promise<void> {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    await prisma.setting.deleteMany({ where: { key } });
    return;
  }
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: trimmed },
    update: { value: trimmed },
  });
}
