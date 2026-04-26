import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "קריירה בפוקוס | קהילת מחפשי עבודה בישראל",
  description: "הקהילה המקצועית למחפשי עבודה בישראל. תכנים, כלים, ניתוח קריירה, משרות ואירועים.",
  openGraph: {
    title: "קריירה בפוקוס",
    description: "הקהילה המקצועית למחפשי עבודה בישראל",
    locale: "he_IL",
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
