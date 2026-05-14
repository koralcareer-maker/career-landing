import type { Metadata } from "next";
import "./globals.css";
import { AccessibilityWidget } from "@/components/accessibility/widget";

// metadataBase makes Next.js resolve the relative og:image URL below
// into an absolute one. WhatsApp / Facebook / Twitter all require an
// absolute URL — without this, the og:image header points at a path
// like "/logo.png" and the preview falls back to the Vercel triangle.
export const metadata: Metadata = {
  metadataBase: new URL("https://app.careerinfocus.co.il"),
  title: "קריירה בפוקוס | קהילת מחפשי עבודה בישראל",
  description: "הקהילה המקצועית למחפשי עבודה בישראל. תכנים, כלים, ניתוח קריירה, משרות ואירועים.",
  openGraph: {
    title: "קריירה בפוקוס",
    description: "הקהילה המקצועית למחפשי עבודה בישראל",
    locale: "he_IL",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1254,
        height: 1254,
        alt: "קריירה בפוקוס",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "קריירה בפוקוס",
    description: "הקהילה המקצועית למחפשי עבודה בישראל",
    images: ["/logo.png"],
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
