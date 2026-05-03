"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OnboardingTour, type TourStep } from "./onboarding-tour";

// ─── Storage key — bump this when the tour content meaningfully changes
// so existing members see the new tour once.
export const DASHBOARD_TOUR_KEY = "career-in-focus:tour:dashboard:v1";

// ─── Steps — ordered narration that walks a new member through the dashboard.
// Each step targets a `data-tour-id` placed on a real element, OR has no
// targetId for an intro / outro card centered on screen.
const STEPS: TourStep[] = [
  {
    title: "ברוכה הבאה לקריירה בפוקוס ✨",
    body: "אני קורל. בואי נעבור יחד 60 שניות על הדף הזה ואני אסביר איפה כל דבר נמצא ומאיפה הכי כדאי להתחיל.",
  },
  {
    targetId: "tour-hero",
    title: "הכרטיס הראשון — את",
    body: "כאן יוצגו לך תמיד הברכה האישית, ההמלצות שלי, וקיצורי דרך לחיפוש משרות ולמאמן AI. זה ה-״בית״ שלך כל פעם שתיכנסי.",
  },
  {
    targetId: "tour-stats",
    title: "המספרים שלך",
    body: "4 כרטיסיות סטטיסטיקה: כמה משרות מתאימות לך, כמה קורסים רלוונטיים, אחוז התאמה לקריירת היעד שלך, וכמה תהליכי גיוס פעילים.\nלחיצה על כל כרטיסיה מובילה ישר לפעולה.",
  },
  {
    targetId: "tour-hired",
    title: "כשאת מתקבלת — חוגגות יחד 🎉",
    body: "כשתקבלי תפקיד חדש - לחצי כאן לשתף עם הקהילה. ההצלחה שלך היא בדיוק ההוכחה שמשתמשות אחרות צריכות.",
  },
  {
    targetId: "tour-tools",
    title: "כלי AI מוכנים לעזור",
    body: "מחולל קורות חיים, מכין לראיונות, בודק התאמה למשרה ועוד. הכלים הם חינמיים לבעלות מינוי - השתמשי בהם מתי שצריך.",
    cta: { label: "בואי נראה את הכלים", href: "/tools" },
  },
  {
    targetId: "tour-sidebar",
    title: "ניווט - הכל כאן בצד",
    body: "הסרגל בצד הוא המפה של המערכת:\n• דשבורד — חזרה הביתה\n• מאמן AI — שאלות אישיות\n• פרופיל — דרכון הקריירה שלך\n• משרות / קורסים / כלים — הליבה\n• קהילה — נשים אחרות בדרך",
  },
  {
    title: "הצעד הראשון שלך — מלאי דרכון קריירה",
    body: "הדרכון הוא הבסיס לכל ההתאמות. ללא דרכון לא נדע מה תפקיד היעד שלך, אילו מיומנויות יש לך, ומה הפערים. זה לוקח 5 דקות וזה משנה הכל.",
    cta: { label: "מלאי דרכון עכשיו", href: "/profile" },
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
