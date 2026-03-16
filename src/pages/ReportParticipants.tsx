import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ReportParticipants = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["report-participants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_registrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("id, name").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const provinces = useMemo(() => {
    const set = new Set(registrations.map((r) => r.province).filter(Boolean));
    return Array.from(set).sort();
  }, [registrations]);

  const years = useMemo(() => {
    const set = new Set(
      registrations.map((r) => new Date(r.created_at).getFullYear() + 543)
    );
    return Array.from(set).sort((a, b) => b - a);
  }, [registrations]);

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      if (programFilter !== "all" && r.program_id !== programFilter) return false;
      if (provinceFilter !== "all" && r.province !== provinceFilter) return false;
      if (yearFilter !== "all") {
        const buddhistYear = new Date(r.created_at).getFullYear() + 543;
        if (String(buddhistYear) !== yearFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          r.organization_name.toLowerCase().includes(q) ||
          r.contact_name.toLowerCase().includes(q) ||
          r.contact_email.toLowerCase().includes(q) ||
          r.province.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [registrations, search, programFilter, provinceFilter, yearFilter]);

  const getProgramName = (id: string) => programs.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        กลับหน้าหลัก
      </Button>
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">รายชื่อผู้เข้าร่วมโครงการ</h1>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">ค้นหาและกรองข้อมูล</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อหน่วยงาน, ผู้ติดต่อ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="โครงการทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">โครงการทั้งหมด</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={provinceFilter} onValueChange={setProvinceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="จังหวัดทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">จังหวัดทั้งหมด</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="ปีทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ปีทั้งหมด</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>พ.ศ. {y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            ผู้เข้าร่วมโครงการทั้งหมด {filtered.length} รายการ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">กำลังโหลดข้อมูล...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">ไม่พบข้อมูล</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                 <TableRow>
                     <TableHead className="w-[60px] text-center">ลำดับ</TableHead>
                     <TableHead>ชื่อหน่วยงาน</TableHead>
                     <TableHead>โครงการ</TableHead>
                     <TableHead>จังหวัด</TableHead>
                     <TableHead className="w-[120px]">วันที่สมัคร</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filtered.map((r, idx) => (
                     <TableRow key={r.id}>
                       <TableCell className="text-center">{idx + 1}</TableCell>
                       <TableCell className="font-medium">{r.organization_name}</TableCell>
                       <TableCell>{getProgramName(r.program_id)}</TableCell>
                       <TableCell>{r.province}</TableCell>
                       <TableCell>
                         {new Date(r.created_at).toLocaleDateString("th-TH", {
                           year: "numeric",
                           month: "short",
                           day: "numeric",
                         })}
                       </TableCell>
                     </TableRow>
                   ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportParticipants;
