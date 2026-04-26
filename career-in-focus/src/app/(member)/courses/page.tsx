import { prisma } from "@/lib/prisma";
import { CoursesClient } from "./courses-client";

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    include: { contents: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  // Collect unique non-null categories
  const categories = [...new Set(courses.map((c) => c.category).filter(Boolean))] as string[];

  return (
    <div dir="rtl">
      <CoursesClient courses={courses} categories={categories} />
    </div>
  );
}
