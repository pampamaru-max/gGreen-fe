import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/axios";

const ReportParticipants = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["report-participants"],
    queryFn: async () => {
      const { data } = await apiClient.get("project-registrations/public");
      return data ?? [];
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data } = await apiClient.get("programs/names");
      return data ?? [];
    },
  });

  const { data: provincesList = [] } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => {
      const { data } = await apiClient.get("provinces");
      return data ?? [];
    },
  });

  const provinces = useMemo(() => {
    const set = new Set(registrations.map((r: any) => r.provinceName || r.province).filter(Boolean));
    return Array.from(set).sort();
  }, [registrations]);

  const years = useMemo(() => {
    const set = new Set(
      registrations.map((r: any) => new Date(r.createdAt).getFullYear() + 543)
    );
    return Array.from(set).sort((a: any, b: any) => (b as number) - (a as number));
  }, [registrations]);

  const filtered = useMemo(() => {
    return registrations.filter((r: any) => {
      if (programFilter !== "all" && r.programId !== programFilter) return false;
      const provName = r.provinceName || r.province;
      if (provinceFilter !== "all" && provName !== provinceFilter) return false;
      if (yearFilter !== "all") {
        const buddhistYear = new Date(r.createdAt).getFullYear() + 543;
        if (String(buddhistYear) !== yearFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          r.organizationName.toLowerCase().includes(q) ||
          r.contactName.toLowerCase().includes(q) ||
          r.contactEmail.toLowerCase().includes(q) ||
          (provName && provName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [registrations, search, programFilter, provinceFilter, yearFilter]);

  const getProgramName = (id: string) => programs.find((p: any) => p.id === id)?.name ?? id;

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        กลับหน้าหลัก
      </Button>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Users className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground">รายชื่อผู้เข้าร่วมโครงการ</h1>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">ค้นหาและกรองข้อมูล</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อหน่วยงาน, ผู้ติดต่อ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-[220px] h-10">
                <SelectValue placeholder="โครงการทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">โครงการทั้งหมด</SelectItem>
                {programs.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={provinceFilter} onValueChange={setProvinceFilter}>
              <SelectTrigger className="w-[200px] h-10">
                <SelectValue placeholder="จังหวัดทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">จังหวัดทั้งหมด</SelectItem>
                {provinces.map((p: any) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[160px] h-10">
                <SelectValue placeholder="ปีทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ปีทั้งหมด</SelectItem>
                {years.map((y: any) => (
                  <SelectItem key={y} value={String(y)}>พ.ศ. {y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold">
            ผู้เข้าร่วมโครงการทั้งหมด {filtered.length} รายการ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 opacity-20 mb-2" />
              <p>ไม่พบข้อมูล</p>
            </div>
          ) : (
            <div className="overflow-x-auto border-t">
              <Table>
                <TableHeader>
                 <TableRow className="bg-muted/30">
                     <TableHead className="w-[80px] text-center">ลำดับ</TableHead>
                     <TableHead>ชื่อหน่วยงาน</TableHead>
                     <TableHead>โครงการ</TableHead>
                     <TableHead>จังหวัด</TableHead>
                     <TableHead className="w-[150px]">วันที่สมัคร</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filtered.map((r: any, idx: number) => (
                     <TableRow key={r.id}>
                       <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                       <TableCell className="font-semibold text-foreground">{r.organizationName}</TableCell>
                       <TableCell>{r.program?.name || getProgramName(r.programId)}</TableCell>
                       <TableCell>{r.provinceName || r.province}</TableCell>
                       <TableCell className="text-muted-foreground">
                         {new Date(r.createdAt).toLocaleDateString("th-TH", {
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
