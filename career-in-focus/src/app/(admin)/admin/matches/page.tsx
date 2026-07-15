/**
 * /admin/matches — Coral's candidate↔job matches screen.
 *
 * Every row is one auto-matcher pairing: who, which job, the score,
 * why (title-anchored reasons), the AI verdict on mandatory
 * requirements when we got one, and whether the candidate was already
 * emailed the offer. Newest first. ?status=NEW|EMAILED filters.
 */
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Handshake, Mail, Phone, ExternalLink, Flame } from "lucide-react";
import { MigrateMatchesButton, RunMatchingButton } from "./actions-buttons";

export const dynamic = "force-dynamic";

function parseReasons(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const where = status === "NEW" || status === "EMAILED" || status === "REJECTED" ? { status } : {};

  // Table may not exist until the one-shot migration runs — render the
  // migrate button instead of a 500 in that case.
  let matches: Array<{
    id: string;
    score: number;
    reasons: string | null;
    requirementsCheck: string | null;
    status: string;
    emailedAt: Date | null;
    createdAt: Date;
    candidate: { id: string; name: string; email: string | null; phone: string | null; targetRole: string | null };
    job: { id: string; title: string; company: string | null; location: string | null; field: string | null; externalUrl: string | null; isHot: boolean };
  }> = [];
  let tableMissing = false;
  try {
    matches = await prisma.candidateMatch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        candidate: { select: { id: true, name: true, email: true, phone: true, targetRole: true } },
        job: { select: { id: true, title: true, company: true, location: true, field: true, externalUrl: true, isHot: true } },
      },
    });
  } catch {
    tableMissing = true;
  }

  const counts = { all: matches.length };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-navy flex items-center gap-2">
            <Handshake size={24} className="text-teal" />
            התאמות מועמד-משרה
          </h1>
          <p className="text-gray-500 text-sm">
            {tableMissing
              ? "הטבלה עוד לא קיימת. לחצי על יצירת טבלה להפעלה ראשונה."
              : `${counts.all} התאמות אחרונות. המערכת מתאימה אוטומטית כל מועמד חדש לפי טייטל ודרישות חובה.`}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Link href="/admin/matches">
            <Badge variant={!status ? "teal" : "gray"}>הכל</Badge>
          </Link>
          <Link href="/admin/matches?status=NEW">
            <Badge variant={status === "NEW" ? "teal" : "gray"}>חדשות</Badge>
          </Link>
          <Link href="/admin/matches?status=EMAILED">
            <Badge variant={status === "EMAILED" ? "teal" : "gray"}>נשלח מייל</Badge>
          </Link>
          <Link href="/admin/matches?status=REJECTED">
            <Badge variant={status === "REJECTED" ? "red" : "gray"}>נפסלו בדרישות</Badge>
          </Link>
          <RunMatchingButton />
          {tableMissing && <MigrateMatchesButton />}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {matches.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              {tableMissing
                ? "אחרי יצירת הטבלה, כל מועמד חדש שנכנס למערכת יותאם אוטומטית."
                : "אין התאמות עדיין. הן ייווצרו אוטומטית כשמועמדים חדשים יכנסו, או בלחיצה על הרצת התאמות."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">מועמד/ת</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">משרה</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">ציון</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">דרישות חובה</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">סטטוס</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">נוצר</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => {
                    const reasons = parseReasons(m.reasons);
                    return (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                        <td className="py-3 px-4">
                          <div className="font-bold text-navy">{m.candidate.name}</div>
                          <div className="text-xs text-gray-400">{m.candidate.targetRole ?? ""}</div>
                          <div className="flex gap-2 mt-1 text-[11px] text-gray-400">
                            {m.candidate.email && (
                              <a href={`mailto:${m.candidate.email}`} className="flex items-center gap-1 hover:text-teal">
                                <Mail size={10} /> {m.candidate.email}
                              </a>
                            )}
                            {m.candidate.phone && (
                              <span className="flex items-center gap-1">
                                <Phone size={10} /> {m.candidate.phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-navy flex items-center gap-1.5">
                            {m.job.isHot && <Flame size={12} className="text-orange-500 shrink-0" />}
                            {m.job.externalUrl ? (
                              <a href={m.job.externalUrl} target="_blank" rel="noreferrer" className="hover:text-teal flex items-center gap-1">
                                {m.job.title} <ExternalLink size={11} className="shrink-0 text-gray-300" />
                              </a>
                            ) : (
                              m.job.title
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {[m.job.company, m.job.location, m.job.field].filter(Boolean).join(" · ")}
                          </div>
                          {reasons.length > 0 && (
                            <div className="text-[11px] text-teal mt-0.5">{reasons.join(" · ")}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-black ${m.score >= 80 ? "text-teal" : "text-navy"}`}>{m.score}%</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500 max-w-[200px]">
                          {m.requirementsCheck ?? <span className="text-gray-300">לא נבדק</span>}
                        </td>
                        <td className="py-3 px-4">
                          {m.status === "EMAILED" ? (
                            <Badge variant="teal">נשלח מייל</Badge>
                          ) : m.status === "REJECTED" ? (
                            <Badge variant="red">נפסל בדרישות</Badge>
                          ) : (
                            <Badge variant="gray">חדשה</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
