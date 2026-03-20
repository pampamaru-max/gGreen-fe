import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search, Eye, Loader2, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RegistrationDetailDialog from "@/components/RegistrationDetailDialog";
import apiClient from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

interface Registration {
  id: string;
  programId: string;
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

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "รอดำเนินการ", variant: "secondary" },
  selected: { label: "ผ่านการคัดเลือก", variant: "default" },
  rejected: { label: "ไม่ผ่านการคัดเลือก", variant: "destructive" },
};

const ALL = "__all__";

export default function RegistrationManagement() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Registration | null>(null);

  // Filters
  const [fProgram, setFProgram] = useState(ALL);
  const [fYear, setFYear] = useState(ALL);
  const [fStatus, setFStatus] = useState(ALL);
  const [fType, setFType] = useState(ALL);
  const [fName, setFName] = useState("");
  const [fProvince, setFProvince] = useState(ALL);

  const { data: provinces = [] } = useQuery({
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

  // Derive unique values for dropdowns
  const uniqueYears = useMemo(() => {
    const years = new Set(registrations.map((r) => new Date(r.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [registrations]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(registrations.map((r) => r.organizationType).filter(Boolean));
    return Array.from(types).sort();
  }, [registrations]);

  const uniqueProvinces = useMemo(() => {
    const provs = new Set(registrations.map((r) => {
      return r.provinceName || r.province;
    }).filter(Boolean));
    return Array.from(provs).sort();
  }, [registrations]);

  const programName = (id: string) => programs.find((p) => p.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      if (fProgram !== ALL && r.programId !== fProgram) return false;
      if (fYear !== ALL && new Date(r.createdAt).getFullYear().toString() !== fYear) return false;
      if (fStatus !== ALL && r.status !== fStatus) return false;
      if (fType !== ALL && r.organizationType !== fType) return false;
      if (fProvince !== ALL) {
        const rProvName = r.provinceName || r.province;
        if (rProvName !== fProvince) return false;
      }
      if (fName && !r.organizationName.toLowerCase().includes(fName.toLowerCase())) return false;
      return true;
    });
  }, [registrations, fProgram, fYear, fStatus, fType, fName, fProvince]);

  const hasActiveFilter = fProgram !== ALL || fYear !== ALL || fStatus !== ALL || fType !== ALL || fProvince !== ALL || fName !== "";

  const clearFilters = () => {
    setFProgram(ALL);
    setFYear(ALL);
    setFStatus(ALL);
    setFType(ALL);
    setFName("");
    setFProvince(ALL);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">ข้อมูลการจัดการการสมัคร</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">ตัวกรอง</CardTitle>
            </div>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                <X className="h-3 w-3 mr-1" /> ล้างตัวกรอง
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ปีที่สมัคร */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ปีที่สมัคร</label>
              <Select value={fYear} onValueChange={setFYear}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>ทั้งหมด</SelectItem>
                  {uniqueYears.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y + 543}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {Object.entries(statusMap).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
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
                    <SelectItem key={t} value={t}>{t}</SelectItem>
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
                    <SelectItem key={p} value={p}>{p}</SelectItem>
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
            <CardTitle className="text-base">รายการสมัครเข้าร่วมโครงการ</CardTitle>
            <span className="text-xs text-muted-foreground">{filtered.length} รายการ</span>
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>โครงการ</TableHead>
                    <TableHead>ชื่อหน่วยงาน</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>จังหวัด</TableHead>
                    <TableHead>วันที่สมัคร</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="w-16 text-center">ดู</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => {
                    const status = statusMap[r.status] ?? { label: r.status, variant: "outline" as const };
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>{programName(r.programId)}</TableCell>
                        <TableCell className="font-medium">{r.organizationName}</TableCell>
                        <TableCell>{r.organizationType || "-"}</TableCell>
                        <TableCell>
                          {r.provinceName || r.province || "-"}
                        </TableCell>
                        <TableCell>{new Date(r.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" onClick={() => setSelected(r)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
