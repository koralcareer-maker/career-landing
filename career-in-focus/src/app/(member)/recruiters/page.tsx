import { prisma } from "@/lib/prisma";
import { RecruitersClient } from "./recruiters-client";

export const dynamic = "force-dynamic";

export default async function RecruitersPage() {
  const recruiters = await prisma.recruiter.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div dir="rtl">
      <RecruitersClient recruiters={recruiters} />
    </div>
  );
}
