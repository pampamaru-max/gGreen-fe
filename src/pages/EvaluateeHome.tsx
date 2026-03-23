import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2, MapPin, Phone, Mail, User, ClipboardCheck,
  CalendarDays, Hash, ArrowRight, Trophy, TrendingUp,
  CheckCircle2, Clock, ChevronRight, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/axios";

// ─── Mock data: TODO — เปลี่ยนเป็น GET /evaluation/history ──────────────────
const MOCK_HISTORY = [
  {
    year: 2567,
    programName: "โรงแรมสีเขียว",
    totalScore: 85,
    maxScore: 100,
    percentage: 85,
    level: "G-Green ระดับ 3",
    levelColor: "#16a34a",
    levelIcon: "trophy",
    status: "submitted",
    submittedAt: "2025-09-15",
    categorySummary: [
      { name: "การจัดการพลังงาน",  score: 14, max: 15 },
      { name: "การจัดการน้ำ",      score: 12, max: 15 },
      { name: "การจัดการของเสีย", score: 11, max: 15 },
      { name: "สิ่งแวดล้อม",      score: 18, max: 20 },
      { name: "การบริหารจัดการ",  score: 30, max: 35 },
    ],
  },
  {
    year: 2566,
    programName: "โรงแรมสีเขียว",
    totalScore: 72,
    maxScore: 100,
    percentage: 72,
    level: "G-Green ระดับ 2",
    levelColor: "#2563eb",
    levelIcon: "medal",
    status: "submitted",
    submittedAt: "2024-08-20",
    categorySummary: [
      { name: "การจัดการพลังงาน",  score: 11, max: 15 },
      { name: "การจัดการน้ำ",      score: 9,  max: 15 },
      { name: "การจัดการของเสีย", score: 10, max: 15 },
      { name: "สิ่งแวดล้อม",      score: 14, max: 20 },
      { name: "การบริหารจัดการ",  score: 28, max: 35 },
    ],
  },
  {
    year: 2565,
    programName: "โรงแรมสีเขียว",
    totalScore: 60,
    maxScore: 100,
    percentage: 60,
    level: "G-Green ระดับ 1",
    levelColor: "#d97706",
    levelIcon: "star",
    status: "submitted",
    submittedAt: "2023-07-05",
    categorySummary: [
      { name: "การจัดการพลังงาน",  score: 9,  max: 15 },
      { name: "การจัดการน้ำ",      score: 7,  max: 15 },
      { name: "การจัดการของเสีย", score: 8,  max: 15 },
      { name: "สิ่งแวดล้อม",      score: 12, max: 20 },
      { name: "การบริหารจัดการ",  score: 24, max: 35 },
    ],
  },
];

interface Registration {
  id: string;
  programId: string;
  programName?: string;
  organizationName: string;
  organizationType: string;
  address?: string;
  province: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: string;
  createdAt: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:  { label: "รอดำเนินการ",         variant: "secondary" },
  selected: { label: "ผ่านการคัดเลือก",      variant: "default" },
  rejected: { label: "ไม่ผ่านการคัดเลือก",   variant: "destructive" },
};

export default function EvaluateeHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reg, setReg] = useState<Registration | null>(null);
  const [regLoading, setRegLoading] = useState(true);

  useEffect(() => {
    apiClient.get("project-registrations/my")
      .then(({ data }) => setReg(data))
      .catch(() => {/* no registration record — use auth fallback */})
      .finally(() => setRegLoading(false));
  }, []);

  // ถ้าไม่มี registration record แต่มี programAccess → ใช้ข้อมูล auth แทน
  const programId = reg?.programId ?? user?.programAccess?.[0] ?? null;
  const hasAccess = !!programId;

  const status = reg
    ? (statusMap[reg.status] ?? { label: reg.status, variant: "outline" as const })
    : { label: "ผ่านการคัดเลือก", variant: "default" as const };

  if (regLoading) {
    return (
      <div className="flex items-center justify-center min-h-full py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-full py-24 text-muted-foreground">
        ไม่พบข้อมูลการเข้าร่วมโครงการ
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="px-4 sm:px-6 py-6 space-y-6">

        {/* ════ SECTION 1: ข้อมูลหน่วยงาน + CTA ════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent" />
            <h1 className="text-lg font-bold text-foreground">ข้อมูลการเข้าร่วมโครงการ</h1>
          </div>

          <Card className="overflow-hidden">
            {/* Header stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-accent via-primary to-accent/60" />

            <CardContent className="p-5 space-y-5">
              {/* Org name + status */}
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 shrink-0">
                  <Building2 className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-foreground">
                      {reg?.organizationName ?? user?.name ?? "-"}
                    </h2>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{reg?.organizationType ?? ""}</p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-sm">
                <InfoTile icon={<ClipboardCheck className="h-4 w-4 text-primary" />} label="โครงการ">
                  <span className="font-semibold text-foreground">{reg?.programName ?? programId}</span>
                </InfoTile>
                <InfoTile icon={<MapPin className="h-4 w-4 text-muted-foreground" />} label="จังหวัด">
                  <span>{reg?.province ?? user?.province ?? "-"}</span>
                </InfoTile>
                <InfoTile icon={<User className="h-4 w-4 text-muted-foreground" />} label="ผู้ติดต่อ">
                  <span className="font-medium truncate">{reg?.contactName ?? user?.name ?? "-"}</span>
                  {reg?.contactPhone && (
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Phone className="h-3 w-3 shrink-0" />{reg.contactPhone}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground text-xs truncate">
                    <Mail className="h-3 w-3 shrink-0" />{reg?.contactEmail ?? user?.email ?? "-"}
                  </span>
                </InfoTile>
                <InfoTile icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />} label="วันที่เข้าร่วม">
                  <span>
                    {reg
                      ? new Date(reg.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
                      : new Date(user?.createdAt ?? Date.now()).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  {reg && (
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Hash className="h-3 w-3" />{reg.id.slice(0, 8).toUpperCase()}
                    </span>
                  )}
                </InfoTile>
              </div>

              {/* CTA */}
              {(!reg || reg.status === "selected") ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl bg-primary/5 border border-primary/15 p-4">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground">พร้อมประเมินตนเองแล้วหรือยัง?</p>
                    <p className="text-sm text-muted-foreground">
                      กรอกแบบประเมินตนเองสำหรับโครงการ{" "}
                      <span className="text-primary font-medium">{reg.programName}</span>
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate("/register/evaluate")}
                    className="gap-2 shrink-0 w-full sm:w-auto"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    เริ่มประเมินตนเอง
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : reg.status === "pending" ? (
                <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900/40 p-4">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-yellow-800 dark:text-yellow-300">รอการพิจารณาจากเจ้าหน้าที่</p>
                    <p className="text-sm text-yellow-700/70 dark:text-yellow-400/70">ใบสมัครของท่านอยู่ระหว่างการตรวจสอบ กรุณารอการแจ้งผล</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  การสมัครของท่านไม่ผ่านการคัดเลือก กรุณาติดต่อเจ้าหน้าที่เพื่อสอบถามรายละเอียด
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ════ SECTION 2: ประวัติการประเมินผ่านมา ════ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">ประวัติการประเมิน</h2>
            </div>
            <span className="text-xs text-muted-foreground">{MOCK_HISTORY.length} ปีที่ผ่านมา</span>
          </div>

          {/* Trend bar (mini chart) */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm text-muted-foreground font-medium">แนวโน้มคะแนน (%)</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex items-end gap-4 h-20">
                {[...MOCK_HISTORY].reverse().map((h) => (
                  <div key={h.year} className="flex flex-col items-center gap-1.5 flex-1">
                    <span className="text-xs font-bold text-foreground">{h.percentage}%</span>
                    <div className="w-full rounded-t-lg transition-all" style={{
                      height: `${(h.percentage / 100) * 64}px`,
                      backgroundColor: h.levelColor,
                      opacity: 0.85,
                    }} />
                    <span className="text-xs text-muted-foreground">{h.year}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Year cards */}
          <div className="space-y-3">
            {MOCK_HISTORY.map((h) => (
              <HistoryCard key={h.year} data={h} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── HistoryCard ──────────────────────────────────────────────────────────────
function HistoryCard({ data }: { data: typeof MOCK_HISTORY[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <button
        className="w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Year badge */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white text-xs font-bold"
            style={{ backgroundColor: data.levelColor }}
          >
            {data.year}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">{data.programName}</span>
              <LevelBadge level={data.level} color={data.levelColor} />
              <StatusBadge status={data.status} submittedAt={data.submittedAt} />
            </div>
            {/* Progress bar */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${data.percentage}%`, backgroundColor: data.levelColor }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums" style={{ color: data.levelColor }}>
                {data.totalScore}/{data.maxScore}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                ({data.percentage}%)
              </span>
            </div>
          </div>

          {/* Expand arrow */}
          <ChevronRight
            className="h-4 w-4 text-muted-foreground shrink-0 transition-transform"
            style={{ transform: expanded ? "rotate(90deg)" : "none" }}
          />
        </div>
      </button>

      {/* Expanded: category breakdown */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            คะแนนแต่ละหมวด
          </p>
          {data.categorySummary.map((cat) => {
            const pct = cat.max > 0 ? Math.round((cat.score / cat.max) * 100) : 0;
            return (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-sm text-foreground w-44 truncate shrink-0">{cat.name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: data.levelColor, opacity: 0.7 }}
                  />
                </div>
                <span className="text-xs font-medium tabular-nums text-muted-foreground w-12 text-right shrink-0">
                  {cat.score}/{cat.max}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function InfoTile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 bg-muted/40 rounded-xl p-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex flex-col gap-0.5 min-w-0 overflow-hidden">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        {children}
      </div>
    </div>
  );
}

function LevelBadge({ level, color }: { level: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}18`, color }}
    >
      <Trophy className="h-3 w-3" />
      {level}
    </span>
  );
}

function StatusBadge({ status, submittedAt }: { status: string; submittedAt: string }) {
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-green-500" />
        {new Date(submittedAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      กำลังดำเนินการ
    </span>
  );
}
