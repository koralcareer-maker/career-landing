import { Metadata } from "next";
import JoinForm from "./join-form";

export const metadata: Metadata = {
  title: "הצטרפו חינם ללוח המשרות של קורל",
  description:
    "הרשמה חינמית לקבלת עדכון במייל כשנמצאות משרות חדשות שמתאימות לך. אלפי משרות מתחומים שונים, מתחדשות מדי יום. בלי עלות, בלי מחויבות, ביטול בכל עת.",
  alternates: { canonical: "https://app.careerinfocus.co.il/join" },
  openGraph: {
    title: "הצטרפו חינם ללוח המשרות של קורל",
    description: "הרשמה חינמית + עדכון במייל כשנמצאות משרות חדשות שמתאימות לך",
    url: "https://app.careerinfocus.co.il/join",
    type: "website",
  },
};

export default function JoinPage() {
  return <JoinForm />;
}
