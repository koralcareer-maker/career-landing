import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { matchCourseToUser } from "@/lib/matching";
import { getUserCompletions } from "@/lib/actions/completions";
import { CoursesClient } from "./courses-client";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [profile, passport, rawCourses, completions] = await Promise.all([
    userId ? prisma.profile.findUnique({ where: { userId } }) : Promise.resolve(null),
    userId ? prisma.careerPassport.findUnique({ where: { userId } }) : Promise.resolve(null),
    prisma.course.findMany({
      where: { isPublished: true },
      include: { contents: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
    // Tolerate missing tables — the course-completion model may not be
    // migrated yet on the production DB. In that case, render the page
    // without the "completed" check rather than crashing.
    getUserCompletions().catch(() => ({ courseIds: new Set<string>(), skills: new Set<string>() })),
  ]);

  // Score every course against the user, then sort highest-match first.
  // CoursesClient receives the score so it can render a "מותאם לך" badge
  // and the catalogue feels personal rather than a flat list.
  const courses = rawCourses
    .map((c) => {
      const match = matchCourseToUser(c, profile, passport);
      return {
        ...c,
        matchScore: match.score,
        matchReasons: match.reasons,
        completed: completions.courseIds.has(c.id),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const categories = [...new Set(courses.map((c) => c.category).filter(Boolean))] as string[];

  return (
    <div dir="rtl">
      <CoursesClient courses={courses} categories={categories} />
    </div>
  );
}
