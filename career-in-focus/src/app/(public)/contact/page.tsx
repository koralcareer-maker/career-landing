import Link from "next/link";
import { ContactForm } from "./contact-form";

export const metadata = { title: "צרי קשר | קריירה בפוקוס" };

/**
 * Public contact page — central inbox for cancellation requests,
 * privacy questions, accessibility reports, and general inquiries.
 *
 * Why a form instead of mailto: opening @cancel / @privacy aliases
 * requires DNS / Google Workspace admin access, which is owned by
 * Coral. A form is also better operationally — every request lands
 * in the same /admin/leads panel with a topic tag, so nothing slips
 * through to a personal inbox that might get missed.
 *
 * Topic is pre-fillable via ?topic=cancel|privacy|accessibility|general
 * so links from the legal pages land users on the right pre-selected
 * subject without an extra click.
 */
export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ topic?: string }>;
}) {
  const params = (await searchParams) ?? {};
  return (
    <div className="min-h-screen bg-cream px-6 py-12" dir="rtl">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center text-white font-bold text-sm">ק</div>
          <span className="font-bold text-navy">קריירה בפוקוס</span>
        </Link>

        <div className="bg-white rounded-2xl p-8 border border-black/5 shadow-sm">
          <h1 className="text-3xl font-black text-navy mb-2">צרי קשר</h1>
          <p className="text-slate-600 text-sm mb-6">
            כל פנייה מגיעה ישירות לקורל ונענית תוך 5 ימי עסקים. למענה מהיר יותר ניתן
            לבחור את הנושא הנכון בטופס.
          </p>

          <ContactForm initialTopic={params.topic ?? "general"} />
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          <Link href="/" className="hover:text-teal transition-colors">
            ← חזרה לעמוד הבית
          </Link>
        </p>
      </div>
    </div>
  );
}
