import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { setFeaturedCandidate } from "@/lib/actions/admin";
import { Star } from "lucide-react";

export default async function AdminCandidatePage() {
  const current = await prisma.featuredCandidate.findFirst({ where: { isActive: true } });
  const history = await prisma.featuredCandidate.findMany({ orderBy: { weekOf: "desc" }, take: 10 });

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-black text-navy">מועמד השבוע</h1>

      {/* Current featured */}
      {current && (
        <Card className="border-teal/30 bg-teal-pale/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Star size={16} className="text-teal" />
              <CardTitle>מועמד פעיל — שבוע {formatDate(current.weekOf)}</CardTitle>
            </div>
            <Badge variant="green" size="sm">פעיל</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-teal/20 rounded-2xl flex items-center justify-center text-teal font-black text-xl shrink-0">
                {current.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-navy">{current.name}</p>
                <p className="text-teal text-sm">{current.targetRole}</p>
                {current.summary && <p className="text-sm text-gray-600 mt-1">{current.summary}</p>}
                {current.lookingFor && <p className="text-sm text-gray-500 mt-1"><strong>מחפש:</strong> {current.lookingFor}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New featured candidate form */}
      <Card>
        <CardHeader>
          <CardTitle>קבע מועמד שבוע חדש</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={setFeaturedCandidate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input name="name" label="שם מלא *" placeholder="ישראל ישראלי" required />
              <Input name="targetRole" label="תפקיד יעד *" placeholder="UX Designer" required />
            </div>
            <Textarea name="summary" label="תיאור קצר" placeholder="מי המועמד ומה הרקע שלו?" rows={2} />
            <Input name="strengths" label="חוזקות" placeholder="מנהיגות, UX, מחקר משתמשים..." />
            <Textarea name="lookingFor" label="מה הוא מחפש?" placeholder="תפקיד UX Designer בחברת סטארטאפ..." rows={2} />
            <Input name="linkedinUrl" type="url" label="LinkedIn" placeholder="https://linkedin.com/in/..." dir="ltr" />
            <Button type="submit">קבע מועמד שבוע</Button>
          </form>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 1 && (
        <Card>
          <CardHeader><CardTitle>היסטוריה</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(1).map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 text-sm font-bold">{c.name.charAt(0)}</div>
                  <div>
                    <p className="font-medium text-navy text-sm">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.targetRole} · {formatDate(c.weekOf)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
