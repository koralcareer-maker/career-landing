"use server";

/**
 * Public recruiter-driven job submission.
 *
 * Coral wanted to share a single link (`/post-job`) with recruiters so
 * they can self-upload their roles instead of emailing them to her one
 * by one. This action takes the form data, creates a draft Job row
 * (isPublished=false), and emails Coral so she can approve from the
 * admin in one click.
 *
 * Trust model: anyone with the URL can submit. Spam protection is a
 * lightweight honeypot field (`_hp`) plus length caps. Anything that
 * looks suspicious is silently rejected — we still return success to
 * the user so the spammer can't tell they were filtered.
 */

import { prisma } from "@/lib/prisma";
import { sendRecruiterJobNotification } from "@/lib/email";

export type SubmitJobState = {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string>;
};

const FIELD_ENUM = [
  "הייטק", "תוכנה", "מחשוב", "אבטחת מידע וסייבר",
  "מכירות ושיווק", "ניהול פרויקטים", "Ad - Tech", "PPC", "דיגיטל", "אינטרנט",
  "כספים, חשבונאות וכלכלה", "ביטוח", "בנקאות",
  "משאבי אנוש", "חברת השמה",
  "מזכירות ואדמיניסטרציה", "תפעול ובק אופיס", "תפעול ושירות לקוחות",
  "נהגים, רכב ותחבורה", "לוגיסטיקה ומחסנים",
  "בנייה ונדל\"ן", "חוק ומשפט",
  "חינוך והדרכה", "חברה וקהילה",
  "מסעדנות, מלונאות ותיירות", "קמעונאות ורכש",
  "אלקטרוניקה וחומרה", "חשמל", "מכונות, תעשייה וייצור",
  "עיצוב", "בכירים", "ניהול מוקדים טלפונים", "אבטחה",
  "אחר",
];

export async function submitRecruiterJob(
  _prev: unknown,
  formData: FormData,
): Promise<SubmitJobState> {
  // Honeypot — real users don't fill hidden fields, bots do.
  if ((formData.get("_hp") as string | null)?.trim()) {
    return { ok: true }; // silent success, don't tip them off
  }

  const recruiterName  = (formData.get("recruiterName")  as string | null)?.trim().slice(0, 80) || "";
  const recruiterEmail = (formData.get("recruiterEmail") as string | null)?.trim().slice(0, 120).toLowerCase() || "";
  const recruiterPhone = (formData.get("recruiterPhone") as string | null)?.trim().slice(0, 30) || "";
  const company        = (formData.get("company")        as string | null)?.trim().slice(0, 120) || "";
  const title          = (formData.get("title")          as string | null)?.trim().slice(0, 200) || "";
  const location       = (formData.get("location")       as string | null)?.trim().slice(0, 120) || "";
  const field          = (formData.get("field")          as string | null)?.trim().slice(0, 60) || "אחר";
  const description    = (formData.get("description")    as string | null)?.trim().slice(0, 2000) || "";
  const externalUrl    = (formData.get("externalUrl")    as string | null)?.trim().slice(0, 500) || "";

  const fields = { recruiterName, recruiterEmail, recruiterPhone, company, title, location, field, description, externalUrl };

  // Required fields
  if (!recruiterName) return { error: "שם מלא הוא שדה חובה", fields };
  if (!recruiterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recruiterEmail)) return { error: "אימייל לא תקין", fields };
  if (!company)  return { error: "שם החברה הוא שדה חובה", fields };
  if (!title)    return { error: "תפקיד הוא שדה חובה", fields };
  if (description.length < 20) return { error: "תיאור המשרה קצר מדי, לפחות 20 תווים", fields };
  if (externalUrl && !/^https?:\/\//i.test(externalUrl)) return { error: "הקישור צריך להתחיל ב-http או https", fields };

  // Sanity check the requested category — fall back to "אחר" if it's
  // something off the list (form select should already constrain, but
  // never trust client input).
  const safeField = FIELD_ENUM.includes(field) ? field : "אחר";

  // Persist as unpublished draft. Source label tags the row so the
  // /admin/jobs filter can isolate recruiter submissions and Coral can
  // batch-approve.
  let createdId = "";
  try {
    const job = await prisma.job.create({
      data: {
        title,
        company,
        description,
        summary: description.slice(0, 200),
        location: location || "לא צוין",
        region: "מרכז", // recruiter form doesn't ask — Coral can fix on approve
        field: safeField,
        source: `מגייס - ${recruiterName} (${recruiterEmail})`,
        externalUrl: externalUrl || `recruiter-submission-${Date.now()}`,
        isPublished: false, // pending review
      },
      select: { id: true },
    });
    createdId = job.id;
  } catch (e) {
    // Most likely a uniqueness collision on externalUrl. Treat as success
    // so the recruiter isn't surprised, but log so we can audit.
    console.error("[submitRecruiterJob] create failed:", e);
    return { ok: true };
  }

  // Fire-and-forget admin email. Never let a failed notification break
  // the recruiter's submission.
  sendRecruiterJobNotification({
    id: createdId,
    recruiterName,
    recruiterEmail,
    recruiterPhone,
    company,
    title,
    location,
    field: safeField,
    description,
    externalUrl,
  }).catch((err) => {
    console.error("[submitRecruiterJob] notify failed:", err);
  });

  return { ok: true };
}
