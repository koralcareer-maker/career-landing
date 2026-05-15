import { CvMatchClient } from "./cv-match-client";

export const metadata = {
  title: "בדיקת התאמת קורות חיים — כלי AI חינמי",
  description:
    "העלי קורות חיים והדביקי תיאור משרה — ב-15 שניות תקבלי ציון התאמה מקצועי, 3 חוזקות, 3 פערים שמעכבים אותך, ופעולות קונקרטיות להעלאת הסיכוי לראיון. ללא הרשמה.",
  alternates: { canonical: "https://app.careerinfocus.co.il/cv-match" },
  openGraph: {
    title: "בדיקת התאמת קורות חיים — חינם, ללא הרשמה",
    description:
      "כלי AI מקצועי שאומר לך בכנות כמה הקו\"ח שלך מתאימים למשרה — ומה לעשות כדי לעבור ל-90%+. תוצאה תוך 15 שניות.",
    url: "https://app.careerinfocus.co.il/cv-match",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "בדיקת התאמת קו\"ח — AI חינמי",
    description: "ציון התאמה מקצועי + פערים ספציפיים + פעולות. בלי הרשמה. תוצאה ב-15 שניות.",
  },
};

/**
 * Public CV-Match landing — the top-of-funnel lead magnet Coral asked
 * for. No auth required. Visitor uploads/pastes a CV + a job
 * description, gets a professional AI analysis on screen, then sees
 * locked premium features that the paid platform unlocks.
 *
 * This is THE conversion engine — the page is engineered for:
 *   1. Immediate value (no signup wall)
 *   2. Visceral, shareable score
 *   3. Specific gaps that create urgency
 *   4. Clear "what you get with the platform" upgrade prompt
 */
export default function CvMatchPage() {
  return <CvMatchClient />;
}
