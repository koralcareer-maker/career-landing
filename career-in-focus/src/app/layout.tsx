import type { Metadata } from "next";
import "./globals.css";
import { AccessibilityWidget } from "@/components/accessibility/widget";

// metadataBase makes Next.js resolve relative og:image URLs into
// absolute ones. WhatsApp / Facebook / Twitter / LinkedIn all require
// an absolute URL — without this the preview falls back to the Vercel
// triangle.
//
// This file's title/description/keywords seed every page on the site.
// Per-page metadata overrides specific fields where relevant (e.g.,
// the pricing page sets its own title via its export const metadata).
export const metadata: Metadata = {
  metadataBase: new URL("https://app.careerinfocus.co.il"),
  title: {
    default: "קריירה בפוקוס | כל מה שצריך כדי למצוא את העבודה הבאה שלך",
    // %s gets replaced by page-specific titles, e.g. "פרופיל | קריירה בפוקוס"
    template: "%s | קריירה בפוקוס",
  },
  description:
    "כל מה שצריך כדי למצוא את העבודה הבאה שלך: דרכון קריירה מבוסס AI, ניתוח אישי מעמיק, מאמן AI אישי, אלפי משרות מעודכנות, ספריית מגייסים, וקהילה מקצועית של מחפשי עבודה בישראל.",
  keywords: [
    "חיפוש עבודה",
    "קריירה",
    "ניתוח קריירה",
    "מאמן קריירה",
    "מאמן AI",
    "כלים לחיפוש עבודה",
    "משרות בישראל",
    "תפקידים בכירים",
    "ניהול קריירה",
    "קהילת מחפשי עבודה",
    "דרכון קריירה",
    "ייעוץ קריירה ישראל",
  ],
  authors: [{ name: "קורל שלו" }],
  creator: "קורל שלו",
  publisher: "קריירה בפוקוס",
  applicationName: "קריירה בפוקוס",
  // Canonical so Google doesn't index both apex + www separately.
  alternates: {
    canonical: "https://app.careerinfocus.co.il",
    languages: { he: "https://app.careerinfocus.co.il" },
  },
  // Tell crawlers to index everything that isn't disallowed by robots.ts.
  // Specific authenticated routes set their own noindex in their pages.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "קריירה בפוקוס — כל מה שצריך כדי למצוא את העבודה הבאה שלך",
    description:
      "דרכון קריירה AI, מאמן AI אישי, אלפי משרות מעודכנות, וקהילה מקצועית של מחפשי עבודה בישראל. כל מה שצריך כדי למצוא את העבודה הבאה שלך — במקום אחד.",
    locale: "he_IL",
    type: "website",
    siteName: "קריירה בפוקוס",
    url: "https://app.careerinfocus.co.il",
    images: [
      {
        url: "/logo.png",
        width: 1254,
        height: 1254,
        alt: "קריירה בפוקוס — כל מה שצריך כדי למצוא את העבודה הבאה שלך",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "קריירה בפוקוס — כל מה שצריך כדי למצוא את העבודה הבאה שלך",
    description:
      "דרכון AI, מאמן AI אישי, אלפי משרות, וקהילה. כל מה שצריך כדי למצוא את העבודה הבאה שלך.",
    images: ["/logo.png"],
  },
  // Add the Search Console verification code here once Coral creates a
  // property + grabs the meta value. Empty for now — env var override.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
  // Israeli geo-targeting hint for Bing / Yandex / DuckDuckGo.
  other: {
    "geo.region": "IL",
    "geo.placename": "Israel",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col font-sans antialiased">
        {/* Skip-to-content link — visually hidden until focused. Required
            by WCAG so keyboard users can bypass header/nav repeats. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[10000] focus:bg-teal focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:outline-none focus:ring-2 focus:ring-white"
        >
          דילוג לתוכן הראשי
        </a>
        {children}
        {/* Floating accessibility widget — visible on every page. */}
        <AccessibilityWidget />
      </body>
    </html>
  );
}
