import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import apiClient from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileUp, ExternalLink } from "lucide-react";

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

  useEffect(() => {
    // Fetch programs from backend API for consistency
    apiClient.get("/programs").then(({ data }) => {
      if (data) {
        setPrograms(data);
        if (data.length > 0 && !selectedProgram) setSelectedProgram(data[0].id);
      }
    }).catch(error => {
      console.error("Error fetching programs:", error);
      // Fallback to Supabase if API fails
      supabase.from("programs").select("id, name").order("sort_order").then(({ data }) => {
        if (data) {
          setPrograms(data);
          if (data.length > 0 && !selectedProgram) setSelectedProgram(data[0].id);
        }
      });
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

      if (editing) {
        // Use backend API to update (bypasses RLS)
        await apiClient.patch(`/document-templates/${editing.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast({ title: "บันทึกสำเร็จ" });
      } else {
        // Use backend API to create (bypasses RLS)
        formData.append("sortOrder", String(docs.length));
        await apiClient.post("/document-templates", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast({ title: "เพิ่มเอกสารสำเร็จ" });
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
      toast({ title: "ลบสำเร็จ" });
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    }
  };

  const programName = useMemo(() => programs.find((p) => p.id === selectedProgram)?.name ?? "", [programs, selectedProgram]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">จัดการเอกสารการสมัคร</h1>
      </div>

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
                          <a href={doc.sampleFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                            {doc.sampleFileName || "ดูตัวอย่าง"}
                          </a>
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
                          <Button variant="ghost" size="icon" onClick={() => openEdit(doc)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
                <label className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors">
                  <FileUp className="h-4 w-4" />
                  {file ? file.name : "เลือกไฟล์"}
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
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
  );
}
