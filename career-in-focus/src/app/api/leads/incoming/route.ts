/**
 * Public lead-intake endpoint. The marketing site (careerinfocus.co.il,
 * Dolev's old Netlify build) used to keep its own admin panel of
 * non-paying visitors who filled the contact form. Coral asked to
 * pipe those leads into THIS admin panel so it's a single CRM, and to
 * get an email every time a new one lands.
 *
 * Wire-up on the marketing side:
 *   POST https://app.careerinfocus.co.il/api/leads/incoming
 *   Content-Type: application/json
 *   { name, email?, phone?, message?, source? }
 *
 * Or as a form post (multipart/x-www-form-urlencoded) — both supported.
 *
 * CORS is open because the marketing site sits on a different origin
 * (careerinfocus.co.il vs app.careerinfocus.co.il); the data is
 * non-sensitive (contact details only), and there's no auth on the
 * other end since it's a public marketing form.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLeadNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown> = {};
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const form = await req.formData();
      for (const [k, v] of form.entries()) payload[k] = typeof v === "string" ? v : null;
    }
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400, headers: CORS_HEADERS });
  }

  const name = String(payload.name ?? "").trim().slice(0, 120);
  const email = String(payload.email ?? "").trim().slice(0, 200) || null;
  const phone = String(payload.phone ?? "").trim().slice(0, 40) || null;
  const message = String(payload.message ?? "").trim().slice(0, 2000) || null;
  const source = String(payload.source ?? "marketing-site").trim().slice(0, 60);

  if (!name || (!email && !phone)) {
    return NextResponse.json(
      { error: "name + (email or phone) required" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const lead = await prisma.lead.create({
    data: { name, email, phone, message, source },
  });

  // Fire-and-forget email to Coral. Don't fail the request if email
  // sending fails — the lead is already persisted.
  sendLeadNotification({ name, email, phone, message, source, id: lead.id }).catch((e) => {
    console.error("[leads/incoming] email failed:", e);
  });

  return NextResponse.json({ ok: true, id: lead.id }, { headers: CORS_HEADERS });
}
