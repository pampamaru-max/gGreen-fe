import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search, Eye, Loader2, Filter, X, Download } from "lucide-react";
import { Users, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RegistrationDetailDialog from "@/components/RegistrationDetailDialog";
import apiClient from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";

interface Registration {
  id: string;
  programId: string;
  juristicId?: string;
  branchNumber: string;
  organizationName: string;
  organizationNameEn: string;
  organizationType: string;
  address: string;
  organizationPhone: string;
  province: string;
  provinceName?: string;
  district: string;
  districtName?: string;
  subdistrict: string;
  subdistrictName?: string;
  postalCode: string;
  mapLink: string;
  latitude: string;
  longitude: string;
  contactName: string;
  contactLastName: string;
  contactPosition: string;
  contactPhone: string;
  contactEmail: string;
  status: string;
  createdAt: string;
}

interface Program {
  id: string;
  name: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "รอดำเนินการ",
    className: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  },
  selected: {
    label: "ผ่านการคัดเลือก",
    className: "bg-green-100 text-green-700 border border-green-200",
  },
  rejected: {
    label: "ไม่ผ่านการคัดเลือก",
    className: "bg-red-100 text-red-600 border border-red-200",
  },
};

const ALL = "__all__";

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, className: "bg-gray-100 text-gray-600 border border-gray-200" };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  bgCard: string;
  bgIcon: string;
  textColor: string;
}

function SummaryCard({ label, value, icon, bgCard, bgIcon, textColor }: SummaryCardProps) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl p-5 ${bgCard}`}>
      <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${bgIcon} shrink-0`}>
        {icon}
      </div>
      <div>
        <p className={`text-3xl font-bold leading-none ${textColor}`}>{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function RegistrationManagement() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Registration | null>(null);

  // Filters
  const [fProgram, setFProgram] = useState(ALL);
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");
  const [fStatus, setFStatus] = useState(ALL);
  const [fType, setFType] = useState(ALL);
  const [fName, setFName] = useState("");
  const [fProvince, setFProvince] = useState(ALL);

  const { data: _provinces = [] } = useQuery({
    queryKey: ["provinces"],
    queryFn: async () => {
      const { data } = await apiClient.get("provinces");
      return data ?? [];
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [regRes, progRes] = await Promise.all([
          apiClient.get("project-registrations"),
          apiClient.get("programs/names"),
        ]);
        setRegistrations(regRes.data ?? []);
        setPrograms(progRes.data ?? []);
      } catch (error) {
        console.error("Error fetching registrations:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const uniqueTypes = useMemo(() => {
    const types = new Set(registrations.map((r) => r.organizationType).filter(Boolean));
    return Array.from(types).sort();
  }, [registrations]);

  const uniqueProvinces = useMemo(() => {
    const provs = new Set(registrations.map((r) => r.provinceName || r.province).filter(Boolean));
    return Array.from(provs).sort();
  }, [registrations]);

  const programName = (id: string) => programs.find((p) => p.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      if (fProgram !== ALL && r.programId !== fProgram) return false;
      if (fStatus !== ALL && r.status !== fStatus) return false;
      if (fType !== ALL && r.organizationType !== fType) return false;
      if (fProvince !== ALL) {
        const rProvName = r.provinceName || r.province;
        if (rProvName !== fProvince) return false;
      }
      if (fName && !r.organizationName.toLowerCase().includes(fName.toLowerCase())) return false;
      if (fDateFrom) {
        const regDate = new Date(r.createdAt);
        const fromDate = new Date(fDateFrom);
        if (regDate < fromDate) return false;
      }
      if (fDateTo) {
        const regDate = new Date(r.createdAt);
        const toDate = new Date(fDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (regDate > toDate) return false;
      }
      return true;
    });
  }, [registrations, fProgram, fDateFrom, fDateTo, fStatus, fType, fName, fProvince]);

  const hasActiveFilter =
    fProgram !== ALL ||
    fDateFrom !== "" ||
    fDateTo !== "" ||
    fStatus !== ALL ||
    fType !== ALL ||
    fProvince !== ALL ||
    fName !== "";

  const clearFilters = () => {
    setFProgram(ALL);
    setFDateFrom("");
    setFDateTo("");
    setFStatus(ALL);
    setFType(ALL);
    setFName("");
    setFProvince(ALL);
  };

  // Summary counts from filtered data
  const summary = useMemo(() => {
    const total = filtered.length;
    const selected_count = filtered.filter((r) => r.status === "selected").length;
    const pending_count = filtered.filter((r) => r.status === "pending").length;
    const rejected_count = filtered.filter((r) => r.status === "rejected").length;
    return { total, selected_count, pending_count, rejected_count };
  }, [filtered]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });

  const handleExportExcel = () => {
    const rows = filtered.map((r, i) => ({
      "#": i + 1,
      โครงการ: programName(r.programId),
      "เลขทะเบียนนิติบุคคล": r.juristicId || "-",
      "รหัสสาขา": r.branchNumber || "00000",
      ชื่อหน่วยงาน: r.organizationName,
      ประเภท: r.organizationType || "-",
      จังหวัด: r.provinceName || r.province || "-",
      "อำเภอ/เขต": r.districtName || r.district || "-",
      วันที่สมัคร: formatDate(r.createdAt),
      สถานะ: statusConfig[r.status]?.label ?? r.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายการสมัคร");
    XLSX.writeFile(wb, "registration_list.xlsx");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">ข้อมูลการจัดการการสมัคร</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          label="ทั้งหมด"
          value={summary.total}
          icon={<Users className="h-5 w-5 text-blue-500" />}
          bgCard="bg-blue-50"
          bgIcon="bg-blue-100"
          textColor="text-blue-600"
        />
        <SummaryCard
          label="รอดำเนินการ"
          value={summary.pending_count}
          icon={<Clock className="h-5 w-5 text-yellow-500" />}
          bgCard="bg-yellow-50"
          bgIcon="bg-yellow-100"
          textColor="text-yellow-600"
        />
        <SummaryCard
          label="ผ่านการคัดเลือก"
          value={summary.selected_count}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          bgCard="bg-green-50"
          bgIcon="bg-green-100"
          textColor="text-green-600"
        />
        <SummaryCard
          label="ไม่ผ่านการคัดเลือก"
          value={summary.rejected_count}
          icon={<XCircle className="h-5 w-5 text-red-400" />}
          bgCard="bg-red-50"
          bgIcon="bg-red-100"
          textColor="text-red-500"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm font-medium">ตัวกรอง</CardTitle>
            </div>
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <X className="h-3 w-3 mr-1" /> ล้างตัวกรอง
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* โครงการ */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">โครงการ</label>
              <Select value={fProgram} onValueChange={setFProgram}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>ทั้งหมด</SelectItem>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* จากวันที่ */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">จากวันที่</label>
              <div className="relative">
                <input
                  type="date"
                  value={fDateFrom}
                  onChange={(e) => setFDateFrom(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* ถึงวันที่ */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ถึงวันที่</label>
              <div className="relative">
                <input
                  type="date"
                  value={fDateTo}
                  onChange={(e) => setFDateTo(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* สถานะ */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">สถานะ</label>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>ทั้งหมด</SelectItem>
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ประเภท */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ประเภท</label>
              <Select value={fType} onValueChange={setFType}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>ทั้งหมด</SelectItem>
                  {uniqueTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ชื่อหน่วยงาน */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ชื่อหน่วยงาน</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="พิมพ์ค้นหา..."
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  className="h-9 text-sm pl-8"
                />
              </div>
            </div>

            {/* จังหวัด */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">จังหวัด</label>
              <Select value={fProvince} onValueChange={setFProvince}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>ทั้งหมด</SelectItem>
                  {uniqueProvinces.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">รายการสมัครเข้าร่วมโครงการ</CardTitle>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {filtered.length} รายการ
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-green-700 border-green-300 hover:bg-green-50 hover:border-green-400"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">ไม่พบข้อมูลการสมัคร</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>โครงการ</TableHead>
                    <TableHead>เลขทะเบียนนิติบุคคล</TableHead>
                    <TableHead>รหัสสาขา</TableHead>
                    <TableHead>ชื่อหน่วยงาน</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>จังหวัด</TableHead>
                    <TableHead>อำเภอ/เขต</TableHead>
                    <TableHead>วันที่สมัคร</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="w-16 text-center">ดู</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>{programName(r.programId)}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {r.juristicId || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {r.branchNumber || "00000"}
                      </TableCell>
                      <TableCell className="font-medium">{r.organizationName}</TableCell>
                      <TableCell>{r.organizationType || "-"}</TableCell>
                      <TableCell>{r.provinceName || r.province || "-"}</TableCell>
                      <TableCell>{r.districtName || r.district || "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(r.createdAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="icon" variant="ghost" onClick={() => setSelected(r)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <RegistrationDetailDialog
        registration={selected}
        programName={selected ? programName(selected.programId) : ""}
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        onStatusChange={(id, newStatus) => {
          setRegistrations((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
          );
          setSelected((prev) => (prev?.id === id ? { ...prev, status: newStatus } : prev));
        }}
      />
    </div>
  );
}
