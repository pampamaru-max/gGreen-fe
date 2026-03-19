import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Loader2, Plus, Pencil, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiClient from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

interface RegistrationRow {
  id: string;
  organization_name: string;
  province: string;
  program_id: string;
  program_name: string;
  evaluation_id: string | null;
  evaluation_status: string | null;
  has_committee_score: boolean;
  created_year: number;
}

const EvaluationPage = () => {
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, role, accessibleProgramIds, loading: roleLoading } = useUserRole();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: provinces = [] } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => {
      const { data } = await apiClient.get("provinces");
      return data ?? [];
    },
  });

  // Filter states
  const [searchOrg, setSearchOrg] = useState("");
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [filterProvince, setFilterProvince] = useState<string>("all");
  const [filterSelfStatus, setFilterSelfStatus] = useState<string>("all");
  const [filterCommitteeStatus, setFilterCommitteeStatus] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  useEffect(() => {
    if (roleLoading) return;

    const fetchData = async () => {
      setLoading(true);

      let regQuery = supabase
        .from("project_registrations")
        .select("id, organization_name, province, program_id, status, created_at, user_id")
        .eq("status", "selected");

      if (isAdmin) {
        // Admin sees all
      } else if (role === "user" || role === "evaluator") {
        // User and evaluator see registrations in their assigned programs
        if (accessibleProgramIds.length > 0) {
          regQuery = regQuery.in("program_id", accessibleProgramIds);
        } else if (role === "user" && user) {
          // Fallback: show own registrations if no program access assigned
          regQuery = regQuery.eq("user_id", user.id);
        } else {
          setRows([]);
          setLoading(false);
          return;
        }
      } else {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: registrations } = await regQuery;
      if (!registrations || registrations.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const programIds = [...new Set(registrations.map((r) => r.program_id))];
      const { data: programs } = await supabase
        .from("programs")
        .select("id, name")
        .in("id", programIds);
      const programMap = new Map(programs?.map((p) => [p.id, p.name]) || []);

      // Fetch evaluations with user_id to correctly map per-user
      let evalQuery = supabase
        .from("evaluations")
        .select("id, program_id, status, user_id")
        .in("program_id", programIds);

      // For "user" role, only fetch their own evaluations
      if (role === "user" && user) {
        evalQuery = evalQuery.eq("user_id", user.id);
      }

      const { data: evaluations } = await evalQuery;

      // Use composite key "program_id:user_id" to support multiple evaluations per program
      const evalMap = new Map(
        evaluations?.map((e) => [`${e.program_id}:${e.user_id}`, { id: e.id, status: e.status }]) || []
      );

      const evalIds = evaluations?.map((e) => e.id) || [];
      let committeeMap = new Map<string, boolean>();
      if (evalIds.length > 0) {
        const { data: scores } = await supabase
          .from("evaluation_scores")
          .select("evaluation_id, committee_score")
          .in("evaluation_id", evalIds)
          .not("committee_score", "is", null)
          .gt("committee_score", 0);

        const evalIdsWithCommittee = new Set(scores?.map((s) => s.evaluation_id) || []);
        evalIds.forEach((id) => committeeMap.set(id, evalIdsWithCommittee.has(id)));
      }

      const result: RegistrationRow[] = registrations.map((reg) => {
        const evalKey = `${reg.program_id}:${reg.user_id}`;
        const eval_ = evalMap.get(evalKey);
        return {
          id: reg.id,
          organization_name: reg.organization_name,
          province: reg.province,
          program_id: reg.program_id,
          program_name: programMap.get(reg.program_id) || "",
          evaluation_id: eval_?.id || null,
          evaluation_status: eval_?.status || null,
          has_committee_score: eval_ ? (committeeMap.get(eval_.id) || false) : false,
          created_year: new Date(reg.created_at).getFullYear() + 543,
        };
      });

      setRows(result);
      setLoading(false);
    };

    fetchData();
  }, [isAdmin, role, user, accessibleProgramIds, roleLoading]);

  // Derived unique values for dropdowns
  const programOptions = useMemo(() => [...new Set(rows.map((r) => r.program_name))].filter(Boolean).sort(), [rows]);
  const provinceOptions = useMemo(() => {
    const provs = new Set(rows.map((r) => {
      const found = provinces.find((p: any) => String(p.id) === r.province);
      return found ? found.nameTh : r.province;
    }).filter(Boolean));
    return Array.from(provs).sort();
  }, [rows, provinces]);
  const yearOptions = useMemo(() => [...new Set(rows.map((r) => String(r.created_year)))].sort().reverse(), [rows]);

  // Filtering logic
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (searchOrg && !row.organization_name.toLowerCase().includes(searchOrg.toLowerCase())) return false;
      if (filterProgram !== "all" && row.program_name !== filterProgram) return false;
      if (filterProvince !== "all") {
        const rProvName = provinces.find((p: any) => String(p.id) === row.province)?.nameTh || row.province;
        if (rProvName !== filterProvince) return false;
      }
      if (filterYear !== "all" && String(row.created_year) !== filterYear) return false;

      if (filterSelfStatus !== "all") {
        const status = row.evaluation_status;
        if (filterSelfStatus === "none" && status) return false;
        if (filterSelfStatus === "draft" && status !== "draft") return false;
        if (filterSelfStatus === "completed" && (status === "draft" || !status)) return false;
      }

      if (filterCommitteeStatus !== "all") {
        if (filterCommitteeStatus === "none" && row.has_committee_score) return false;
        if (filterCommitteeStatus === "completed" && !row.has_committee_score) return false;
      }

      return true;
    });
  }, [rows, searchOrg, filterProgram, filterProvince, filterSelfStatus, filterCommitteeStatus, filterYear]);

  const hasActiveFilters = searchOrg || filterProgram !== "all" || filterProvince !== "all" || filterSelfStatus !== "all" || filterCommitteeStatus !== "all" || filterYear !== "all";

  const clearFilters = () => {
    setSearchOrg("");
    setFilterProgram("all");
    setFilterProvince("all");
    setFilterSelfStatus("all");
    setFilterCommitteeStatus("all");
    setFilterYear("all");
  };

  const getSelfAssessmentBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline" className="text-muted-foreground">ยังไม่ประเมิน</Badge>;
    if (status === "draft") return <Badge variant="secondary">ร่าง</Badge>;
    return <Badge className="bg-green-600 hover:bg-green-700">ประเมินแล้ว</Badge>;
  };

  const getCommitteeBadge = (hasScore: boolean, evaluationId: string | null) => {
    if (!evaluationId) return <Badge variant="outline" className="text-muted-foreground">-</Badge>;
    if (hasScore) return <Badge className="bg-green-600 hover:bg-green-700">ประเมินแล้ว</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">ยังไม่ประเมิน</Badge>;
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">ประเมิน G-Green</h2>
            <p className="text-xs text-muted-foreground">รายการหน่วยงานที่ผ่านการคัดเลือกเข้าร่วมโครงการ</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อหน่วยงาน..."
              value={searchOrg}
              onChange={(e) => setSearchOrg(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterProgram} onValueChange={setFilterProgram}>
            <SelectTrigger>
              <SelectValue placeholder="โครงการ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">โครงการทั้งหมด</SelectItem>
              {programOptions.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterProvince} onValueChange={setFilterProvince}>
            <SelectTrigger>
              <SelectValue placeholder="จังหวัด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">จังหวัดทั้งหมด</SelectItem>
              {provinceOptions.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSelfStatus} onValueChange={setFilterSelfStatus}>
            <SelectTrigger>
              <SelectValue placeholder="สถานะประเมินตนเอง" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะประเมินตนเองทั้งหมด</SelectItem>
              <SelectItem value="none">ยังไม่ประเมิน</SelectItem>
              <SelectItem value="draft">ร่าง</SelectItem>
              <SelectItem value="completed">ประเมินแล้ว</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCommitteeStatus} onValueChange={setFilterCommitteeStatus}>
            <SelectTrigger>
              <SelectValue placeholder="สถานะกรรมการ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะกรรมการทั้งหมด</SelectItem>
              <SelectItem value="none">ยังไม่ประเมิน</SelectItem>
              <SelectItem value="completed">ประเมินแล้ว</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger>
              <SelectValue placeholder="ปี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ปีทั้งหมด</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y}>พ.ศ. {y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">แสดง {filteredRows.length} จาก {rows.length} รายการ</span>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
              <X className="h-3 w-3 mr-1" />
              ล้างตัวกรอง
            </Button>
          </div>
        )}

        {filteredRows.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {rows.length === 0 ? "ไม่มีรายการที่คุณมีสิทธิ์เข้าถึง" : "ไม่พบรายการที่ตรงกับตัวกรอง"}
            </p>
            {rows.length === 0 && <p className="text-xs text-muted-foreground mt-1">กรุณาติดต่อผู้ดูแลระบบ</p>}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>ชื่อหน่วยงาน</TableHead>
                  <TableHead>ชื่อโครงการ</TableHead>
                  <TableHead>จังหวัด</TableHead>
                  <TableHead className="text-center">ปี</TableHead>
                  <TableHead className="text-center">สถานะประเมินตนเอง</TableHead>
                  <TableHead className="text-center">สถานะกรรมการประเมิน</TableHead>
                  <TableHead className="text-center w-20">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{row.organization_name}</TableCell>
                    <TableCell>{row.program_name}</TableCell>
                    <TableCell>
                      {(() => {
                        const found = provinces.find((p: any) => String(p.id) === row.province);
                        return found ? found.nameTh : row.province;
                      })()}
                    </TableCell>
                    <TableCell className="text-center">{row.created_year}</TableCell>
                    <TableCell className="text-center">{getSelfAssessmentBadge(row.evaluation_status)}</TableCell>
                    <TableCell className="text-center">{getCommitteeBadge(row.has_committee_score, row.evaluation_id)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/evaluation/${row.program_id}`)}
                        title={row.evaluation_id ? "แก้ไขการประเมิน" : "เพิ่มการประเมิน"}
                      >
                        {row.evaluation_id ? (
                          <Pencil className="h-4 w-4 text-primary" />
                        ) : (
                          <Plus className="h-4 w-4 text-primary" />
                        )}
                      </Button>
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
