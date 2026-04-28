import { useState, useEffect, useMemo, useRef } from "react";
import apiClient from "@/lib/axios";
import { downloadFileViaApi } from "@/lib/download";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Pencil, FileUp, ExternalLink, FileText, Trash2 } from "lucide-react";
import { AlertActionPopup } from "@/components/AlertActionPopup";
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from "@/helpers/constants";

interface Program { id: string; name: string; }
interface DocTemplate {
  id: string;
  programId: string;
  name: string;
  sampleFileUrl: string | null;
  sampleFileName: string | null;
  isRequired: boolean;
  sortOrder: number;
}

export default function SettingsDocuments() {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [docs, setDocs] = useState<DocTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DocTemplate | null>(null);
  const [formName, setFormName] = useState("");
  const [formRequired, setFormRequired] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch programs from backend API for consistency
    apiClient.get("/programs").then(({ data }) => {
      if (data) {
        setPrograms(data);
        if (data.length > 0 && !selectedProgram) setSelectedProgram(data[0].id);
      }
    }).catch(error => {
      toast({ title: "เกิดข้อผิดพลาดในการโหลดโครงการ", description: error.response?.data?.message || error.message, variant: "destructive" });
    });
  }, []);

  const fetchDocs = async () => {
    if (!selectedProgram) return;
    setLoading(true);
    try {
      // Use backend API to fetch documents (returns camelCase from Prisma)
      const { data } = await apiClient.get(`/document-templates?programId=${selectedProgram}`);
      setDocs(data);
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [selectedProgram]);

  const openAdd = () => {
    setEditing(null);
    setFormName("");
    setFormRequired(false);
    setFile(null);
    setDialogOpen(true);
  };

  const openEdit = (doc: DocTemplate) => {
    setEditing(doc);
    setFormName(doc.name);
    setFormRequired(doc.isRequired);
    setFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "กรุณากรอกชื่อเอกสาร", variant: "destructive" });
      return;
    }
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("name", formName.trim());
      formData.append("isRequired", String(formRequired));
      formData.append("programId", selectedProgram);
      if (file) {
        formData.append("file", file);
      }

      const uploadConfig = {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000, // 2 minutes for large file uploads
      };

      if (editing) {
        // Use backend API to update (bypasses RLS)
        await apiClient.patch(`/document-templates/${editing.id}`, formData, uploadConfig);
        toast({ title: "บันทึกสำเร็จ", variant: "success" });
      } else {
        // Use backend API to create (bypasses RLS)
        formData.append("sortOrder", String(docs.length));
        await apiClient.post("/document-templates", formData, uploadConfig);
        toast({ title: "เพิ่มเอกสารสำเร็จ", variant: "success" });
      }

      setDialogOpen(false);
      fetchDocs();
    } catch (error: any) {
      toast({ 
        title: "เกิดข้อผิดพลาด", 
        description: error.response?.data?.message || error.message, 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: DocTemplate) => {
    if (!confirm(`ต้องการลบเอกสาร "${doc.name}" หรือไม่?`)) return;
    try {
      await apiClient.delete(`/document-templates/${doc.id}`);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      toast({ title: "ลบสำเร็จ", variant: "success" });
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    }
  };

  const programName = useMemo(() => programs.find((p) => p.id === selectedProgram)?.name ?? "", [programs, selectedProgram]);

  const handleDownloadTemplate = (id: string, fileName: string | null) => {
    downloadFileViaApi(
      `document-templates/${id}/download/${encodeURIComponent(fileName ?? "")}`,
      fileName ?? "document"
    );
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      <div className="px-6 py-4 rounded-2xl shrink-0" style={{ background: "var(--glass-bg)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "var(--glass-shadow)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "#3a7d2c" }}>
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: "var(--green-heading)" }}>เอกสารการสมัคร</h2>
            <p className="text-xs" style={{ color: "var(--green-muted)" }}>จัดการเอกสารที่ต้องใช้ในการสมัครแต่ละโครงการ</p>
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
            <CardTitle className="text-lg">รายการเอกสาร — {programName}</CardTitle>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> เพิ่มเอกสาร
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
            ) : docs.length === 0 ? (
              <p className="text-muted-foreground text-sm">ยังไม่มีรายการเอกสาร</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>ชื่อเอกสาร</TableHead>
                    <TableHead>ตัวอย่างเอกสาร</TableHead>
                    <TableHead className="text-center">บังคับแนบ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc, i) => (
                    <TableRow key={doc.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        {doc.sampleFileUrl ? (
                          <button onClick={() => handleDownloadTemplate(doc.id, doc.sampleFileName)} className="text-primary hover:underline inline-flex items-center gap-1 text-sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                            {doc.sampleFileName || "ดูตัวอย่าง"}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.isRequired ? (
                          <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">บังคับ</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">ไม่บังคับ</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon" 
                            className="edit-button"
                            onClick={() => openEdit(doc)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertActionPopup
                            action={() => handleDelete(doc)}
                            type="delete"
                            title="ยืนยันการลบรายการ"
                            description={`ต้องการลบเอกสาร "${doc.name}" หรือไม่?`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขเอกสาร" : "เพิ่มเอกสาร"}</DialogTitle>
            <DialogDescription>กรอกรายละเอียดเอกสารที่ต้องการ</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อเอกสาร *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="เช่น ใบสมัคร, หนังสือรับรอง" />
            </div>
            <div className="space-y-2">
              <Label>ตัวอย่างเอกสาร</Label>
              <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0] && e.target.files[0].size > MAX_FILE_SIZE) {
                        toast({ title: `ไฟล์ ${e.target.files[0].name} ใหญ่เกิน ${MAX_FILE_SIZE_MB}MB`, variant: "destructive" });
                      } else if (e.target.files?.[0]) {
                        setFile(e.target.files[0]);
                      }
                      e.target.value = "";
                    }} />
                  <div onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 py-4 cursor-pointer hover:bg-muted/40 hover:border-muted-foreground/40 transition-colors">
                    {
                      file ? (
                        <div className="flex w-full px-4 items-center justify-between">
                          <div className="flex w-full gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="text-sm text-primary">{file.name}</span>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <AlertActionPopup
                              type="delete"
                              title="ยืนยันการลบ"
                              description="คุณต้องการลบไฟล์ที่แนบนี้หรือไม่?"
                              action={() => setFile(null)}
                              trigger={
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              }
                            />
                          </div>
                        </div>
                      ) :
                      <>
                        <FileUp className="h-6 w-6 text-muted-foreground/40 mb-1.5" />
                        <p className="text-xs text-muted-foreground text-center">รองรับ PDF, Word, Excel, PowerPoint และรูปภาพ (ไม่เกิน 10 MB)</p>
                        <p className="text-xs text-muted-foreground/70 text-center mb-2">ลากไฟล์มาวางหรือคลิกเพื่ออัปโหลด</p>
                        <button disabled={uploading} className="flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-md border bg-background text-foreground hover:bg-muted transition-colors">
                          <Plus className="h-3 w-3" />{uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์"}
                        </button>
                      </>
                    }
                  </div>
              </div>
              {editing?.sampleFileUrl && !file && (
                <p className="text-xs text-muted-foreground">ไฟล์ปัจจุบัน: {editing.sampleFileName || "มีไฟล์แนบ"}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formRequired} onCheckedChange={setFormRequired} />
              <Label>บังคับแนบเอกสาร</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={uploading}>
              {uploading ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}
