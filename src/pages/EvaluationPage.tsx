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

interface RegistrationRow {
  evaluation_id: string;
  user_id: string;
  user_name: string;
  province: string;
  program_id: string;
  program_name: string;
  self_status: string | null;
  committee_status: string | null;
  has_committee_score: boolean;
  has_self_score: boolean;
  total_score?: number;
  total_max?: number;
  self_total_score?: number;
  committee_total_score?: number;
  self_max_score?: number;
  committee_max_score?: number;
}

const EvaluationPage = () => {
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { loading: roleLoading, accessibleProgramIds } = useUserRole();
  const navigate = useNavigate();

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

  const getSelfAssessmentBadge = (status: string | null, _hasProgress: boolean) => {
    if (status === "completed" || status === "submitted") {
      return <Badge className="bg-green-600 hover:bg-green-700">ประเมินแล้ว</Badge>;
    }

    if (status === "draft") {
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
          ร่าง
        </Badge>
      );
    }

    return <Badge variant="outline" className="text-muted-foreground">ยังไม่ได้ประเมิน</Badge>;
  };

  const getCommitteeBadge = (hasScore: boolean) => {
    if (hasScore) return <Badge className="bg-green-600 hover:bg-green-700">ประเมินแล้ว</Badge>;
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
    <div className="h-full flex flex-col gap-3 p-4">

      {/* Header — frozen */}
      <div className="px-6 py-4 rounded-2xl shrink-0" style={glass}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "#3a7d2c" }}>
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--green-heading)" }}>ประเมิน G-Green</h2>
            <p className="text-xs" style={{ color: "var(--green-muted)" }}>รายการหน่วยงานที่ผ่านการคัดเลือกเข้าร่วมโครงการ</p>
          </div>
        </div>
      </div>

      {/* Filters — frozen */}
      <div className="px-5 py-3 rounded-2xl shrink-0" style={glass}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="ค้นหาชื่อหน่วยงาน..." value={searchOrg} onChange={(e) => setSearchOrg(e.target.value)} className="pl-9 bg-white/60 border-white/50" />
          </div>
          <Select value={filterProgram} onValueChange={setFilterProgram}>
            <SelectTrigger className="bg-white/60 border-white/50"><SelectValue placeholder="โครงการ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">โครงการทั้งหมด</SelectItem>
              {programOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProvince} onValueChange={setFilterProvince}>
            <SelectTrigger className="bg-white/60 border-white/50"><SelectValue placeholder="จังหวัด" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">จังหวัดทั้งหมด</SelectItem>
              {provinceOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSelfStatus} onValueChange={setFilterSelfStatus}>
            <SelectTrigger className="bg-white/60 border-white/50"><SelectValue placeholder="สถานะประเมินตนเอง" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะประเมินตนเองทั้งหมด</SelectItem>
              <SelectItem value="none">ยังไม่ประเมิน</SelectItem>
              <SelectItem value="draft">ร่าง</SelectItem>
              <SelectItem value="completed">ประเมินแล้ว</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCommitteeStatus} onValueChange={setFilterCommitteeStatus}>
            <SelectTrigger className="bg-white/60 border-white/50"><SelectValue placeholder="สถานะกรรมการ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะกรรมการทั้งหมด</SelectItem>
              <SelectItem value="none">ยังไม่ประเมิน</SelectItem>
              <SelectItem value="completed">ประเมินแล้ว</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm" style={{ color: "var(--green-muted)" }}>แสดง {filteredRows.length} จาก {rows.length} รายการ</span>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
              <X className="h-3 w-3 mr-1" />ล้างตัวกรอง
            </Button>
          </div>
        )}
      </div>

      {/* Table — scrollable */}
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
            <Table>
              <TableHeader className="sticky top-0 z-10" style={{ background: "rgba(220,245,220,0.90)", backdropFilter: "blur(8px)" }}>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>ชื่อหน่วยงาน</TableHead>
                  <TableHead>ชื่อโครงการ</TableHead>
                  <TableHead className="text-center w-20">ปี พ.ศ.</TableHead>
                  <TableHead>จังหวัด</TableHead>
                  <TableHead className="text-center">สถานะประเมินตนเอง</TableHead>
                  <TableHead className="text-center">สถานะกรรมการประเมิน</TableHead>
                  <TableHead className="text-center w-28">คะแนนรวมตนเอง</TableHead>
                  <TableHead className="text-center w-28">คะแนนรวมกรรมการ</TableHead>
                  <TableHead className="text-center w-24">สรุปผล</TableHead>
                  <TableHead className="text-center w-20">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row, idx) => (
                  <TableRow key={row.evaluation_id} className="hover:bg-white/40 transition-colors">
                    <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{row.user_name}</TableCell>
                    <TableCell>{row.program_name}</TableCell>
                    <TableCell className="text-center">{(row as any).year ? (row as any).year + 543 : "-"}</TableCell>
                    <TableCell>{row.province}</TableCell>
                    <TableCell className="text-center">{getSelfAssessmentBadge(row.self_status, row.has_self_score)}</TableCell>
                    <TableCell className="text-center">{getCommitteeBadge(row.has_committee_score)}</TableCell>
                    <TableCell className="text-center text-sm">
                      {row.self_total_score != null
                        ? <span>{row.self_total_score}{row.self_max_score != null ? <span className="text-muted-foreground">/{row.self_max_score}</span> : null}</span>
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {row.committee_total_score != null
                        ? <span className="font-medium" style={{ color: "#2d7a1b" }}>{row.committee_total_score}{row.total_max != null ? <span className="text-muted-foreground font-normal">/{row.total_max}</span> : null}</span>
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.has_committee_score && (
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/evaluation/${row.program_id}/summary?evaluationId=${row.evaluation_id}`)} title="ดูสรุปผลการประเมิน">
                          <BarChart2 className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/evaluation/${row.program_id}?evaluationId=${row.evaluation_id}`)}
                          title={row.self_status === "completed" ? "ดูผลการประเมิน" : row.evaluation_id ? "แก้ไขการประเมิน" : "เพิ่มการประเมิน"} className="edit-button">
                          {row.self_status === "completed" ? <Eye className="h-4 w-4 text-muted-foreground" />
                            : row.evaluation_id ? <Pencil className="h-4 w-4 text-primary" />
                            : <Plus className="h-4 w-4 text-primary" />}
                        </Button>
                        {row.has_committee_score && row.evaluation_id && (
                          <Button variant="ghost" size="icon" onClick={() => window.open(`/certificate/print/${row.evaluation_id}`, "_blank")} title="พิมพ์ใบประกาศ">
                            <Printer className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationPage;
