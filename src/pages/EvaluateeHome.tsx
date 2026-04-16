import { useState, useEffect, useMemo } from "react";
import EvaluationTypeDialog from "@/components/EvaluationTypeDialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2,
  MapPin,
  User,
  ClipboardCheck,
  CalendarDays,
  ArrowRight,
  Pencil,
  Plus,
  Eye,
  ListChecks,
  Printer,
  X,
  Trash2,
  FilePlus,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import apiClient from "@/lib/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertActionPopup } from "@/components/AlertActionPopup";

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

const EVAL_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  new:     { label: "ประเมินใหม่",             icon: <FilePlus   className="h-3 w-3" />, className: "bg-blue-50 text-blue-700 border-blue-200"     },
  renew:   { label: "ต่ออายุใบประกาศนียบัตร", icon: <RefreshCw  className="h-3 w-3" />, className: "bg-amber-50 text-amber-700 border-amber-200"   },
  upgrade: { label: "ยกระดับคะแนน",           icon: <TrendingUp className="h-3 w-3" />, className: "bg-purple-50 text-purple-700 border-purple-200" },
};

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
  const queryClient = useQueryClient();
  const [reg, setReg] = useState<Registration | null>(null);
  const [regLoading, setRegLoading] = useState(true);
  const [evalTypeDialogOpen, setEvalTypeDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Filter states
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterSelfStatus, setFilterSelfStatus] = useState<string>("all");
  const [filterCommitteeStatus, setFilterCommitteeStatus] = useState<string>("all");

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
    queryKey: ["evaluations", programId, user?.id],
    queryFn: async () => {
      if (!programId) return [];
      const res = await apiClient.get(`evaluation/list/${programId}`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      // Filter to only show the current user's evaluations
      const filtered = data.filter(
        (item: any) => !item.user_id || item.user_id === user?.id,
      );
      console.log("Data from API",filtered)
      // Map RegistrationRow to the format used in this component
      return filtered.map((item: any) => ({
        id: item.evaluation_id,
        program_id: item.program_id,
        program_name: item.program_name,
        evaluation_status: item.self_status,
        evaluation_type: item.evaluation_type ?? "new",

        total_score: item.self_total_score,
        max_self_score : item.self_max_score,
        total_committee_score: item.committee_total_score,
        max_committee_score: item.committee_max_score,
        has_committee_score: item.has_committee_score,
        has_self_score: item.has_self_score,
        year: item.year || new Date().getFullYear(),
        user_name: item.user_name,
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
        is_pending: true,
      });
    }

    const unique = Array.from(
      new Map(combined.map((item) => [item.id, item])).values(),
    );
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

  // Derived year options from allEvaluations
  const yearOptions = useMemo(() => {
    const years = allEvaluations
      .map((e: any) => e.year)
      .filter((y: any) => typeof y === "number" && y > 0);
    return [...new Set(years)].sort((a: any, b: any) => b - a);
  }, [allEvaluations]);

  // Filtered evaluations
  const filteredEvaluations = useMemo(() => {
    return allEvaluations.filter((item: any) => {
      if (filterYear !== "all" && String(item.year) !== filterYear) return false;
      if (filterSelfStatus !== "all") {
        const s = item.evaluation_status;
        if (filterSelfStatus === "none" && s) return false;
        if (filterSelfStatus === "draft" && s !== "draft") return false;
        if (filterSelfStatus === "revision" && s !== "revision") return false;
        if (filterSelfStatus === "submitted" && s !== "submitted" && s !== "submit") return false;
        if (filterSelfStatus === "completed" && s !== "completed" && s !== "complete") return false;
      }
      if (filterCommitteeStatus !== "all") {
        const hasScore = !!item.total_committee_score || item.has_committee_score;
        if (filterCommitteeStatus === "done" && !hasScore) return false;
        if (filterCommitteeStatus === "none" && hasScore) return false;
      }
      return true;
    });
  }, [allEvaluations, filterYear, filterSelfStatus, filterCommitteeStatus]);

  const hasActiveFilters = filterYear !== "all" || filterSelfStatus !== "all" || filterCommitteeStatus !== "all";

  const clearFilters = () => {
    setFilterYear("all");
    setFilterSelfStatus("all");
    setFilterCommitteeStatus("all");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await apiClient.delete(`evaluation/${deleteTargetId}`);
      queryClient.invalidateQueries({ queryKey: ["evaluations", programId, user?.id] });
    } catch {
      // silent — toast could be added here if needed
    } finally {
      setDeleteTargetId(null);
    }
  };

  const evaluationStatusMap: Record<
    string,
    { label: string; className: string }
  > = {
    completed: {
      label: "ประเมินเสร็จสิ้น",
      className: "bg-emerald-600 text-white",
    },
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

  const isDrafting = useMemo(() => {
    return allEvaluations.some(
      (e) =>
        e.evaluation_status === "draft" || e.evaluation_status === "revision",
    );
  }, [allEvaluations]);

  const isSubmittedOrCompleted = useMemo(() => {
    return allEvaluations.some(
      (e) =>
        e.evaluation_status === "submitted" ||
        e.evaluation_status === "completed" ||
        e.evaluation_status === "submit" ||
        e.evaluation_status === "complete",
    );
  }, [allEvaluations]);

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
    return allEvaluations.some(
      (e) =>
        e.evaluation_status === "draft" || e.evaluation_status === "revision",
    );
  }, [allEvaluations]);

  if (regLoading || evaluationsLoading) {
    return <PageLoading />;
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

          <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-emerald-500 pr-[3px] pb-[3px]">
            <Card className="overflow-hidden border-none shadow-sm bg-white rounded-xl h-full w-full">
              <CardContent className="p-0">
                {/* Org Header + Info compact row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/40">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 shrink-0">
                      <Building2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-slate-900 truncate">
                          {reg?.organizationName ?? user?.name ?? "-"}
                        </h2>
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
                          {regStatus.label}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                        {reg?.organizationType || "General Organization"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info Tiles Grid — compact */}
                <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-100">
                  <InfoTile icon={<ClipboardCheck className="h-4 w-4 text-emerald-500" />} label="โครงการ">
                    <span className="text-sm font-bold text-slate-700 truncate">{reg?.programName ?? programId}</span>
                  </InfoTile>
                  <InfoTile icon={<MapPin className="h-4 w-4 text-emerald-500" />} label="จังหวัด">
                    <span className="text-sm font-bold text-slate-700">
                      {(() => {
                        const pValue = reg?.province ?? user?.province;
                        const found = provinces.find((p: any) => String(p.code) === pValue || p.name === pValue);
                        return found ? found.name : (pValue ?? "-");
                      })()}
                    </span>
                  </InfoTile>
                  <InfoTile icon={<User className="h-4 w-4 text-emerald-500" />} label="ผู้ติดต่อ">
                    <span className="text-sm font-bold text-slate-700 truncate">{reg?.contactName ?? user?.name ?? "-"}</span>
                    <span className="text-[11px] text-slate-400 truncate">{reg?.contactEmail ?? user?.email ?? "-"}</span>
                  </InfoTile>
                  <InfoTile icon={<CalendarDays className="h-4 w-4 text-emerald-500" />} label="วันที่เข้าร่วม">
                    <span className="text-sm font-bold text-slate-700">
                      {reg
                        ? new Date(reg.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
                        : new Date(user?.createdAt ?? Date.now()).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </InfoTile>
                </div>

                {/* CTA Section — compact */}
                {(!reg || reg.status === "selected") && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3">
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-bold text-slate-700">พร้อมประเมินตนเองแล้วหรือยัง?</p>
                      <p className="text-xs text-slate-400">
                        {isDrafting
                          ? "มีแบบประเมินค้างอยู่ — สามารถเริ่มปีใหม่ได้หากเลือกปีอื่น"
                          : `กรอกแบบประเมินสำหรับโครงการ ${reg?.programName || programId}`}
                      </p>
                    </div>
                    <Button
                      onClick={() => setEvalTypeDialogOpen(true)}
                      className="font-bold px-5 py-2 h-9 rounded-lg shadow transition-all gap-2 w-full sm:w-auto shrink-0 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      เริ่มประเมินตนเอง
                      <ArrowRight className="h-4 w-4" />
                    </Button>
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

          {/* Filters */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ปี" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกปี</SelectItem>
                  {yearOptions.map((y: any) => (
                    <SelectItem key={y} value={String(y)}>{y + 543}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSelfStatus} onValueChange={setFilterSelfStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="สถานะประเมินตนเอง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">สถานะประเมินตนเองทั้งหมด</SelectItem>
                  <SelectItem value="none">ยังไม่เริ่ม</SelectItem>
                  <SelectItem value="draft">ร่าง</SelectItem>
                  <SelectItem value="revision">ส่งกลับแก้ไข</SelectItem>
                  <SelectItem value="submitted">รอผู้ประเมิน</SelectItem>
                  <SelectItem value="completed">ประเมินเสร็จสิ้น</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCommitteeStatus} onValueChange={setFilterCommitteeStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="สถานะกรรมการ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">สถานะกรรมการทั้งหมด</SelectItem>
                  <SelectItem value="none">ยังไม่ได้ประเมิน</SelectItem>
                  <SelectItem value="done">ประเมินแล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between min-h-[28px]">
              {hasActiveFilters ? (
                <span className="text-xs text-slate-400">
                  แสดง {filteredEvaluations.length} จาก {allEvaluations.length} รายการ
                </span>
              ) : (
                <span />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="h-7 px-2 text-xs text-slate-500 gap-1 disabled:opacity-30"
              >
                <X className="h-3 w-3" />
                ล้างตัวกรอง
              </Button>
            </div>
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
                    <TableHead className="text-center min-w-[80px] text-slate-400 font-bold uppercase text-[10px] tracking-[0.1em]">
                      ปี
                    </TableHead>
                    <TableHead className="text-center min-w-[130px] text-slate-400 font-bold uppercase text-[10px] tracking-[0.1em]">
                      ประเภทเอกสาร
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
                    <TableHead className="text-center w-28 text-slate-400 font-bold uppercase text-[10px] tracking-[0.1em]">
                      จัดการ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-10 text-slate-400"
                      >
                        {allEvaluations.length === 0 ? "ไม่มีข้อมูลประวัติการประเมิน" : "ไม่พบรายการที่ตรงกับตัวกรอง"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvaluations.map((item: any) => (
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
                        <TableCell className="text-center font-medium">
                          {item.year ? item.year + 543 : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const typeKey = item.evaluation_type ?? "new";
                            const cfg = EVAL_TYPE_CONFIG[typeKey];
                            if (!cfg) return <span className="text-slate-400 text-xs">{typeKey}</span>;
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.className}`}>
                                {cfg.icon}
                                {cfg.label}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(item.evaluation_status)}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-600">
                          {item.total_score !== null
                            ? `${item.total_score}/${item.max_self_score}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {getCommitteeBadge(
                            !!item.total_committee_score ||
                              item.has_committee_score,
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-600">
                          {item.total_committee_score !== null
                            ? `${item.total_committee_score}/${item.max_committee_score}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const isEditable =
                              !item.is_pending &&
                              (item.evaluation_status === "draft" ||
                                item.evaluation_status === "revision");
                            const isReadOnly =
                              !item.is_pending &&
                              (item.evaluation_status === "completed" ||
                                item.evaluation_status === "submitted" ||
                                item.evaluation_status === "complete" ||
                                item.evaluation_status === "submit");

                            return (
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    if (item.is_pending) {
                                      navigate(`/register/evaluate`);
                                    } else {
                                      navigate(
                                        `/register/evaluate?filter=evaluated&id=${item.id}`,
                                      );
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

                                {(!!item.total_committee_score ||
                                  item.has_committee_score) && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      window.open(
                                        `/certificate/print/${item.id}`,
                                        "_blank",
                                      );
                                    }}
                                    className="h-10 w-10 rounded-xl border-amber-100 bg-amber-50/50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-all shadow-sm group-hover:scale-110"
                                    title="พิมพ์ใบประกาศนียบัตร"
                                  >
                                    <Printer className="h-5 w-5" />
                                  </Button>
                                )}

                                {!item.is_pending && item.evaluation_status === "draft" && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setDeleteTargetId(item.id)}
                                    className="h-10 w-10 rounded-xl border-red-100 bg-red-50/50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-all shadow-sm"
                                    title="ลบเอกสารร่าง"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                )}
                              </div>
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

      <AlertActionPopup
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
        type="delete"
        trigger={<span className="hidden" />}
        title="ยืนยันการลบเอกสาร"
        description="ต้องการลบเอกสารร่างนี้หรือไม่? ข้อมูลจะถูกลบและไม่แสดงในรายการ"
        action={handleDeleteConfirm}
      />

      {programId && (
        <EvaluationTypeDialog
          open={evalTypeDialogOpen}
          onClose={() => setEvalTypeDialogOpen(false)}
          programId={programId}
          usedYears={evaluations.map((e: any) => e.year).filter((y: any) => typeof y === "number" && y > 0)}
        />
      )}
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
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors group">
      <div className="shrink-0 p-1.5 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-white transition-all">
        {icon}
      </div>
      <div className="flex flex-col min-w-0 overflow-hidden">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">
          {label}
        </p>
        <div className="flex flex-col">{children}</div>
      </div>
    </div>
  );
}
