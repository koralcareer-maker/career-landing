import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteJob, toggleJobPublished } from "@/lib/actions/admin";
import Link from "next/link";
import { Plus, Trash2, Eye, EyeOff, Flame, Pencil } from "lucide-react";

export default async function AdminJobsPage() {
  const jobs = await prisma.job.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">ניהול משרות</h1>
          <p className="text-gray-500 text-sm">{jobs.length} משרות</p>
        </div>
        <Link href="/admin/jobs/new">
          <Button><Plus size={15} /> משרה חדשה</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">תפקיד</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">חברה</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">מיקום</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">תחום</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">סטטוס</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">נוצר</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-navy">
                      <div className="flex items-center gap-1.5">
                        {job.isHot && <Flame size={12} className="text-orange-500" />}
                        {job.title}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{job.company}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{job.location ?? "—"}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{job.field ?? "—"}</td>
                    <td className="py-3 px-4">
                      <Badge variant={job.isPublished ? "green" : "gray"} size="sm">
                        {job.isPublished ? "פורסם" : "טיוטה"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(job.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/jobs/${job.id}/edit`} className="p-1.5 rounded-lg hover:bg-teal-pale text-teal transition-colors" title="עריכה">
                          <Pencil size={13} />
                        </Link>
                        <form action={async () => { "use server"; await toggleJobPublished(job.id, !job.isPublished); }}>
                          <button type="submit" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title={job.isPublished ? "הסתר" : "פרסם"}>
                            {job.isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </form>
                        <form action={async () => { "use server"; await deleteJob(job.id); }}>
                          <button type="submit" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
