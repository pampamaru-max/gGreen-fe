import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, ArrowLeft, Loader2, CalendarIcon, FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import apiClient from "@/lib/axios";
import { xlsxDownload } from "@/lib/download";
import natureBg from "@/assets/login2.jpg";

const ReportParticipants = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["report-participants"],
    queryFn: async () => {
      const { data } = await apiClient.get("project-registrations/public", {
        params: { status: "selected" },
      });
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

  const provinces = useMemo(() => {
    const set = new Set(registrations.map((r: any) => r.provinceName || r.province).filter(Boolean));
    return Array.from(set).sort();
  }, [registrations]);

  const filtered = useMemo(() => {
    return registrations.filter((r: any) => {
      if (programFilter !== "all" && r.programId !== programFilter) return false;
      const provName = r.provinceName || r.province;
      if (provinceFilter !== "all" && provName !== provinceFilter) return false;
      if (startDate || endDate) {
        const created = new Date(r.createdAt);
        if (startDate && created < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (created > endOfDay) return false;
        }
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          r.organizationName.toLowerCase().includes(q) ||
          (r.contactName && r.contactName.toLowerCase().includes(q)) ||
          (r.contactEmail && r.contactEmail.toLowerCase().includes(q)) ||
          (provName && provName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [registrations, search, programFilter, provinceFilter, startDate, endDate]);

  const getProgramName = (id: string) => programs.find((p: any) => p.id === id)?.name ?? id;

  const formatThaiDate = (date: Date) =>
    format(date, "d MMM yyyy", { locale: th });

  const handleExportExcel = () => {
    const rows = filtered.map((r: any, i: number) => ({
      ลำดับ: i + 1,
      ชื่อหน่วยงาน: r.organizationName,
      เลขทะเบียนนิติบุคคล: r.juristicId || "-",
      โครงการ: r.program?.name || getProgramName(r.programId),
      จังหวัด: r.provinceName || r.province || "-",
      ผู้ติดต่อ: r.contactName ? `${r.contactName} ${r.contactLastName || ""}`.trim() : "-",
      เบอร์โทรศัพท์: r.contactPhone || "-",
      อีเมล: r.contactEmail || "-",
      วันที่สมัคร: new Date(r.createdAt).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ผู้เข้าร่วมโครงการ");
    xlsxDownload(wb, "participants_report.xlsx");
  };

  return (
    <div className="relative min-h-screen">
      <img
        src={natureBg}
        alt=""
        className="fixed inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ zIndex: 0, filter: "brightness(1.05) saturate(1.3)" }}
      />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0, background: "rgba(255,255,255,0.1)" }} />
    <div className="relative p-6 space-y-6" style={{ zIndex: 1 }}>
      <Button
        size="sm"
        onClick={() => navigate("/")}
        className="gap-2 rounded-full px-5 bg-white/90 text-emerald-800 border border-white/60 shadow-md hover:bg-white transition-all hover:scale-105 font-semibold"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับหน้าหลัก
      </Button>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Users className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">รายชื่อผู้เข้าร่วมโครงการ</h1>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={startDate ? "default" : "outline"} className="h-10 gap-2 min-w-[160px]">
                  <CalendarIcon className="h-4 w-4" />
                  {startDate ? formatThaiDate(startDate) : "ตั้งแต่วันที่"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={endDate ? "default" : "outline"} className="h-10 gap-2 min-w-[160px]">
                  <CalendarIcon className="h-4 w-4" />
                  {endDate ? formatThaiDate(endDate) : "ถึงวันที่"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 text-muted-foreground"
                onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
              >
                ล้างวันที่
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold">
            ผู้เข้าร่วมโครงการทั้งหมด {filtered.length} รายการ
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
          >
            <FileDown className="h-4 w-4" />
            Export Excel
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
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
            <div className="overflow-x-auto border-t w-full">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[60px] text-center">ลำดับ</TableHead>
                    <TableHead>ชื่อหน่วยงาน</TableHead>
                    <TableHead>เลขทะเบียนนิติบุคคล</TableHead>
                    <TableHead>โครงการ</TableHead>
                    <TableHead>จังหวัด</TableHead>
                    <TableHead>ผู้ติดต่อ</TableHead>
                    <TableHead>เบอร์โทรศัพท์</TableHead>
                    <TableHead>อีเมล</TableHead>
                    <TableHead className="w-[130px]">วันที่สมัคร</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any, idx: number) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-semibold text-foreground">{r.organizationName}</TableCell>
                      <TableCell className="text-muted-foreground">{r.juristicId || "-"}</TableCell>
                      <TableCell>{r.program?.name || getProgramName(r.programId)}</TableCell>
                      <TableCell>{r.provinceName || r.province}</TableCell>
                      <TableCell>{r.contactName ? `${r.contactName} ${r.contactLastName || ""}`.trim() : "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.contactPhone || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.contactEmail || "-"}</TableCell>
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
    </div>
  );
};

export default ReportParticipants;
