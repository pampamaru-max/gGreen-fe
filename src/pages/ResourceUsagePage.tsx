import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Leaf, Plus, Pencil, Eye, Trash2, X, BarChart3, CalendarDays, User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertActionPopup } from "@/components/AlertActionPopup";
import apiClient from "@/lib/axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ResourceUsageRecord {
  id: string;
  userId: string;
  programId: string | null;
  programName?: string | null;
  year: number;
  scope1Tco2e: number | null;
  scope2Tco2e: number | null;
  scope3Tco2e: number | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string };
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

const glassCard = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: "var(--glass-shadow)",
  border: "1px solid var(--glass-border)",
} as React.CSSProperties;

export default function ResourceUsagePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, role } = useUserRole();
  const queryClient = useQueryClient();

  const isEvaluatee = role === "user";
  const canEdit = isAdmin || isEvaluatee;

  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [searchOrg, setSearchOrg] = useState<string>("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createYear, setCreateYear] = useState<string>(String(CURRENT_YEAR));

  const { data: records = [], isLoading } = useQuery<ResourceUsageRecord[]>({
    queryKey: ["resource-usage", user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get("resource-usage");
      return data ?? [];
    },
  });

  const yearOptions = useMemo(() => {
    const years = records.map((r) => r.year).filter((y) => y > 0);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [records]);

  const programOptions = useMemo(() => {
    const progs = records
      .filter((r) => r.programId)
      .map((r) => ({ id: r.programId!, name: r.programName || r.programId! }));
    return Array.from(new Map(progs.map((p) => [p.id, p])).values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  const usedYears = useMemo(() => records.map((r) => r.year), [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterYear !== "all" && String(r.year) !== filterYear) return false;
      if (filterProgram !== "all" && r.programId !== filterProgram) return false;
      if (searchOrg) {
        const name = (r.user?.name || "").toLowerCase();
        const email = (r.user?.email || "").toLowerCase();
        const search = searchOrg.toLowerCase();
        if (!name.includes(search) && !email.includes(search)) return false;
      }
      return true;
    });
  }, [records, filterYear, filterProgram, searchOrg]);

  const hasActiveFilters = filterYear !== "all" || filterProgram !== "all" || searchOrg !== "";

  const clearFilters = () => {
    setFilterYear("all");
    setFilterProgram("all");
    setSearchOrg("");
  };

  const handleCreate = async () => {
    const year = Number(createYear);
    if (!year) return;
    try {
      setCreating(true);
      const { data } = await apiClient.post("resource-usage", { year });
      queryClient.invalidateQueries({ queryKey: ["resource-usage"] });
      navigate(`/resource-usage/${data.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "ไม่สามารถสร้างข้อมูลได้");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await apiClient.delete(`resource-usage/${deleteTargetId}`);
      queryClient.invalidateQueries({ queryKey: ["resource-usage"] });
      toast.success("ลบข้อมูลเรียบร้อยแล้ว");
    } catch {
      toast.error("ไม่สามารถลบข้อมูลได้");
    } finally {
      setDeleteTargetId(null);
    }
  };

  const formatTco2e = (v: number | null) => {
    if (v === null || v === undefined) return "-";
    return Number(v).toFixed(4) + " tCO₂e";
  };

  if (isLoading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col gap-3 p-3 sm:p-4">
      {/* Header */}
      <div className="px-4 py-3 rounded-2xl shrink-0" style={glassCard}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: "#3a7d2c" }}>
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold" style={{ color: "var(--green-heading)" }}>
              ข้อมูลการใช้ทรัพยากร
            </h2>
            <p className="text-[0.625rem] text-muted-foreground uppercase tracking-widest">
              Resource &amp; Energy Usage Data
            </p>
          </div>

          {/* Create button */}
          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              <Select value={createYear} onValueChange={setCreateYear}>
                <SelectTrigger className="h-8 text-xs w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)} disabled={usedYears.includes(y)}>
                      {y + 543}{usedYears.includes(y) ? " (มีแล้ว)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleCreate}
                disabled={creating || usedYears.includes(Number(createYear))}
                className="h-8 px-3 text-xs font-bold gap-1.5"
                style={{ background: "#3a7d2c", color: "#fff" }}
              >
                <Plus className="h-3.5 w-3.5" />
                สร้าง
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={glassCard}>
        <div className="h-full overflow-y-auto">
          {/* Header + Filters */}
          <div className="px-4 pt-4 pb-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-sm font-bold" style={{ color: "var(--green-heading)" }}>
                  ประวัติข้อมูลการใช้ทรัพยากร
                </h2>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}
                  className="h-7 px-2 text-xs text-muted-foreground gap-1">
                  <X className="h-3 w-3" /> ล้างตัวกรอง ({filtered.length}/{records.length})
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-8 text-xs w-[110px]">
                  <SelectValue placeholder="ทุกปี" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกปี</SelectItem>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y + 543}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!isEvaluatee && (
                <>
                  <Select value={filterProgram} onValueChange={setFilterProgram}>
                    <SelectTrigger className="h-8 text-xs w-[150px]">
                      <SelectValue placeholder="ทุกโครงการ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกโครงการ</SelectItem>
                      {programOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ค้นหาหน่วยงาน..."
                      className="h-8 px-3 rounded-md border border-input bg-background text-xs w-[180px] focus:outline-none focus:ring-1 focus:ring-primary"
                      value={searchOrg}
                      onChange={(e) => setSearchOrg(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <Leaf className="h-8 w-8 opacity-30" />
              {records.length === 0 ? (
                <span>{isEvaluatee ? "ยังไม่มีข้อมูล กดปุ่ม 'สร้าง' เพื่อเพิ่มข้อมูล" : "ไม่พบข้อมูล"}</span>
              ) : (
                <span>ไม่พบรายการที่ตรงกับตัวกรอง</span>
              )}
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden px-3 pb-3 space-y-2">
                {filtered.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-bold">{item.year + 543}</Badge>
                        {!isEvaluatee && item.user && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                            {item.programName || item.programId || "General"}
                          </span>
                        )}
                      </div>
                      {!isEvaluatee && item.user && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold px-1">
                          <User className="h-3 w-3" />
                          {item.user.name || item.user.email}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="text-center bg-muted/30 rounded p-1.5">
                        <div className="text-[10px] text-muted-foreground">Scope 1</div>
                        <div className="font-bold">{formatTco2e(item.scope1Tco2e)}</div>
                      </div>
                      <div className="text-center bg-muted/30 rounded p-1.5">
                        <div className="text-[10px] text-muted-foreground">Scope 2</div>
                        <div className="font-bold">{formatTco2e(item.scope2Tco2e)}</div>
                      </div>
                      <div className="text-center bg-muted/30 rounded p-1.5">
                        <div className="text-[10px] text-muted-foreground">Scope 3</div>
                        <div className="font-bold">{formatTco2e(item.scope3Tco2e)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-0.5">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1.5 border-emerald-200 bg-emerald-50/50 text-emerald-600"
                        onClick={() => navigate(`/resource-usage/${item.id}`)}>
                        {canEdit ? <><Pencil className="h-3.5 w-3.5" />แก้ไข</> : <><Eye className="h-3.5 w-3.5" />ดูรายละเอียด</>}
                      </Button>
                      {canEdit && (
                        <Button variant="outline" size="icon"
                          onClick={() => setDeleteTargetId(item.id)}
                          className="h-8 w-8 rounded-xl border-red-100 bg-red-50/50 text-red-500 hover:bg-red-100">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto px-1">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                      <TableHead className="text-center font-bold uppercase text-[0.625rem] tracking-[0.1em] text-slate-400">
                        <div className="flex items-center justify-center gap-1"><CalendarDays className="h-3 w-3" />ปี พ.ศ.</div>
                      </TableHead>
                      {!isEvaluatee && (
                        <>
                          <TableHead className="font-bold uppercase text-[0.625rem] tracking-[0.1em] text-muted-foreground">
                            โครงการ
                          </TableHead>
                          <TableHead className="font-bold uppercase text-[0.625rem] tracking-[0.1em] text-muted-foreground">
                            <div className="flex items-center gap-1"><User className="h-3 w-3" />หน่วยงาน</div>
                          </TableHead>
                        </>
                      )}
                      <TableHead className="text-center font-bold uppercase text-[0.625rem] tracking-[0.1em] text-muted-foreground">Scope 1 (tCO₂e)</TableHead>
                      <TableHead className="text-center font-bold uppercase text-[0.625rem] tracking-[0.1em] text-muted-foreground">Scope 2 (tCO₂e)</TableHead>
                      <TableHead className="text-center font-bold uppercase text-[0.625rem] tracking-[0.1em] text-muted-foreground">Scope 3 (tCO₂e)</TableHead>
                      <TableHead className="text-center font-bold uppercase text-[0.625rem] tracking-[0.1em] text-muted-foreground">รวม (tCO₂e)</TableHead>
                      <TableHead className="text-center w-28 font-bold uppercase text-[0.625rem] tracking-[0.1em] text-muted-foreground">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => {
                      const s1 = Number(item.scope1Tco2e ?? 0);
                      const s2 = Number(item.scope2Tco2e ?? 0);
                      const s3 = Number(item.scope3Tco2e ?? 0);
                      const total = s1 + s2 + s3;
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0">
                          <TableCell className="text-center font-bold">{item.year + 543}</TableCell>
                          {!isEvaluatee && (
                            <>
                              <TableCell className="text-xs text-muted-foreground uppercase font-medium">
                                {item.programName || item.programId || "-"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {item.user?.name || item.user?.email || "-"}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-center text-sm">{item.scope1Tco2e !== null ? s1.toFixed(4) : "-"}</TableCell>
                          <TableCell className="text-center text-sm">{item.scope2Tco2e !== null ? s2.toFixed(4) : "-"}</TableCell>
                          <TableCell className="text-center text-sm">{item.scope3Tco2e !== null ? s3.toFixed(4) : "-"}</TableCell>
                          <TableCell className="text-center text-sm font-bold">
                            {(item.scope1Tco2e !== null || item.scope2Tco2e !== null || item.scope3Tco2e !== null) ? total.toFixed(4) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="outline" size="icon"
                                onClick={() => navigate(`/resource-usage/${item.id}`)}
                                className="h-10 w-10 rounded-xl border-emerald-100 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-100">
                                {canEdit ? <Pencil className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </Button>
                              {canEdit && (
                                <Button variant="outline" size="icon"
                                  onClick={() => setDeleteTargetId(item.id)}
                                  className="h-10 w-10 rounded-xl border-red-100 bg-red-50/50 text-red-500 hover:bg-red-100">
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      <AlertActionPopup
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
        type="delete"
        trigger={<span className="hidden" />}
        title="ยืนยันการลบข้อมูล"
        description="ต้องการลบข้อมูลการใช้ทรัพยากรนี้หรือไม่? ข้อมูลทั้งหมดจะถูกลบถาวร"
        action={handleDelete}
      />
    </div>
  );
}
