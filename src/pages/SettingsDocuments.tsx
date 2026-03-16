import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  program_id: string;
  name: string;
  sample_file_url: string | null;
  sample_file_name: string | null;
  is_required: boolean;
  sort_order: number;
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
    supabase.from("programs").select("id, name").order("sort_order").then(({ data }) => {
      if (data) {
        setPrograms(data);
        if (data.length > 0 && !selectedProgram) setSelectedProgram(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedProgram) return;
    setLoading(true);
    supabase
      .from("document_templates")
      .select("*")
      .eq("program_id", selectedProgram)
      .order("sort_order")
      .then(({ data, error }) => {
        if (data) setDocs(data as DocTemplate[]);
        if (error) toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
        setLoading(false);
      });
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
    setFormRequired(doc.is_required);
    setFile(null);
    setDialogOpen(true);
  };

  const uploadFile = async (f: File): Promise<{ url: string; name: string } | null> => {
    const ext = f.name.split(".").pop();
    const path = `${selectedProgram}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("document-samples").upload(path, f);
    if (error) {
      toast({ title: "อัปโหลดไม่สำเร็จ", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from("document-samples").getPublicUrl(path);
    return { url: urlData.publicUrl, name: f.name };
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "กรุณากรอกชื่อเอกสาร", variant: "destructive" });
      return;
    }
    setUploading(true);

    let fileUrl = editing?.sample_file_url ?? null;
    let fileName = editing?.sample_file_name ?? null;

    if (file) {
      const result = await uploadFile(file);
      if (result) {
        fileUrl = result.url;
        fileName = result.name;
      }
    }

    if (editing) {
      const { error } = await supabase
        .from("document_templates")
        .update({ name: formName.trim(), is_required: formRequired, sample_file_url: fileUrl, sample_file_name: fileName })
        .eq("id", editing.id);
      if (error) toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
      else toast({ title: "บันทึกสำเร็จ" });
    } else {
      const { error } = await supabase
        .from("document_templates")
        .insert({ program_id: selectedProgram, name: formName.trim(), is_required: formRequired, sample_file_url: fileUrl, sample_file_name: fileName, sort_order: docs.length });
      if (error) toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
      else toast({ title: "เพิ่มเอกสารสำเร็จ" });
    }

    setDialogOpen(false);
    setUploading(false);
    // Refresh
    const { data } = await supabase.from("document_templates").select("*").eq("program_id", selectedProgram).order("sort_order");
    if (data) setDocs(data as DocTemplate[]);
  };

  const handleDelete = async (doc: DocTemplate) => {
    if (!confirm(`ต้องการลบเอกสาร "${doc.name}" หรือไม่?`)) return;
    const { error } = await supabase.from("document_templates").delete().eq("id", doc.id);
    if (error) toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    else {
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      toast({ title: "ลบสำเร็จ" });
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
                        {doc.sample_file_url ? (
                          <a href={doc.sample_file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-sm">
                            <ExternalLink className="h-3.5 w-3.5" />
                            {doc.sample_file_name || "ดูตัวอย่าง"}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.is_required ? (
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
              {editing?.sample_file_url && !file && (
                <p className="text-xs text-muted-foreground">ไฟล์ปัจจุบัน: {editing.sample_file_name || "มีไฟล์แนบ"}</p>
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
