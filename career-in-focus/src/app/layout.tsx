import type { Metadata } from "next";
import "./globals.css";

// metadataBase makes Next.js resolve the relative og:image URL below
// into an absolute one. WhatsApp / Facebook / Twitter all require an
// absolute URL — without this, the og:image header points at a path
// like "/logo.png" and the preview falls back to the Vercel triangle.
export const metadata: Metadata = {
  metadataBase: new URL("https://career-landing-tau.vercel.app"),
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
        width: 1080,
        height: 1080,
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
      <body className="min-h-full flex flex-col font-sans antialiased">{children}</body>
    </html>
  );
}
