import { Metadata } from "next";
import JoinForm from "./join-form";

export const metadata: Metadata = {
  title: "הצטרפי חינם ללוח המשרות של קורל — קריירה בפוקוס",
  description:
    "הרשמה חינמית לקבלת התראות יומיות על משרות חדשות שמתאימות לך. אלפי משרות מתחומים שונים, מתחדשות מדי יום — בלי עלות, בלי מחויבות, ביטול בכל עת.",
  alternates: { canonical: "https://app.careerinfocus.co.il/join" },
  openGraph: {
    title: "הצטרפי חינם ללוח המשרות של קורל",
    description: "הרשמה חינמית + סיכום יומי של משרות חדשות שמתאימות לך במייל",
    url: "https://app.careerinfocus.co.il/join",
    type: "website",
  },
};

export default function JoinPage() {
  return <JoinForm />;
}
