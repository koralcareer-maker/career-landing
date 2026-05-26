/**
 * /admin/candidates — Coral's candidate pool view
 *
 * Surfaces every CV ingested from Canva, Gmail, WhatsApp, and the
 * upcoming public lead form. The pool is the source of truth for the
 * auto-matcher (next-up: sigma.js graph that shows which candidates
 * match which open jobs).
 *
 * For each row we show the most useful identifying fields (name,
 * target role, field, region, contact info, source). The migrate
 * button at the top one-shot creates the Candidate table in Turso
 * because Vercel doesn't run `prisma migrate deploy` automatically.
 */
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, ExternalLink } from "lucide-react";
import { MigrateCandidateTableButton } from "./migrate-button";

export const dynamic = "force-dynamic";

interface CandidateRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  targetRole: string | null;
  field: string | null;
  region: string | null;
  yearsExperience: number | null;
  currentCompany: string | null;
  source: string;
  cvUrl: string | null;
  createdAt: Date;
}

export default async function AdminCandidatesPage() {
  // Wrap in try/catch — if the table doesn't exist yet the page should
  // still render so Coral can click the migrate button.
  let candidates: CandidateRow[] = [];
  let tableMissing = false;
  try {
    candidates = await prisma.candidate.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true, name: true, email: true, phone: true,
        targetRole: true, field: true, region: true,
        yearsExperience: true, currentCompany: true,
        source: true, cvUrl: true, createdAt: true,
      },
    });
  } catch (e) {
    // P2021 / "no such table" → table not yet created in Turso.
    tableMissing = true;
    void e;
  }

  // Breakdown by source so Coral sees at a glance how each connector is doing.
  const bySource = candidates.reduce<Record<string, number>>((acc, c) => {
    acc[c.source] = (acc[c.source] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-navy">מאגר מועמדים</h1>
          <p className="text-gray-500 text-sm">
            {tableMissing
              ? "הטבלה עדיין לא קיימת ב-Turso. לחצי על הכפתור להפעיל את ה-migration."
              : `${candidates.length} מועמדים${
                  Object.keys(bySource).length
                    ? ` (${Object.entries(bySource)
                        .map(([s, n]) => `${s}: ${n}`)
                        .join(", ")})`
                    : ""
                }`}
          </p>
        </div>
        <MigrateCandidateTableButton />
      </div>

      {tableMissing ? (
        <Card>
          <CardContent className="p-6 text-sm text-gray-600">
            לוחצים על &quot;הפעלת migration&quot; למעלה. אחרי שזה רץ, רעננו את הדף ותתחילו לראות מועמדים.
          </CardContent>
        </Card>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-gray-600">
            המאגר ריק. אני מתחילה לשאוב קו&quot;ח מ-Canva ומ-Gmail עכשיו, וזה ימלא את הטבלה לאט תוך כדי שהדפלוי רץ.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">שם</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">תפקיד מבוקש</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">תחום</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">אזור</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">ניסיון</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">חברה אחרונה</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">קשר</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">מקור</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">נוצר</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-navy">{c.name}</td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{c.targetRole ?? "—"}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{c.field ?? "—"}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{c.region ?? "—"}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {c.yearsExperience != null ? `${c.yearsExperience} שנים` : "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{c.currentCompany ?? "—"}</td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex items-center gap-2">
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="text-teal hover:text-teal-dark" title={c.email}>
                              <Mail size={13} />
                            </a>
                          )}
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="text-teal hover:text-teal-dark" title={c.phone}>
                              <Phone size={13} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="gray" size="sm">{c.source}</Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(c.createdAt)}</td>
                      <td className="py-3 px-4">
                        {c.cvUrl && (
                          <a href={c.cvUrl} target="_blank" rel="noopener noreferrer"
                             className="p-1.5 rounded-lg hover:bg-teal-pale text-teal transition-colors"
                             title="פתיחת קו״ח מקורי">
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
