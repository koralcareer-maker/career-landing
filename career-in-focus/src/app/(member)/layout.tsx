import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";
import { Footer } from "@/components/layout/footer";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { prisma } from "@/lib/prisma";

// FREE-tier users are logged in but only paid for the job-board slice.
// Anything outside this allow-list should bounce them back to /jobs
// (or /pricing if they try billing/account settings, so they can upgrade).
const FREE_ALLOWED_PREFIXES = ["/jobs"];

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.accessStatus !== "ACTIVE") {
    redirect("/payment/pending");
  }

  // FREE tier gate. subscriptionStatus="FREE" identifies users who
  // signed up via the ₪0 plan — they can view the job board but
  // nothing else. Full members / VIP / admins pass through.
  const isFreeTier = session.user.subscriptionStatus === "FREE";
  if (isFreeTier && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    const path = (await headers()).get("x-pathname");
    // Fail-open when the header is missing (middleware not running or
    // stripped by an edge cache) — redirecting on an unknown path
    // would loop forever, since /jobs itself renders this layout.
    if (path) {
      const allowed = FREE_ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
      if (!allowed) redirect("/jobs");
    }
  }

  // Get unread notification count
  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  const user = {
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    image: session.user.image,
    gender: session.user.gender,
  };

  const isImpersonating = !!session.user.impersonatedByAdminId;

  return (
    <div className="min-h-screen bg-cream">
      {isImpersonating && <ImpersonationBanner asName={session.user.name ?? session.user.email} />}

      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar user={user} unreadCount={unreadCount} />
      </div>

      {/* Main content */}
      <div className="md:mr-64 flex flex-col min-h-screen">
        <TopBar user={user} unreadCount={unreadCount} />
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-6 md:px-8 pb-24 md:pb-8 animate-fade-in">
          {children}
        </main>
        <Footer />
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
