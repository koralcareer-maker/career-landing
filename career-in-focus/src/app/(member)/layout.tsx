import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";
import { Footer } from "@/components/layout/footer";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { prisma } from "@/lib/prisma";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.accessStatus !== "ACTIVE") {
    redirect("/payment/pending");
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
        <main className="flex-1 px-4 py-6 md:px-8 pb-24 md:pb-8 animate-fade-in">
          {children}
        </main>
        <Footer />
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
