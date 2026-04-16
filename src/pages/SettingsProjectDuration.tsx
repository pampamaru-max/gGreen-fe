import { useState, useEffect, useMemo } from "react";
import apiClient from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Pencil, Trash2, Clock, Info } from "lucide-react";
import { AlertActionPopup } from "@/components/AlertActionPopup";

interface Program { id: string; name: string; }
interface ProgramDuration {
  id: string;
  programId: string;
  durationYears: number;
  renewalMonths: number | null;
}

enum RenewType {
  NOM = 'normal',
  NULL = 'null'
}

export default function SettingsProjectDuration() {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [duration, setDuration] = useState<ProgramDuration | null>(null);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDurationYears, setFormDurationYears] = useState<string>("3");
  const [formRenewalMonths, setFormRenewalMonths] = useState<string | null>("3");
  const [selectedRenewType, setSelectedRenewType] = useState<string>(RenewType.NOM);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiClient.get("/programs").then(({ data }) => {
      if (data) {
        setPrograms(data);
        if (data.length > 0) setSelectedProgram(data[0].id);
      }
    }).catch((error) => {
      toast({ title: "เกิดข้อผิดพลาดในการโหลดโครงการ", description: error.response?.data?.message || error.message, variant: "destructive" });
    });
  }, []);

  const fetchDuration = async () => {
    if (!selectedProgram) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/program-durations?programId=${selectedProgram}`);
      setDuration(data ?? null);
    } catch {
      setDuration(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuration();
  }, [selectedProgram]);

  const openDialog = () => {
    setFormDurationYears(duration ? String(duration.durationYears) : "3");
    setFormRenewalMonths(duration ? String(duration.renewalMonths) : "3");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const years = parseInt(formDurationYears);
    const months = selectedRenewType === RenewType.NOM ? parseInt(formRenewalMonths) : null;
    if (!years || years < 1) {
      toast({ title: "กรุณากรอกระยะเวลาอายุการรับรองที่ถูกต้อง", variant: "destructive" });
      return;
    }
    if (selectedRenewType === RenewType.NOM && months < 1) {
      toast({ title: "กรุณากรอกระยะเวลาต่ออายุที่ถูกต้อง", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post("/program-durations", {
        programId: selectedProgram,
        durationYears: years,
        renewalMonths: months,
      });
      toast({ title: "บันทึกสำเร็จ", variant: "success" });
      setDialogOpen(false);
      fetchDuration();
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.response?.data?.message || error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!duration) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/program-durations/${duration.id}`);
      setDuration(null);
      toast({ title: "ลบข้อมูลสำเร็จ", variant: "success" });
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.response?.data?.message || error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const programName = useMemo(() => programs.find((p) => p.id === selectedProgram)?.name ?? "", [programs, selectedProgram]);

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      <div className="px-6 py-4 rounded-2xl shrink-0" style={{ background: "var(--glass-bg)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "var(--glass-shadow)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "#3a7d2c" }}>
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: "var(--green-heading)" }}>ระยะเวลาโครงการ</h2>
            <p className="text-xs" style={{ color: "var(--green-muted)" }}>กำหนดช่วงเวลาเปิด-ปิดรับสมัครในแต่ละโครงการ</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={{ background: "var(--glass-bg)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "var(--glass-shadow)", border: "1px solid var(--glass-border)" }}>
        <div className="h-full overflow-y-auto px-6 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Label>โครงการ</Label>
        <Select value={selectedProgram} onValueChange={setSelectedProgram}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="เลือกโครงการ" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProgram && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">ระยะเวลาการรับรอง — {programName}</CardTitle>
            <Button size="sm" onClick={openDialog}>
              {duration ? <><Pencil className="h-4 w-4 mr-1" /> แก้ไข</> : <>+ ตั้งค่าระยะเวลา</>}
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
            ) : duration ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">ระยะเวลาอายุการรับรอง</p>
                    <p className="text-2xl font-bold text-primary">{duration.durationYears} <span className="text-base font-normal text-foreground">ปี</span></p>
                    <p className="text-xs text-muted-foreground">หลังจากผ่านการประเมิน ใบรับรองจะมีอายุ {duration.durationYears} ปี</p>
                  </div>
                  <div className={`rounded-lg border bg-muted/40 p-4 ${ duration.renewalMonths ? 'space-y-1' : 'space-y-2.5'}`}>
                    <p className="text-xs text-muted-foreground">ระยะเวลาต่ออายุหลังหมดอายุ</p>
                    {duration.renewalMonths ?
                      <>
                        <p className="text-2xl font-bold text-amber-600">{duration.renewalMonths} <span className="text-base font-normal text-foreground">เดือน</span></p>
                        <p className="text-xs text-muted-foreground">ต้องยื่นขอต่ออายุภายใน {duration.renewalMonths} เดือนหลังจากหมดอายุ</p>
                      </> : <p className="text-2xl font-bold text-amber-600">ไม่จำกัด</p>
                    }
                  </div>
                </div>
                <div className="flex justify-end">
                  <AlertActionPopup
                    trigger={
                      <Button variant="ghost" size="sm" className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-1" /> ลบข้อมูล
                      </Button>
                    }
                    title="ยืนยันการลบข้อมูลระยะเวลาของโครงการ"
                    description={`ต้องการลบข้อมูลระยะเวลาของโครงการ ${programName} หรือไม่?`}
                    labelButtonLeft="ยกเลิก"
                    buttonRight={
                      <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "กำลังลบ..." : "ลบ"}
                      </Button>
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <Info className="h-8 w-8" />
                <p className="text-sm">ยังไม่ได้ตั้งค่าระยะเวลาสำหรับโครงการนี้</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={openDialog}>+ ตั้งค่าระยะเวลา</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{duration ? "แก้ไขระยะเวลาโครงการ" : "ตั้งค่าระยะเวลาโครงการ"}</DialogTitle>
            <DialogDescription>กำหนดอายุการรับรองและระยะเวลาต่ออายุสำหรับ {programName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>ระยะเวลาอายุการรับรอง (ปี) *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={formDurationYears}
                  onChange={(e) => setFormDurationYears(e.target.value)}
                  className="w-32"
                  placeholder="เช่น 3"
                />
                <span className="text-sm text-muted-foreground">ปี</span>
              </div>
              <p className="text-xs text-muted-foreground">หากประเมินผ่าน ใบรับรองจะมีอายุตามจำนวนปีที่กำหนด</p>
            </div>
            <div className="space-y-2">
              <Label>ระยะเวลาต้องต่ออายุหลังหมดอายุ (เดือน) *</Label>
              <div className="flex flex-col space-y-4">
                <RadioGroup
                  className="flex items-center gap-8"
                  value={selectedRenewType}
                  onValueChange={setSelectedRenewType}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={RenewType.NOM} />
                    <Label>กำหนดระยะเวลา</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={RenewType.NULL} />
                    <Label>ไม่จำกัดระยะเวลา</Label>
                  </div>
                </RadioGroup>
                {selectedRenewType === RenewType.NOM &&
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={formRenewalMonths}
                      onChange={(e) => setFormRenewalMonths(e.target.value)}
                      className="w-32"
                      placeholder="เช่น 3"
                    />
                    <span className="text-sm text-muted-foreground">เดือน</span>
                  </div>
                }
              </div>
              <p className="text-xs text-muted-foreground">ระยะเวลาผ่อนผันที่ต้องยื่นขอต่ออายุหลังใบรับรองหมดอายุ</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}
