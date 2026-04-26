import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CommunityClient } from "./community-client";

export default async function CommunityPage() {
  const session = await auth();
  const userId = session!.user.id;
  const userName = session!.user.name ?? null;

  const posts = await prisma.post.findMany({
    where: { isHidden: false },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true, image: true } },
      _count: { select: { likes: true, comments: true } },
      comments: {
        where: { isHidden: false },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
        take: 3,
      },
    },
  });

  return (
    <div dir="rtl">
      <CommunityClient posts={posts} userId={userId} userName={userName} />
    </div>
  );
}
