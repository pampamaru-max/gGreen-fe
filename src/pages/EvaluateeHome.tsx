import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2,
  MapPin,
  User,
  ClipboardCheck,
  CalendarDays,
  ArrowRight,
  Loader2,
  Pencil,
  Plus,
  Eye,
  ListChecks,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import apiClient from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

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

const statusMap: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: { label: "รอดำเนินการ", variant: "secondary" },
  selected: { label: "ผ่านการคัดเลือก", variant: "default" },
  rejected: { label: "ไม่ผ่านการคัดเลือก", variant: "destructive" },
};

export default function EvaluateeHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reg, setReg] = useState<Registration | null>(null);
  const [regLoading, setRegLoading] = useState(true);

  const { data: provinces = [] } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => {
      const { data } = await apiClient.get("provinces");
      return data ?? [];
    },
  });

  const programId = reg?.programId ?? user?.programAccess?.[0] ?? null;
  const hasAccess = !!programId;

  const { data: evaluations = [], isLoading: evaluationsLoading } = useQuery({
    queryKey: ["evaluations", programId],
    queryFn: async () => {
      if (!programId) return [];
      const res = await apiClient.get(`evaluation/list/${programId}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      // Map RegistrationRow to the format used in this component
      return data.map((item: any) => ({
        id: item.evaluation_id,
        program_id: item.program_id,
        program_name: item.program_name,
        evaluation_status: item.self_status,
        total_score: item.self_total_score,
        total_max: item.total_max,
        total_committee_score: item.committee_total_score,
        has_committee_score: item.has_committee_score,
        has_self_score: item.has_self_score,
        year: item.year || new Date().getFullYear(),
        user_name: item.user_name
      }));
    },
    enabled: !!programId,
  });

  const allEvaluations = useMemo(() => {
    const combined = [...evaluations];

    // If current registration is not in the list, add it as a "not started" record
    if (reg && !combined.some((item) => item.program_id === reg.programId)) {
      combined.push({
        id: `pending-${reg.id}`,
        program_id: reg.programId,
        program_name: reg.programName || reg.programId,
        evaluation_status: null,
        total_score: null,
        total_max: null,
        total_committee_score: null,
        has_committee_score: false,
        has_self_score: false,
        year: new Date(reg.createdAt).getFullYear(),
        user_name: reg.organizationName || user?.name || "-",
        is_pending: true
      });
    }

    const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
    // Sort by year descending, then program name
    return unique
      .map((item: any) => ({
        ...item,
        user_name: item.user_name || reg?.organizationName || user?.name || "-",
      }))
      .sort((a, b) => {
      if (b.year !== a.year) return (b.year || 0) - (a.year || 0);
      return (a.program_name || "").localeCompare(b.program_name || "");
    });
  }, [evaluations, reg, user?.name]);

  const evaluationStatusMap: Record<string, { label: string; className: string }> = {
    completed: { label: "ประเมินเสร็จสิ้น", className: "bg-emerald-600 text-white" },
    submitted: { label: "รอผู้ประเมิน", className: "bg-blue-600 text-white" },
    draft: { label: "ร่าง", className: "bg-amber-500 text-white" },
    revision: { label: "ส่งกลับแก้ไข", className: "bg-rose-500 text-white" },
  };

  const getStatusBadge = (status?: string | null) => {
    if (!status) return <Badge variant="outline">ยังไม่เริ่ม</Badge>;

    // Handle mapping as some labels might differ
    let normalizedStatus = status;
    if (status === "submit") normalizedStatus = "submitted";
    if (status === "complete") normalizedStatus = "completed";

    const config = evaluationStatusMap[normalizedStatus];

    if (!config) return <Badge variant="outline">{status}</Badge>;

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  useEffect(() => {
    // Fetch individual registration
    apiClient
      .get("project-registrations/my")
      .then(({ data }) => setReg(data))
      .catch(() => {
        /* no registration record — use auth fallback */
      })
      .finally(() => setRegLoading(false));
  }, [user?.id]);

  const getCommitteeBadge = (hasScore: boolean) => {
    if (hasScore)
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-none px-3">
          ประเมินแล้ว
        </Badge>
      );
    return (
      <Badge variant="outline" className="text-slate-400 border-slate-200 px-3">
        ยังไม่ได้ประเมิน
      </Badge>
    );
  };

  const regStatus = reg
    ? (statusMap[reg.status] ?? {
        label: reg.status,
        variant: "outline" as const,
      })
    : { label: "ผ่านการคัดเลือก", variant: "default" as const };

  const hasDraft = useMemo(() => {
    return allEvaluations.some((e) => e.evaluation_status === "draft" || e.evaluation_status === "revision");
  }, [allEvaluations]);

  if (regLoading || evaluationsLoading) {
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
    <div className="min-h-full bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* ════ SECTION 1: ข้อมูลหน่วยงาน ════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
              <Building2 className="h-5.5 w-5.5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              ข้อมูลการเข้าร่วมโครงการ
            </h1>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-emerald-500 pr-[4px] pb-[4px]">
            <Card className="overflow-hidden border-none shadow-sm bg-white rounded-xl h-full w-full">
              <CardContent className="p-0">
                {/* Org Header */}
                <div className="p-8 border-b border-slate-50 flex items-start gap-6 bg-gradient-to-br from-white to-slate-50/50">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-slate-100 shrink-0 shadow-sm">
                    <Building2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-3 flex-wrap mb-1.5">
                      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {reg?.organizationName ?? user?.name ?? "-"}
                      </h2>
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                        {regStatus.label}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-[0.1em]">
                      {reg?.organizationType || "General Organization"}
                    </p>
                  </div>
                </div>

                {/* Info Tiles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x border-b border-slate-50">
                  <InfoTile
                    icon={
                      <ClipboardCheck className="h-5 w-5 text-emerald-500" />
                    }
                    label="โครงการ"
                  >
                    <span className="text-base font-bold text-slate-700">
                      {reg?.programName ?? programId}
                    </span>
                  </InfoTile>
                  <InfoTile
                    icon={<MapPin className="h-5 w-5 text-emerald-500" />}
                    label="จังหวัด"
                  >
                    <span className="text-base font-bold text-slate-700">
                      {(() => {
                        const pValue = reg?.province ?? user?.province;
                        const found = provinces.find(
                          (p: any) =>
                            String(p.code) === pValue || p.name === pValue,
                        );
                        return found ? found.name : (pValue ?? "-");
                      })()}
                    </span>
                  </InfoTile>
                  <InfoTile
                    icon={<User className="h-5 w-5 text-emerald-500" />}
                    label="ผู้ติดต่อ"
                  >
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-slate-700 truncate">
                        {reg?.contactName ?? user?.name ?? "-"}
                      </span>
                      <span className="text-xs text-slate-400 font-medium truncate">
                        {reg?.contactEmail ?? user?.email ?? "-"}
                      </span>
                    </div>
                  </InfoTile>
                  <InfoTile
                    icon={<CalendarDays className="h-5 w-5 text-emerald-500" />}
                    label="วันที่เข้าร่วม"
                  >
                    <span className="text-base font-bold text-slate-700">
                      {reg
                        ? new Date(reg.createdAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : new Date(
                            user?.createdAt ?? Date.now(),
                          ).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                    </span>
                  </InfoTile>
                </div>

                {/* CTA Section */}
                {(!reg || reg.status === "selected") && (
                  <div className="p-6 bg-slate-50/30">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl bg-white border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="space-y-1 text-center md:text-left">
                        <p className="text-lg font-bold text-slate-800">
                          พร้อมประเมินตนเองแล้วหรือยัง?
                        </p>
                        <p className="text-sm text-slate-500 font-medium">
                          กรอกแบบประเมินตนเองสำหรับโครงการ{" "}
                          <span className="text-blue-600 font-bold underline underline-offset-4 decoration-2 decoration-blue-100">
                            {reg?.programName || programId}
                          </span>
                        </p>
                      </div>
                      <Button
                        onClick={() => navigate("/register/evaluate")}
                        disabled={hasDraft}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-6 rounded-xl shadow-lg shadow-blue-100 transition-all hover:translate-y-[-2px] active:translate-y-0 gap-2.5 w-full md:w-auto disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0"
                      >
                        <ClipboardCheck className="h-5 w-5" />
                        {hasDraft ? "คุณมีแบบประเมินที่กำลังดำเนินการ" : "เริ่มประเมินตนเอง"}
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ════ SECTION 2: ตารางรายการประเมิน ════ */}
        <section className="space-y-5">
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">
              <ListChecks className="h-5.5 w-5.5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              ประวัติการประเมิน
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                  <TableHead className="text-center min-w-[140px] text-slate-400 font-bold uppercase text-[10px] tracking-[0.1em]">
                    ชื่อหน่วยงาน
                  </TableHead>
                    <TableHead className="text-center min-w-[140px] text-slate-400 font-bold uppercase text-[10px] tracking-[0.1em]">
                      โครงการ
                    </TableHead>
                    <TableHead className="text-center min-w-[140px] text-slate-400 font-bold uppercase text-[10px] tracking-[0.1em]">
                      สถานะการประเมินตนเอง
                    </TableHead>
                    <TableHead className="text-center min-w-[100px] text-slate-400 font-bold uppercase text-[10px] tracking-[0.1em]">
                      คะแนนรวม
                    </TableHead>
                    <TableHead className="text-center min-w-[140px] text-slate-400 font-bold uppercase text-[10px] tracking-[0.1em]">
                      สถานะการประเมินกรรมการ
                    </TableHead>
                    <TableHead className="text-center min-w-[100px] text-slate-400 font-bold uppercase text-[10px] tracking-[0.1em]">
                      คะแนนรวมกรรมการ
                    </TableHead>
                    <TableHead className="text-center w-24 text-slate-400 font-bold uppercase text-[10px] tracking-[0.1em]">
                      จัดการ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allEvaluations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                        ไม่มีข้อมูลประวัติการประเมิน
                      </TableCell>
                    </TableRow>
                  ) : (
                    allEvaluations.map((item: any) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 group"
                      >
                        <TableCell className="text-center font-medium">
                          {item.user_name}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {item.program_name}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(item.evaluation_status)}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-600">
                          {item.total_score !== undefined && item.total_score !== null
                            ? `${item.total_score}/${item.total_max || 0}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {getCommitteeBadge(!!item.total_committee_score || item.has_committee_score)}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-600">
                          {item.total_committee_score !== undefined && item.total_committee_score !== null
                            ? `${item.total_committee_score}/${item.total_max || 0}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const isEditable = !item.is_pending && (item.evaluation_status === "draft" || item.evaluation_status === "revision");
                            const isReadOnly = !item.is_pending && (item.evaluation_status === "completed" || item.evaluation_status === "submitted" || item.evaluation_status === "complete" || item.evaluation_status === "submit");
                            
                            return (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  if (item.is_pending) {
                                    navigate(`/register/evaluate`);
                                  } else {
                                    navigate(`/register/evaluate?filter=evaluated&id=${item.id}`);
                                  }
                                }}
                                className={`h-10 w-10 rounded-xl transition-all shadow-sm ${
                                  item.is_pending
                                    ? "border-blue-100 bg-blue-50/50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                                    : isReadOnly
                                    ? "border-slate-100 bg-slate-50/50 text-slate-500 hover:bg-slate-100 hover:text-slate-600"
                                    : "border-emerald-100 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                                }`}
                                title={
                                  item.is_pending
                                    ? "เริ่มการประเมิน"
                                    : isReadOnly
                                    ? "ดูรายละเอียด (อ่านอย่างเดียว)"
                                    : "แก้ไขการประเมิน"
                                }
                              >
                                {item.is_pending ? (
                                  <Plus className="h-5 w-5" />
                                ) : isReadOnly ? (
                                  <Eye className="h-5 w-5" />
                                ) : (
                                  <Pencil className="h-5 w-5" />
                                )}
                              </Button>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function InfoTile({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 p-6 transition-all hover:bg-slate-50/50 group">
      <div className="mt-0.5 shrink-0 p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 overflow-hidden">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
          {label}
        </p>
        <div className="flex flex-col justify-center min-h-[1.5rem]">
          {children}
        </div>
      </div>
    </div>
  );
}
