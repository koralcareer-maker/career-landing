"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { FROM } from "@/lib/email/resend";
import { Resend } from "resend";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

function buildHtml(subject: string, body: string, senderName: string) {
  // Convert newlines to <br> and basic markdown-like bold (**text**)
  const html = body
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#F5F1EB; font-family:Arial,sans-serif; direction:rtl; }
    .wrap { max-width:580px; margin:32px auto; background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 32px rgba(0,0,0,0.08); }
    .header { background:#1C1C2E; padding:28px 32px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:20px; font-weight:900; letter-spacing:-0.3px; }
    .header p  { color:#3ECFCF; margin:6px 0 0; font-size:13px; }
    .body { padding:36px 32px; color:#1C1C2E; font-size:15px; line-height:1.75; }
    .body h2 { font-size:22px; font-weight:900; margin:0 0 16px; }
    .content { color:#374151; }
    .btn { display:inline-block; background:#3ECFCF; color:#fff !important; font-weight:700;
           font-size:15px; padding:14px 32px; border-radius:14px; text-decoration:none; margin:24px 0 0; }
    .sig { margin-top:32px; padding-top:20px; border-top:1px solid #f0f0f0; font-size:13px; color:#888; }
    .footer { background:#F5F1EB; padding:18px 32px; text-align:center; color:#aaa; font-size:12px; }
    .footer a { color:#3ECFCF; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>קריירה בפוקוס</h1>
      <p>הקהילה לחיפוש עבודה חכם</p>
    </div>
    <div class="body">
      <h2>${subject}</h2>
      <div class="content">${html}</div>
      <div class="sig">
        בברכה,<br />
        <strong>${senderName}</strong><br />
        קריירה בפוקוס
      </div>
    </div>
    <div class="footer">
      <p>© 2026 קריירה בפוקוס · <a href="https://careerinfocus.co.il">careerinfocus.co.il</a></p>
      <p>קיבלת מייל זה כי את/ה חבר/ה בקהילה.</p>
    </div>
  </div>
</body>
</html>`;
}

export type BroadcastState = {
  error?: string;
  success?: boolean;
  sentCount?: number;
  skippedCount?: number;
  previewCount?: number;
};

// Count how many will receive based on filter — for preview
export async function previewBroadcast(prevState: unknown, formData: FormData): Promise<BroadcastState> {
  await requireAdmin();
  const audience = formData.get("audience") as string;

  const where = buildWhere(audience);
  const count = await prisma.user.count({ where });
  return { previewCount: count };
}

// Actually send the broadcast
export async function sendBroadcast(prevState: unknown, formData: FormData): Promise<BroadcastState> {
  const admin = await requireAdmin();

  const subject  = (formData.get("subject")  as string)?.trim();
  const body     = (formData.get("body")     as string)?.trim();
  const audience = (formData.get("audience") as string) ?? "ALL";

  if (!subject || !body) {
    return { error: "נושא וגוף ההודעה הם שדות חובה" };
  }

  if (!process.env.RESEND_API_KEY) {
    return { error: "RESEND_API_KEY לא מוגדר בסביבה — לא ניתן לשלוח מיילים" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const where  = buildWhere(audience);

  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true },
  });

  if (users.length === 0) {
    return { error: "לא נמצאו נמענים בפילטר שנבחר" };
  }

  const html = buildHtml(subject, body, admin.name ?? "קורל שלו");
  let sent = 0;
  let skipped = 0;

  // Send in batches of 10 (Resend rate limit friendly)
  const BATCH = 10;
  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (u) => {
        try {
          await resend.emails.send({
            from:    FROM,
            to:      u.email,
            subject,
            html,
          });
          sent++;
        } catch (err) {
          console.error(`Broadcast: failed to send to ${u.email}`, err);
          skipped++;
        }
      })
    );
    // Small pause between batches to avoid rate limits
    if (i + BATCH < users.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Save to broadcast log
  await prisma.broadcastLog.create({
    data: {
      subject,
      body,
      audience,
      sentCount:    sent,
      skippedCount: skipped,
      sentById:     admin.id,
    },
  });

  revalidatePath("/admin/broadcast");
  return { success: true, sentCount: sent, skippedCount: skipped };
}

function buildWhere(audience: string) {
  const base = { accessStatus: "ACTIVE" as const };
  switch (audience) {
    case "MEMBER":  return { ...base, membershipType: "MEMBER"  as const };
    case "VIP":     return { ...base, membershipType: "VIP"     as const };
    case "PREMIUM": return { ...base, membershipType: "PREMIUM" as const };
    case "PAYING":  return { ...base, membershipType: { in: ["MEMBER","VIP","PREMIUM"] as ("MEMBER"|"VIP"|"PREMIUM")[] } };
    default:        return { accessStatus: "ACTIVE" as const }; // ALL active
  }
}
