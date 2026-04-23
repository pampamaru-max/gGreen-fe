import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Plus, Pencil, Search, X, Eye, BarChart2, Printer } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoading } from "@/components/ui/page-loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiClient from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import { FilePlus, RefreshCw, TrendingUp } from "lucide-react";
import { ScoringLevelType } from "./SettingsScoringCriteria";
import { findScoringLevelMatch, labelScoreType } from "@/helpers/functions";

const EVAL_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  new:     { label: "ประเมินใหม่",             icon: <FilePlus   className="h-3 w-3" />, className: "bg-blue-50 text-blue-700 border-blue-200"     },
  renew:   { label: "ต่ออายุใบประกาศนียบัตร", icon: <RefreshCw  className="h-3 w-3" />, className: "bg-amber-50 text-amber-700 border-amber-200"   },
  upgrade: { label: "ยกระดับคะแนน",           icon: <TrendingUp className="h-3 w-3" />, className: "bg-purple-50 text-purple-700 border-purple-200" },
};

interface RegistrationRow {
  evaluation_id: string;
  user_id: string;
  user_name: string;
  province: string;
  program_id: string;
  program_name: string;
  evaluation_type: ScoringLevelType;
  self_status: string | null;
  committee_status: string | null;
  has_committee_score: boolean;
  has_self_score: boolean;
  total_score?: number;
  total_score_sp?: number;
  total_max?: number;
  total_max_sp?: number;
  self_total_score?: number;
  committee_total_score?: number;
  self_max_score?: number;
  committee_max_score?: number;
  self_total_score_sp?: number;
  committee_total_score_sp?: number;
  self_max_score_sp?: number;
  committee_max_score_sp?: number;
  committee_result_is_pass?: boolean | null;
}

const EvaluationPage = () => {
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { loading: roleLoading, accessibleProgramIds } = useUserRole();
  const navigate = useNavigate();

  const { data: allScoringLevels = [] } = useQuery({
    queryKey: ["scoring-levels"],
    queryFn: async () => {
      const { data } = await apiClient.get("scoring-levels");
      return data ?? [];
    },
  });

  const renderScoreWithLevel = (
    type: ScoringLevelType,
    score: number | null, max: number | null,
    scoreSp: number | null, maxSp: number | null,
    programId: string
  ) => {
    if (score === null || max === null || max === 0) return <span className="text-muted-foreground">-</span>;
    const numScore = Number(score);
    const numMax = Number(max);
    if (isNaN(numScore) || isNaN(numMax) || numMax === 0) return <span className="text-muted-foreground">-</span>;

    const pct = Math.round((numScore / numMax) * 100);
    const pctSp = scoreSp && maxSp ? Math.round((scoreSp / maxSp) * 100) : null;
    const programLevels = allScoringLevels.filter((l: any) => l.programId === programId);
    const level = findScoringLevelMatch(programLevels, type, pct, pctSp);
    
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-bold">{pct}%</span>
        {pctSp !== null && <span className="text-sm font-bold">{pctSp}%</span>}
        {level && (
          <Badge 
            className="text-[10px] px-2 py-0 h-4 border-none whitespace-nowrap"
            style={{ backgroundColor: level.color, color: '#fff' }}
          >
            {level.name}
          </Badge>
        )}
      </div>
    );
  };

  // Filter states
  const [searchOrg, setSearchOrg] = useState("");
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [filterProvince, setFilterProvince] = useState<string>("all");
  const [filterSelfStatus, setFilterSelfStatus] = useState<string>("all");
  const [filterCommitteeStatus, setFilterCommitteeStatus] = useState<string>("all");

  useEffect(() => {
    if (roleLoading) return;

    const fetchData = async () => {
      setLoading(true);

      try {
        let url: string;
        if (accessibleProgramIds.length === 0) {
          url = "evaluation/list";
        } else if (accessibleProgramIds.length === 1) {
          url = `evaluation/list/${accessibleProgramIds[0]}`;
        } else {
          url = `evaluation/list?programs=${accessibleProgramIds.join(",")}`;
        }
        const { data: result } = await apiClient.get(url, { params: { excludeDraft: 'true' } });
        if (Array.isArray(result)) {
          setRows(result);
        } else {
          console.error("API returned non-array data:", result);
          setRows([]);
        }
      } catch (error) {
        console.error("Failed to fetch evaluation summary:", error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roleLoading, accessibleProgramIds]);

  // Derived unique values for dropdowns
  const programOptions = useMemo(() => [...new Set(rows.map((r) => r.program_name))].filter(Boolean).sort(), [rows]);
  const provinceOptions = useMemo(() => [...new Set(rows.map((r) => r.province))].filter(Boolean).sort(), [rows]);

  // Filtering logic
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (searchOrg && !row.user_name.toLowerCase().includes(searchOrg.toLowerCase())) return false;
      if (filterProgram !== "all" && row.program_name !== filterProgram) return false;
      if (filterProvince !== "all" && row.province !== filterProvince) return false;

      if (filterSelfStatus !== "all") {
        const status = row.self_status;
        const hasProgress = row.has_self_score;

        if (filterSelfStatus === "none" && (status || hasProgress)) return false;
        if (filterSelfStatus === "draft" && status !== "draft" && !hasProgress) return false;
        if (filterSelfStatus === "completed" && status !== "completed" && status !== "submitted") return false;
      }

      if (filterCommitteeStatus !== "all") {
        if (filterCommitteeStatus === "none" && row.has_committee_score) return false;
        if (filterCommitteeStatus === "completed" && !row.has_committee_score) return false;
      }

      return true;
    });
  }, [rows, searchOrg, filterProgram, filterProvince, filterSelfStatus, filterCommitteeStatus]);

  const hasActiveFilters = searchOrg || filterProgram !== "all" || filterProvince !== "all" || filterSelfStatus !== "all" || filterCommitteeStatus !== "all";

  const clearFilters = () => {
    setSearchOrg("");
    setFilterProgram("all");
    setFilterProvince("all");
    setFilterSelfStatus("all");
    setFilterCommitteeStatus("all");
  };

  const getSelfAssessmentBadge = (status: string | null) => {
    if (status === "completed" || status === "complete") {
      return <Badge className="bg-emerald-600">เสร็จสิ้น</Badge>;
    }
    if (status === "submitted" || status === "submit") {
      return <Badge className="bg-blue-600">ส่งแล้ว</Badge>;
    }
    if (status === "revision") {
      return <Badge className="bg-rose-500">ต้องแก้ไข</Badge>;
    }
    if (status === "draft") {
      return (
        <Badge variant="secondary" className="bg-amber-500 text-white border-none">
          ร่าง
        </Badge>
      );
    }
    return <Badge variant="outline" className="text-muted-foreground">ยังไม่ได้ประเมิน</Badge>;
  };

  const getCommitteeBadge = (status: string | null, hasScore: boolean) => {
    if (status === "completed" || status === "complete") {
      return <Badge className="bg-emerald-600 text-white border-none">เสร็จสิ้น</Badge>;
    }
    if (status === "submitted" || status === "submit") {
      return <Badge className="bg-blue-600 text-white border-none">รอการประเมิน</Badge>;
    }
    if (status === "revision") {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300">รอดำเนินการ</Badge>;
    }
    if (hasScore) return <Badge className="bg-emerald-600 hover:bg-emerald-700">ประเมินแล้ว</Badge>;
    return <span className="text-muted-foreground">-</span>;
  };

  if (loading || roleLoading) {
    return <PageLoading />;
  }

  const glass = {
    background: "var(--glass-bg)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    boxShadow: "var(--glass-shadow)",
    border: "1px solid var(--glass-border)",
  } as React.CSSProperties;

  return (
    <div className="h-full flex flex-col gap-3 p-3 sm:p-4">

      {/* Header */}
      <div className="px-4 py-3 rounded-2xl shrink-0" style={glass}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: "#3a7d2c" }}>
            <ClipboardCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--green-heading)" }}>ประเมิน G-Green</h2>
            <p className="text-xs hidden sm:block" style={{ color: "var(--green-muted)" }}>รายการหน่วยงานที่ผ่านการคัดเลือกเข้าร่วมโครงการ</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 rounded-2xl shrink-0" style={glass}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="ค้นหาชื่อหน่วยงาน..." value={searchOrg} onChange={(e) => setSearchOrg(e.target.value)} className="pl-9 h-9 text-sm bg-white/60 border-white/50" />
          </div>
          <Select value={filterProgram} onValueChange={setFilterProgram}>
            <SelectTrigger className="h-9 text-xs bg-white/60 border-white/50"><SelectValue placeholder="โครงการ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">โครงการทั้งหมด</SelectItem>
              {programOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProvince} onValueChange={setFilterProvince}>
            <SelectTrigger className="h-9 text-xs bg-white/60 border-white/50"><SelectValue placeholder="จังหวัด" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">จังหวัดทั้งหมด</SelectItem>
              {provinceOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSelfStatus} onValueChange={setFilterSelfStatus}>
            <SelectTrigger className="h-9 text-xs bg-white/60 border-white/50"><SelectValue placeholder="สถานะตนเอง" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะตนเองทั้งหมด</SelectItem>
              <SelectItem value="none">ยังไม่ประเมิน</SelectItem>
              <SelectItem value="draft">ร่าง</SelectItem>
              <SelectItem value="completed">ประเมินแล้ว</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCommitteeStatus} onValueChange={setFilterCommitteeStatus}>
            <SelectTrigger className="h-9 text-xs bg-white/60 border-white/50"><SelectValue placeholder="สถานะกรรมการ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะกรรมการทั้งหมด</SelectItem>
              <SelectItem value="none">ยังไม่ประเมิน</SelectItem>
              <SelectItem value="completed">ประเมินแล้ว</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ color: "var(--green-muted)" }}>แสดง {filteredRows.length} / {rows.length} รายการ</span>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
              <X className="h-3 w-3 mr-1" />ล้าง
            </Button>
          </div>
        )}
      </div>

      {/* Content — scrollable */}
      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={glass}>
        {filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--green-muted)" }} />
            <p style={{ color: "var(--green-muted)" }}>
              {rows.length === 0 ? "ไม่มีรายการที่คุณมีสิทธิ์เข้าถึง" : "ไม่พบรายการที่ตรงกับตัวกรอง"}
            </p>
            {rows.length === 0 && <p className="text-xs mt-1" style={{ color: "var(--green-muted)" }}>กรุณาติดต่อผู้ดูแลระบบ</p>}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            {/* ── Mobile cards (< md) ── */}
            <div className="md:hidden p-3 space-y-2">
              {filteredRows.map((row, idx) => (
                <div key={row.evaluation_id} className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2">
                  {/* Row 1: index + org + year */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5 shrink-0">#{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "var(--green-heading)" }}>{row.user_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{row.program_name}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <p className="text-xs font-semibold text-muted-foreground">{(row as any).year ? (row as any).year + 543 : "-"}</p>
                      {(() => {
                        const typeKey = row.evaluation_type ?? "new";
                        const typeCfg = EVAL_TYPE_CONFIG[typeKey];
                        return typeCfg && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-semibold border ${typeCfg.className}`}>
                            {typeCfg.icon}{typeCfg.label}
                          </span>
                        );
                      })()}
                      <p className="text-[10px] text-muted-foreground">{row.province}</p>
                    </div>
                  </div>

                  {/* Row 2: statuses */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">ตนเอง:</span>
                      {getSelfAssessmentBadge(row.self_status)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">กรรมการ:</span>
                      {getCommitteeBadge(row.self_status, row.has_committee_score)}
                    </div>
                  </div>

                    {/* Row 3: scores */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/30 rounded-lg px-2.5 py-1.5 flex flex-col items-center">
                      <p className="text-[10px] text-muted-foreground">คะแนนรวม</p>
                      {renderScoreWithLevel(
                        row.evaluation_type,
                        row.self_total_score ?? null, row.self_max_score ?? row.total_max ?? null,
                        row.self_total_score_sp ?? null, row.self_max_score_sp ?? row.total_max_sp ?? null,
                        row.program_id
                      )}
                    </div>
                    <div className="flex-1 bg-muted/30 rounded-lg px-2.5 py-1.5 flex flex-col items-center">
                      <p className="text-[10px] text-muted-foreground">กรรมการ</p>
                      {renderScoreWithLevel(
                        row.evaluation_type,
                        row.committee_total_score ?? null, row.committee_max_score ?? row.total_max ?? null,
                        row.committee_total_score_sp ?? null, row.committee_max_score_sp ?? row.total_max_sp ?? null,
                        row.program_id
                      )}
                    </div>
                  </div>

                  {/* Row 4: actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm"
                      onClick={() => navigate(`/evaluation/${row.program_id}?evaluationId=${row.evaluation_id}`)}
                      className="flex-1 h-9 gap-1.5 text-xs font-semibold rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
                      {row.self_status === "completed" ? <Eye className="h-3.5 w-3.5" /> : row.evaluation_id ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {row.self_status === "completed" ? "ดูผล" : row.evaluation_id ? "แก้ไข" : "เพิ่ม"}
                    </Button>
                    {row.has_committee_score && (
                      <Button variant="outline" size="icon"
                        onClick={() => navigate(`/evaluation/${row.program_id}/summary?evaluationId=${row.evaluation_id}`)}
                        className="h-9 w-9 rounded-xl border-green-200 bg-green-50/50 text-green-600 hover:bg-green-100 shrink-0">
                        <BarChart2 className="h-4 w-4" />
                      </Button>
                    )}
                    {row.has_committee_score && row.evaluation_id && (() => {
                      const canPrint = row.committee_result_is_pass !== false;
                      return (
                        <Button variant="outline" size="icon"
                          onClick={() => canPrint && window.open(`/certificate/print/${row.evaluation_id}`, "_blank")}
                          disabled={!canPrint}
                          title={canPrint ? "พิมพ์ใบประกาศ" : "ระดับนี้ไม่ออกใบประกาศนียบัตร"}
                          className={`h-9 w-9 rounded-xl shrink-0 ${canPrint ? "border-amber-200 bg-amber-50/50 text-amber-600 hover:bg-amber-100" : "border-slate-200 bg-slate-50/50 text-slate-400 cursor-not-allowed"}`}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop table (≥ md) ── */}
            <Table className="hidden md:table">
              <TableHeader className="sticky top-0 z-10" style={{ background: "rgba(220,245,220,0.90)", backdropFilter: "blur(8px)" }}>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>ชื่อหน่วยงาน</TableHead>
                  <TableHead>ชื่อโครงการ</TableHead>
                  <TableHead className="text-center w-20">ปี พ.ศ.</TableHead>
                  <TableHead className="text-center min-w-[130px]">ประเภทเอกสาร</TableHead>
                  <TableHead>จังหวัด</TableHead>
                  <TableHead className="text-center">สถานะประเมินตนเอง</TableHead>
                  <TableHead className="text-center">สถานะกรรมการ</TableHead>
                  <TableHead className="text-center w-28">คะแนนรวม</TableHead>
                  <TableHead className="text-center w-28">กรรมการ</TableHead>
                  <TableHead className="text-center w-24">สรุปผล</TableHead>
                  <TableHead className="text-center w-20">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row, idx) => {
                  const typeKey = row.evaluation_type ?? "new";
                  const typeCfg = EVAL_TYPE_CONFIG[typeKey];
                  return (
                    <TableRow key={row.evaluation_id} className="hover:bg-white/40 transition-colors">
                      <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{row.user_name}</TableCell>
                      <TableCell>{row.program_name}</TableCell>
                      <TableCell className="text-center">{(row as any).year ? (row as any).year + 543 : "-"}</TableCell>
                      <TableCell className="text-center">
                        {typeCfg ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold border ${typeCfg.className}`}>
                            {typeCfg.icon}{typeCfg.label}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">{typeKey}</span>}
                      </TableCell>
                      <TableCell>{row.province}</TableCell>
                      <TableCell className="text-center">{getSelfAssessmentBadge(row.self_status)}</TableCell>
                      <TableCell className="text-center">{getCommitteeBadge(row.self_status, row.has_committee_score)}</TableCell>
                      <TableCell className="text-center">
                        {renderScoreWithLevel(
                          row.evaluation_type,
                          row.self_total_score ?? null, row.self_max_score ?? row.total_max ?? null,
                          row.self_total_score_sp ?? null, row.self_max_score_sp ?? row.total_max_sp ?? null,
                          row.program_id
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderScoreWithLevel(
                          row.evaluation_type,
                          row.committee_total_score ?? null, row.committee_max_score ?? row.total_max ?? null,
                          row.committee_total_score_sp ?? null, row.committee_max_score_sp ?? row.total_max_sp ?? null,
                          row.program_id
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.has_committee_score && (
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/evaluation/${row.program_id}/summary?evaluationId=${row.evaluation_id}`)} title="ดูสรุปผล">
                            <BarChart2 className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/evaluation/${row.program_id}?evaluationId=${row.evaluation_id}`)}
                            title={row.self_status === "completed" ? "ดูผลการประเมิน" : row.evaluation_id ? "แก้ไขการประเมิน" : "เพิ่มการประเมิน"}>
                            {row.self_status === "completed" ? <Eye className="h-4 w-4 text-muted-foreground" />
                              : row.evaluation_id ? <Pencil className="h-4 w-4 text-primary" />
                              : <Plus className="h-4 w-4 text-primary" />}
                          </Button>
                          {row.has_committee_score && row.evaluation_id && (() => {
                            const canPrint = row.committee_result_is_pass !== false;
                            return (
                              <Button variant="ghost" size="icon"
                                onClick={() => canPrint && window.open(`/certificate/print/${row.evaluation_id}`, "_blank")}
                                disabled={!canPrint}
                                title={canPrint ? "พิมพ์ใบประกาศ" : "ระดับนี้ไม่ออกใบประกาศนียบัตร"}>
                                <Printer className={`h-4 w-4 ${canPrint ? "text-emerald-600" : "text-slate-400"}`} />
                              </Button>
                            );
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationPage;
