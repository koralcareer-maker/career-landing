import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Camera } from "lucide-react";
import { listUserHistory } from "@/lib/blob";
import { PremiumGate } from "@/components/premium-gate";
import { LinkedInPhotoClient } from "./linkedin-photo-client";

export const metadata = { title: "מחולל תמונת לינקדאין | קריירה בפוקוס" };
export const dynamic = "force-dynamic";

export default async function LinkedInPhotoPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // ─── Premium gate ─────────────────────────────────────────────────────────
  // The LinkedIn photo generator is a premium-tier benefit. Non-premium
  // members see the upsell component. Admins bypass the gate so they can
  // QA every feature regardless of their own membership level.
  // Admins can pass ?preview=gate in the URL to preview the gate UI
  // without leaving their admin account.
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  // Tool is available on PRO ("PREMIUM" internally) and VIP tiers.
  const isPaidTier =
    session.user.membershipType === "PREMIUM" ||
    session.user.membershipType === "VIP";
  const params = await searchParams;
  const previewGate = isAdmin && params.preview === "gate";

  if (previewGate || (!isAdmin && !isPaidTier)) {
    return (
      <PremiumGate
        feature="מחולל תמונת תדמית AI"
        featureDesc="3 תמונות יומיומיות שלך הופכות ל-10 תמונות פרופיל מקצועיות באיכות סטודיו."
        featureIcon={<Camera size={28} className="text-teal" />}
      />
    );
  }

  // ─── Premium user — load history and render the actual tool ───────────────
  let initialHistory: Awaited<ReturnType<typeof listUserHistory>> = [];
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      initialHistory = await listUserHistory(session.user.id, 12);
    } catch (e) {
      console.error("[linkedin-photo/page] failed to load history:", e);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <LinkedInPhotoClient userId={session.user.id} initialHistory={initialHistory} userGender={session.user.gender ?? null} />
    </div>
  );
}
