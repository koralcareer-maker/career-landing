import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUS_LABELS, formatDate, formatDateShort } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Mail, Users, TrendingUp, XCircle, Send,
  MessageCircle, Star, Trophy, Target, Plus
} from "lucide-react";
import { JobTrackerClient } from "./job-tracker-client";

export default async function ProgressPage() {
  const session = await auth();
  const userId = session!.user.id;

  const apps = await prisma.jobApplication.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const snapshots = await prisma.progressSnapshot.findMany({
    where: { userId },
    orderBy: { weekStart: "asc" },
    take: 8,
  });

  // Compute stats
  const stats = {
    applied:    apps.filter(a => ["APPLIED","PROACTIVE_OUTREACH","FOLLOWUP_SENT","INTERVIEW_SCHEDULED","FIRST_INTERVIEW","ADVANCED_INTERVIEW","TASK_HOME","OFFER","ACCEPTED"].includes(a.status)).length,
    responses:  apps.filter(a => a.responseReceived).length,
    interviews: apps.filter(a => ["FIRST_INTERVIEW","ADVANCED_INTERVIEW","TASK_HOME","OFFER","ACCEPTED"].includes(a.status)).length,
    offers:     apps.filter(a => ["OFFER","ACCEPTED"].includes(a.status)).length,
    rejections: apps.filter(a => a.status === "REJECTED").length,
    outreach:   apps.filter(a => a.status === "PROACTIVE_OUTREACH").length,
    networking: 0, // tracked manually via snapshots
    skills:     0, // placeholder
    total:      apps.length,
  };

  const readinessScore = stats.total === 0 ? 0 : Math.min(
    100,
    Math.round(
      (stats.applied * 5 + stats.interviews * 15 + stats.offers * 20 + stats.responses * 3) / Math.max(stats.total, 1) + stats.applied * 2
    )
  );

  const METRIC_CARDS = [
    { icon: Briefcase,     label: "בקשות שהוגשו",        value: stats.applied,     color: "text-blue-600",   bg: "bg-blue-50" },
    { icon: Mail,          label: "תגובות שהתקבלו",       value: stats.responses,   color: "text-green-600",  bg: "bg-green-50" },
    { icon: Users,         label: "ראיונות",              value: stats.interviews,  color: "text-purple-600", bg: "bg-purple-50" },
    { icon: Trophy,        label: "הצעות עבודה",          value: stats.offers,      color: "text-yellow-600", bg: "bg-yellow-50" },
    { icon: XCircle,       label: "דחיות",                value: stats.rejections,  color: "text-red-500",    bg: "bg-red-50" },
    { icon: Send,          label: "פניות יזומות",         value: stats.outreach,    color: "text-teal",       bg: "bg-teal-pale" },
    { icon: MessageCircle, label: "שיחות נטוורקינג",      value: stats.networking,  color: "text-indigo-600", bg: "bg-indigo-50" },
    { icon: Star,          label: "מיומנויות הושלמו",     value: stats.skills,      color: "text-orange-500", bg: "bg-orange-50" },
  ];

  const statusCounts = APPLICATION_STATUS_LABELS
    ? Object.entries(APPLICATION_STATUS_LABELS).map(([key, label]) => ({
        key, label,
        count: apps.filter(a => a.status === key).length,
      })).filter(s => s.count > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Header + readiness */}
      <div className="bg-gradient-to-l from-purple-50 to-white rounded-2xl p-6 border border-purple-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-navy">ההתקדמות שלי</h2>
            <p className="text-sm text-gray-500 mt-0.5">עוקב אחרי {apps.length} בקשות</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-teal">{readinessScore}%</div>
            <div className="text-xs text-gray-400">ציון מוכנות</div>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-l from-teal to-teal-dark rounded-full" style={{ width: `${readinessScore}%` }} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {METRIC_CARDS.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} padding="sm">
              <div className={`w-9 h-9 ${m.bg} rounded-xl flex items-center justify-center mb-2`}>
                <Icon size={18} className={m.color} />
              </div>
              <div className={`text-2xl font-black ${m.color}`}>{m.value}</div>
              <div className="text-xs text-gray-500 mt-0.5 leading-tight">{m.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Pipeline */}
      {statusCounts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target size={16} className="text-teal" />
              <CardTitle>פייפליין — מצב הבקשות</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {statusCounts.map((s) => (
                <div key={s.key} className="flex items-center gap-2 bg-cream px-3 py-1.5 rounded-xl">
                  <span className="text-sm font-bold text-navy">{s.count}</span>
                  <span className="text-xs text-gray-500">{s.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Tracker */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase size={16} className="text-teal" />
            <CardTitle>מעקב משרות אישי</CardTitle>
          </div>
        </CardHeader>
        <JobTrackerClient
          apps={apps.map(a => ({
            id: a.id,
            company: a.company,
            role: a.role,
            dateApplied: a.dateApplied?.toISOString() ?? null,
            source: a.source,
            status: a.status,
            notes: a.notes,
            nextFollowUp: a.nextFollowUp?.toISOString() ?? null,
            contactName: a.contactName,
            jobLink: a.jobLink,
            responseReceived: a.responseReceived,
          }))}
        />
      </Card>
    </div>
  );
}
