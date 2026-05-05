import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BillingClient } from "./billing-client";
import { amountForCycle, planLabel, formatPrice, type PlanKey } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const metadata = { title: "המנוי שלך | קריירה בפוקוס" };

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      membershipType:      true,
      accessStatus:        true,
      paidAt:              true,
      cardLast4:           true,
      subscriptionStatus:  true,
      nextChargeAt:        true,
      lastChargedAt:       true,
      chargeCount:         true,
      cancelledAt:         true,
      cancellationReason:  true,
    },
  });
  if (!user) redirect("/login");

  // Members on no plan land on /pricing — there's nothing to manage yet.
  if (!user.membershipType || user.membershipType === "NONE") {
    redirect("/pricing");
  }

  const planKey = user.membershipType as PlanKey;
  const nextAmount = amountForCycle(planKey, user.chargeCount);

  return (
    <BillingClient
      data={{
        plan:               planKey,
        planLabel:          planLabel(planKey),
        accessStatus:       user.accessStatus,
        subscriptionStatus: user.subscriptionStatus ?? "ACTIVE",
        cardLast4:          user.cardLast4,
        nextChargeAt:       user.nextChargeAt?.toISOString() ?? null,
        lastChargedAt:      user.lastChargedAt?.toISOString() ?? null,
        nextAmountFormatted: formatPrice(nextAmount),
        chargeCount:        user.chargeCount,
        cancelledAt:        user.cancelledAt?.toISOString() ?? null,
        cancellationReason: user.cancellationReason,
      }}
    />
  );
}
