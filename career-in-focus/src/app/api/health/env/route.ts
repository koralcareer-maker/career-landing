import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public env-presence health probe. Returns whether each integration's
 * environment variable is set on this deploy — never the value, never
 * even the length, just true/false. Safe to expose unauthenticated:
 * the only information leaked is whether the operator has wired up an
 * integration, which is already knowable from the visible features.
 *
 * Used to diagnose 'CV upload doesn't work' / 'mail not sent' /
 * 'CardCom error' from outside the auth flow when the admin can't
 * easily reach the in-app admin panel.
 */
export async function GET() {
  return NextResponse.json({
    integrations: {
      gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
      authSecret: Boolean(
        (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)?.trim(),
      ),
      resend: Boolean(process.env.RESEND_API_KEY?.trim()),
      database: Boolean(process.env.DATABASE_URL?.trim()),
      cardcom: {
        terminal:    Boolean(process.env.CARDCOM_TERMINAL?.trim()),
        apiName:     Boolean(process.env.CARDCOM_API_NAME?.trim()),
        apiPassword: Boolean(process.env.CARDCOM_API_PASSWORD?.trim()),
      },
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
    },
  });
}
