import Script from "next/script";

/**
 * Public-route layout — wraps the marketing-facing pages (landing,
 * pricing, login, signup, about, accessibility, privacy, terms,
 * contact, forgot-password, reset-password). Authenticated routes
 * live under the (member) group and never see this layout.
 *
 * Purpose: inject JSON-LD structured data (Organization + WebSite)
 * on every public page so Google can render rich results — sitelinks,
 * brand panel, search box — when someone searches "קריירה בפוקוס".
 * Structured data on the marketing pages compounds across the site,
 * so it's better here than on a single page.
 *
 * The data is split into two graph nodes:
 *   1. Organization — who we are, where to find us
 *   2. WebSite — the site itself, with potential SearchAction for
 *      Google's site-search rich result
 *
 * Add LocalBusiness later if we ever need to surface in Maps; for now
 * the platform is online-only.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://app.careerinfocus.co.il/#organization",
        name: "קריירה בפוקוס",
        alternateName: "Career in Focus",
        url: "https://app.careerinfocus.co.il",
        logo: {
          "@type": "ImageObject",
          url: "https://app.careerinfocus.co.il/logo.png",
          width: 1254,
          height: 1254,
        },
        founder: {
          "@type": "Person",
          name: "קורל שלו",
          jobTitle: "מייסדת ומאמנת קריירה",
        },
        areaServed: {
          "@type": "Country",
          name: "Israel",
        },
        sameAs: [
          // Coral can add real social URLs later; empty array is fine.
        ],
        contactPoint: {
          "@type": "ContactPoint",
          email: "info@careerinfocus.co.il",
          contactType: "customer service",
          areaServed: "IL",
          availableLanguage: ["Hebrew", "English"],
        },
      },
      {
        "@type": "WebSite",
        "@id": "https://app.careerinfocus.co.il/#website",
        url: "https://app.careerinfocus.co.il",
        name: "קריירה בפוקוס",
        description:
          "פלטפורמה מקצועית למחפשי עבודה בישראל: דרכון קריירה מבוסס AI, ניתוח אישי מעמיק, מאמן AI אישי, אלפי משרות מעודכנות, וקהילה מקצועית.",
        publisher: { "@id": "https://app.careerinfocus.co.il/#organization" },
        inLanguage: "he-IL",
      },
    ],
  };

  return (
    <>
      <Script
        id="ld-organization"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
