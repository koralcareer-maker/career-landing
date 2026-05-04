"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OnboardingTour, type TourStep } from "./onboarding-tour";

// ─── Storage key — bump when content meaningfully changes so existing
// members see the refreshed tour once.
export const DASHBOARD_TOUR_KEY = "career-in-focus:tour:dashboard:v2";

// ─── Steps — every step leads with the VALUE the member gets from the
// feature, not a description of what's on screen. Pattern: title hooks,
// body opens with the concrete benefit ("מה תקבל/י", "במקום X — Y"), then
// briefly the mechanism. Slash forms (תיכנס/י, מלא/י) keep the copy
// gender-neutral so it reads naturally to both women and men.
const STEPS: TourStep[] = [
  {
    title: "60 שניות שחוסכות שבועות",
    body: "אני קורל. אני אצביע לך על 4 דברים שיחסכו לך שעות של חיפוש לא ממוקד וניחושים — דברים שלא רואים בלי שמסבירים אותם.",
  },
  {
    targetId: "tour-stats",
    title: "מצפן ב-3 שניות, לא ציון",
    body: "מה תקבל/י: בלי לפתוח 5 דפים, את/ה יודע/ת מיד מה הצעד הבא שלך. אחוז התאמה נמוך = הפרופיל לא מלא. אפס משרות מתאימות = הקריטריונים נוקשים מדי. תהליכי גיוס פעילים = איפה הפוקוס השבוע. המספרים אומרים לך מה לעשות, לא איך אתה ׳ניצב׳.",
  },
  {
    targetId: "tour-tools",
    title: "כלים שעובדים עליך — לא תבניות",
    body: "מה תקבל/י: קורות חיים שנכתבים מהניסיון האישי שלך, מאמן ראיונות שיודע על איזה תפקיד מתראיינים, ובדיקת התאמה שמשווה את הפרופיל שלך מול דרישות אמיתיות של משרה. במקום ׳תבנית חינם׳ שכולם מקבלים — תוצר שמתחיל ממך וחוסך שעות עבודה.",
    cta: { label: "לכל הכלים", href: "/tools" },
  },
  {
    targetId: "tour-sidebar",
    title: "מאמן AI — תשובה מיידית, 24/7",
    body: "מה תקבל/י: תשובה אישית בכל רגע, על השאלות שלרוב אין למי לפנות איתן — ׳כדאי להגיש על המשרה הזו?׳, ׳איך לנסח הודעה למגייס שלא ענה?׳, ׳איך להציג חוסר ניסיון ב-X?׳. בסרגל הצדדי, הקיצור הכי שימושי שיש כאן.",
  },
  {
    title: "5 דקות שגורמות לכל השאר לעבוד",
    body: "מה תקבל/י אחרי שתמלא/י את דרכון הקריירה: ההמלצות הופכות רלוונטיות, ההתאמות מדויקות, והכלים מותאמים אישית. בלי דרכון — את/ה משתמש/ת בגרסה גנרית של מערכת אישית. זה הצעד היחיד שחובה לעשות עכשיו.",
    cta: { label: "למילוי הדרכון", href: "/profile" },
  },
];

interface Props {
  /** when true, ignore localStorage flag (used by restart button) */
  forceOpen?: boolean;
}

export function DashboardTour({ forceOpen }: Props) {
  return (
    <OnboardingTour
      storageKey={DASHBOARD_TOUR_KEY}
      steps={STEPS}
      forceOpen={forceOpen}
    />
  );
}

// ─── Wrapper that listens to ?tour=1 query param so a "restart tour"
// button anywhere in the app can simply link to /dashboard?tour=1
export function DashboardTourWithQueryTrigger() {
  const search = useSearchParams();
  const fromQuery = search.get("tour") === "1";
  const [forced, setForced] = useState(false);

  useEffect(() => {
    if (fromQuery) {
      // Clear the localStorage flag so the tour shows fresh next time too,
      // and force this render to display it now.
      try { window.localStorage.removeItem(DASHBOARD_TOUR_KEY); } catch { /* ignore */ }
      setForced(true);
    }
  }, [fromQuery]);

  return <DashboardTour forceOpen={forced} />;
}
