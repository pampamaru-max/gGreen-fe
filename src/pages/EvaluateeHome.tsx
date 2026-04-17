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
  const [filterEvalType, setFilterEvalType] = useState<string>("all");
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
      if (filterEvalType !== "all" && item.evaluation_type !== filterEvalType) return false;
      if (filterCommitteeStatus !== "all") {
        const hasScore = !!item.total_committee_score || item.has_committee_score;
        if (filterCommitteeStatus === "done" && !hasScore) return false;
        if (filterCommitteeStatus === "none" && hasScore) return false;
      }
      return true;
    });
  }, [allEvaluations, filterYear, filterEvalType, filterSelfStatus, filterCommitteeStatus]);

  const hasActiveFilters = filterYear !== "all" || filterEvalType !== "all" || filterSelfStatus !== "all" || filterCommitteeStatus !== "all";

  const clearFilters = () => {
    setFilterYear("all");
    setFilterEvalType("all");
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

  const glassCard = {
    background: "var(--glass-bg)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    boxShadow: "var(--glass-shadow)",
    border: "1px solid var(--glass-border)",
  } as React.CSSProperties;

  return (
    <div className="h-full flex flex-col gap-3 p-4">

      {/* ════ Header glass card ════ */}
      <div className="px-4 py-3 rounded-2xl shrink-0" style={glassCard}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: "#3a7d2c" }}>
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold truncate" style={{ color: "var(--green-heading)" }}>
                {reg?.organizationName ?? user?.name ?? "-"}
              </h2>
              <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-none px-2 py-0.5 rounded-full text-[0.625rem] font-bold shrink-0">
                {regStatus.label}
              </Badge>
            </div>
            <p className="text-[0.625rem] text-muted-foreground uppercase tracking-widest">
              {reg?.organizationType || "General Organization"}
            </p>
          </div>
          {(!reg || reg.status === "selected") && (
            <Button onClick={() => setEvalTypeDialogOpen(true)}
              className="gap-2 shrink-0 h-8 px-3 text-xs font-bold" style={{ background: "#3a7d2c", color: "#fff" }}>
              <ClipboardCheck className="h-3.5 w-3.5" />
              เริ่มประเมิน
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Info tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-border/40">
          {[
            { icon: <ClipboardCheck className="h-3.5 w-3.5 text-primary" />, label: "โครงการ", value: reg?.programName ?? programId },
            { icon: <MapPin className="h-3.5 w-3.5 text-primary" />, label: "จังหวัด", value: (() => { const pv = reg?.province ?? user?.province; const found = provinces.find((p: any) => String(p.code) === pv || p.name === pv); return found ? found.name : (pv ?? "-"); })() },
            { icon: <User className="h-3.5 w-3.5 text-primary" />, label: "ผู้ติดต่อ", value: reg?.contactName ?? user?.name ?? "-" },
            { icon: <CalendarDays className="h-3.5 w-3.5 text-primary" />, label: "วันที่เข้าร่วม", value: reg ? new Date(reg.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : new Date(user?.createdAt ?? Date.now()).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2 min-w-0">
              {icon}
              <div className="min-w-0">
                <p className="text-[0.5625rem] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
                <p className="text-xs font-bold truncate" style={{ color: "var(--green-heading)" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════ Scrollable content glass card ════ */}
      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={glassCard}>
        <div className="h-full overflow-y-auto">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <ListChecks className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-sm font-bold" style={{ color: "var(--green-heading)" }}>ประวัติการประเมิน</h2>
            </div>
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue placeholder="ทุกปี" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกปี</SelectItem>
                  {yearOptions.map((y: any) => (
                    <SelectItem key={y} value={String(y)}>{y + 543}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterEvalType} onValueChange={setFilterEvalType}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="ประเภทเอกสาร" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ประเภทเอกสารทั้งหมด</SelectItem>
                  {Object.entries(EVAL_TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSelfStatus} onValueChange={setFilterSelfStatus}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="สถานะตนเอง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">สถานะตนเองทั้งหมด</SelectItem>
                  <SelectItem value="none">ยังไม่เริ่ม</SelectItem>
                  <SelectItem value="draft">ร่าง</SelectItem>
                  <SelectItem value="revision">ส่งกลับแก้ไข</SelectItem>
                  <SelectItem value="submitted">รอผู้ประเมิน</SelectItem>
                  <SelectItem value="completed">ประเมินเสร็จสิ้น</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCommitteeStatus} onValueChange={setFilterCommitteeStatus}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="สถานะกรรมการ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">กรรมการทั้งหมด</SelectItem>
                  <SelectItem value="none">ยังไม่ได้ประเมิน</SelectItem>
                  <SelectItem value="done">ประเมินแล้ว</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}
                  className="h-8 px-2 text-xs text-muted-foreground gap-1">
                  <X className="h-3 w-3" /> ล้าง
                  {hasActiveFilters && <span className="text-muted-foreground/60">({filteredEvaluations.length}/{allEvaluations.length})</span>}
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto px-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                    <TableHead className="text-center min-w-[140px] text-slate-400 font-bold uppercase text-[0.625rem] tracking-[0.1em]">
                      ชื่อหน่วยงาน
                    </TableHead>
                    <TableHead className="text-center min-w-[140px] text-slate-400 font-bold uppercase text-[0.625rem] tracking-[0.1em]">
                      โครงการ
                    </TableHead>
                    <TableHead className="text-center min-w-[80px] text-slate-400 font-bold uppercase text-[0.625rem] tracking-[0.1em]">
                      ปี
                    </TableHead>
                    <TableHead className="text-center min-w-[130px] text-muted-foreground font-bold uppercase text-[0.625rem] tracking-[0.1em]">
                      ประเภทเอกสาร
                    </TableHead>
                    <TableHead className="text-center min-w-[140px] text-muted-foreground font-bold uppercase text-[0.625rem] tracking-[0.1em]">
                      สถานะการประเมินตนเอง
                    </TableHead>
                    <TableHead className="text-center min-w-[100px] text-muted-foreground font-bold uppercase text-[0.625rem] tracking-[0.1em]">
                      คะแนนรวม
                    </TableHead>
                    <TableHead className="text-center min-w-[140px] text-muted-foreground font-bold uppercase text-[0.625rem] tracking-[0.1em]">
                      สถานะการประเมินกรรมการ
                    </TableHead>
                    <TableHead className="text-center min-w-[100px] text-muted-foreground font-bold uppercase text-[0.625rem] tracking-[0.1em]">
                      คะแนนรวมกรรมการ
                    </TableHead>
                    <TableHead className="text-center w-28 text-muted-foreground font-bold uppercase text-[0.625rem] tracking-[0.1em]">
                      จัดการ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        {allEvaluations.length === 0 ? "ไม่มีข้อมูลประวัติการประเมิน" : "ไม่พบรายการที่ตรงกับตัวกรอง"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvaluations.map((item: any) => (
                      <TableRow key={item.id} className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0 group">
                        <TableCell className="text-center font-medium">{item.user_name}</TableCell>
                        <TableCell className="text-center font-medium">{item.program_name}</TableCell>
                        <TableCell className="text-center font-medium">{item.year ? item.year + 543 : "-"}</TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const typeKey = item.evaluation_type ?? "new";
                            const cfg = EVAL_TYPE_CONFIG[typeKey];
                            if (!cfg) return <span className="text-muted-foreground text-xs">{typeKey}</span>;
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold border ${cfg.className}`}>
                                {cfg.icon}{cfg.label}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(item.evaluation_status)}</TableCell>
                        <TableCell className="text-center font-bold text-foreground">
                          {item.total_score !== null ? `${item.total_score}/${item.max_self_score}` : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {getCommitteeBadge(!!item.total_committee_score || item.has_committee_score)}
                        </TableCell>
                        <TableCell className="text-center font-bold text-foreground">
                          {item.total_committee_score !== null ? `${item.total_committee_score}/${item.max_committee_score}` : "-"}
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
                                        `/register/evaluate?id=${item.id}`,
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

