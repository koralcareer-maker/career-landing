import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import {
  Mail, MessageCircle, Phone,
  Sparkles, Heart, ChevronLeft,
} from "lucide-react";

// ─── Brand icons — lucide-react removed branded logos for trademark reasons,
// so we ship our own inline SVGs.
type IconProps = { size?: number; className?: string };

function TikTokIcon({ size = 16, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.86a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.29z"/>
    </svg>
  );
}

function InstagramIcon({ size = 16, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

function FacebookIcon({ size = 16, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function LinkedinIcon({ size = 16, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

// ─── Stats are pulled live from the DB so the numbers never lie. ───────────
// For numbers we don't track in the DB yet (graduates, lifetime members),
// we show curated marketing figures the team can update over time.
async function getFooterStats() {
  try {
    const [memberCount, jobCount, courseCount] = await Promise.all([
      prisma.user.count(),
      prisma.job.count({ where: { isPublished: true } }),
      prisma.course.count({ where: { isPublished: true } }),
    ]);
    return { memberCount, jobCount, courseCount };
  } catch {
    return { memberCount: 0, jobCount: 0, courseCount: 0 };
  }
}

function formatBigNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${n}`;
}

export async function Footer() {
  const { memberCount, jobCount, courseCount } = await getFooterStats();

  // Live + curated stats — like brain's hero strip but in teal/cream.
  const stats = [
    { value: `${formatBigNumber(memberCount)}+`, label: "חברות בקהילה" },
    { value: `${jobCount}+`,                     label: "משרות פעילות" },
    { value: `${courseCount}+`,                  label: "קורסים מקצועיים" },
    { value: "4",                                label: "כלי AI חכמים" },
    { value: "100%",                             label: "ליווי אישי" },
  ];

  const navLinks = [
    { href: "/dashboard",  label: "דשבורד" },
    { href: "/jobs",       label: "משרות" },
    { href: "/courses",    label: "קורסים" },
    { href: "/tools",      label: "כלי AI" },
    { href: "/profile",    label: "דרכון קריירה" },
    { href: "/community",  label: "קהילה" },
  ];

  const services = [
    { href: "/coaching",          label: "מאמן AI אישי" },
    { href: "/koral-connections", label: "קורל תפעילי קשרים" },
    { href: "/events",            label: "אירועים ומפגשים" },
    { href: "/skills",            label: "פיתוח מיומנויות" },
    { href: "/recruiters",        label: "מאגר מגייסים" },
    { href: "/guide",             label: "מדריך למשתמשת" },
  ];

  const socials = [
    { href: "https://chat.whatsapp.com/BbBAf0p0R01GrNgf5GQjMg",                 label: "קבוצת הוואטסאפ",   icon: MessageCircle, brand: "from-[#25D366] to-[#128C7E]" },
    { href: "https://www.instagram.com/koral_shalev/",                          label: "אינסטגרם",         icon: InstagramIcon, brand: "from-[#F58529] via-[#DD2A7B] to-[#8134AF]" },
    { href: "https://www.tiktok.com/@koralshalev",                              label: "טיקטוק",            icon: TikTokIcon,    brand: "from-[#FF0050] via-[#000000] to-[#00F2EA]" },
    { href: "https://www.linkedin.com/in/koral-shalev-29430816a/",              label: "לינקדאין",          icon: LinkedinIcon,  brand: "from-[#0A66C2] to-[#004182]" },
    { href: "https://www.facebook.com/profile.php?id=100076055198052",          label: "פייסבוק",           icon: FacebookIcon,  brand: "from-[#1877F2] to-[#0E5BC2]" },
    { href: "tel:+972535777005",                                                label: "0535777005",        icon: Phone,         brand: "from-navy-light to-navy" },
    { href: "mailto:koralcareer@gmail.com",                                     label: "koralcareer@gmail.com", icon: Mail,     brand: "from-teal to-teal-dark" },
  ];

  return (
    <footer className="relative mt-16 overflow-hidden" dir="rtl">
      {/* ─── Stats strip — bold, large numbers like brainai's hero stats ─── */}
      <div className="relative bg-gradient-to-br from-navy via-[#23233D] to-navy text-white py-10 px-6">
        {/* Decorative glow blobs */}
        <div aria-hidden className="absolute -top-20 -right-10 w-72 h-72 bg-teal/20 rounded-full blur-3xl" />
        <div aria-hidden className="absolute -bottom-20 -left-10 w-72 h-72 bg-[#FFB088]/15 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-4">
            {stats.map((s, i) => (
              <div key={s.label} className="text-center group">
                <p className={`text-4xl sm:text-5xl font-black bg-gradient-to-l ${
                  i % 2 === 0
                    ? "from-teal to-[#7FE7E7]"
                    : "from-[#FFD7BD] to-[#FFB088]"
                } bg-clip-text text-transparent leading-none mb-2 group-hover:scale-110 transition-transform inline-block`}>
                  {s.value}
                </p>
                <p className="text-white/70 text-xs sm:text-sm font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Main footer body ─── */}
      <div className="relative bg-gradient-to-b from-navy to-[#0F0F1E] text-white/80 py-12 px-6">
        {/* Decorative ambient glows */}
        <div aria-hidden className="absolute top-1/3 right-1/4 w-96 h-96 bg-teal/10 rounded-full blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#A78BFA]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">

            {/* ─── Brand area — Coral as the face of the brand ─── */}
            <div className="md:col-span-5 lg:col-span-4">
              <div className="flex items-start gap-4 mb-5">
                <div className="relative shrink-0">
                  {/* Glow ring around photo */}
                  <div className="absolute inset-0 bg-gradient-to-br from-teal to-[#FFB088] rounded-3xl blur-md opacity-60" />
                  <div className="relative w-24 h-24 rounded-3xl overflow-hidden ring-2 ring-teal/40 shadow-2xl shadow-teal/20">
                    <Image
                      src="/koral.jpg"
                      alt="קורל שלו - מייסדת קריירה בפוקוס"
                      width={192}
                      height={192}
                      quality={95}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="absolute -bottom-1 -left-1 bg-teal text-navy w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                    <Sparkles size={14} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Image src="/logo.png" alt="קריירה בפוקוס" width={28} height={28} className="rounded-lg opacity-95" />
                    <span className="font-black text-white text-lg">קריירה בפוקוס</span>
                  </div>
                  <p className="text-teal text-sm font-bold mb-1">קורל • מייסדת ומנהלת</p>
                  <p className="text-white/60 text-xs leading-relaxed">
                    אני בונה את המקום שאני הייתי רוצה לקבל בתחילת הדרך — קהילה, ליווי וכלים שבאמת עובדים.
                  </p>
                </div>
              </div>

              {/* Signature CTA — WhatsApp group join */}
              <a
                href="https://chat.whatsapp.com/BbBAf0p0R01GrNgf5GQjMg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 bg-gradient-to-l from-[#25D366] to-[#128C7E] hover:shadow-xl hover:shadow-[#25D366]/30 hover:-translate-y-0.5 transition-all rounded-2xl px-5 py-3.5 text-white font-bold group"
              >
                <span className="flex items-center gap-2.5">
                  <MessageCircle size={18} />
                  <span className="text-sm">הצטרפי לקבוצת הוואטסאפ</span>
                </span>
                <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              </a>

              <p className="text-white/40 text-[11px] mt-3 leading-relaxed">
                עדכוני משרות, טיפים שבועיים וקהילה תומכת
              </p>
            </div>

            {/* ─── Quick nav ─── */}
            <div className="md:col-span-3 lg:col-span-2">
              <h3 className="text-teal font-black text-sm mb-4 flex items-center gap-1.5">
                <span className="w-1 h-4 bg-teal rounded-full" />
                ניווט מהיר
              </h3>
              <ul className="space-y-2.5">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-white/70 hover:text-teal text-sm transition-colors flex items-center gap-1.5 group">
                      <ChevronLeft size={12} className="text-teal/40 group-hover:text-teal group-hover:-translate-x-0.5 transition-all" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ─── Services ─── */}
            <div className="md:col-span-4 lg:col-span-3">
              <h3 className="text-teal font-black text-sm mb-4 flex items-center gap-1.5">
                <span className="w-1 h-4 bg-teal rounded-full" />
                השירותים שלנו
              </h3>
              <ul className="space-y-2.5">
                {services.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-white/70 hover:text-teal text-sm transition-colors flex items-center gap-1.5 group">
                      <ChevronLeft size={12} className="text-teal/40 group-hover:text-teal group-hover:-translate-x-0.5 transition-all" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ─── Social CTAs — colorful brand-colored buttons ─── */}
            <div className="md:col-span-12 lg:col-span-3">
              <h3 className="text-teal font-black text-sm mb-4 flex items-center gap-1.5">
                <span className="w-1 h-4 bg-teal rounded-full" />
                בואו נתחבר
              </h3>
              <div className="space-y-2.5">
                {socials.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.href}
                      href={s.href}
                      target={s.href.startsWith("http") ? "_blank" : undefined}
                      rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal/40 rounded-xl px-3.5 py-2.5 text-sm text-white/80 hover:text-white transition-all group"
                    >
                      <div className={`w-8 h-8 bg-gradient-to-br ${s.brand} rounded-lg flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                        <Icon size={15} className="text-white" />
                      </div>
                      <span className="flex-1 font-semibold">{s.label}</span>
                      <ChevronLeft size={14} className="text-white/40 group-hover:text-teal group-hover:-translate-x-0.5 transition-all shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ─── Divider with subtle gradient ─── */}
          <div className="mt-12 pt-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
              <p className="flex items-center gap-1.5">
                © 2026 קריירה בפוקוס • נבנה
                <Heart size={11} className="text-[#FFB088] fill-[#FFB088]" />
                בישראל
              </p>
              <div className="flex items-center gap-5">
                <Link href="/terms" className="hover:text-teal transition-colors">תנאי שימוש</Link>
                <Link href="/privacy" className="hover:text-teal transition-colors">מדיניות פרטיות</Link>
                <Link href="/about" className="hover:text-teal transition-colors">אודות</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
