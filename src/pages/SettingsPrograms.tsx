import { useState, useRef, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AboutContentEditor, { type ContentBlock } from "@/components/AboutContentEditor";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical, X, Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type GuidelineFile = { url: string; name: string };
export type GuidelineItem = { title: string; files: GuidelineFile[] };

type Program = {
  id: string;
  name: string;
  description: string;
  icon: string;
  about: ContentBlock[];
  guidelines: GuidelineItem[];
  reports: GuidelineItem[];
  sort_order: number;
};

/** Backward compat: convert old string[] to GuidelineItem[] */
function normalizeGuidelines(raw: unknown): GuidelineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return { title: item, files: [] };
    if (item && typeof item === "object" && "title" in item) {
      return { title: String((item as any).title), files: Array.isArray((item as any).files) ? (item as any).files : [] };
    }
    return { title: "", files: [] };
  });
}

const emptyProgram: Omit<Program, "sort_order"> = {
  id: "",
  name: "",
  description: "",
  icon: "Building2",
  about: [],
  guidelines: [],
  reports: [],
};

/* ── Sortable guideline card ── */
function SortableGuidelineCard({
  id, guideline, index, onTitleChange, onRemove, onRemoveFile, onUpload, fileInputRefs, uploadingIndex,
}: {
  id: string;
  guideline: GuidelineItem;
  index: number;
  onTitleChange: (i: number, t: string) => void;
  onRemove: (i: number) => void;
  onRemoveFile: (gi: number, fi: number) => void;
  onUpload: (gi: number, files: FileList | null) => void;
  fileInputRefs: React.MutableRefObject<Record<number, HTMLInputElement | null>>;
  uploadingIndex: number | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <Card ref={setNodeRef} style={style} className="relative">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <button type="button" className="cursor-grab touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
          <Input
            value={guideline.title}
            onChange={(e) => onTitleChange(index, e.target.value)}
            placeholder="ชื่อหัวข้อ..."
            className="flex-1 text-sm"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onRemove(index)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        {guideline.files.length > 0 && (
          <div className="space-y-1">
            {guideline.files.map((file, fi) => (
              <div key={fi} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:underline">
                  {file.name}
                </a>
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => onRemoveFile(index, fi)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div>
          <input
            type="file"
            multiple
            className="hidden"
            ref={(el) => { fileInputRefs.current[index] = el; }}
            onChange={(e) => onUpload(index, e.target.files)}
          />
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => fileInputRefs.current[index]?.click()}
            disabled={uploadingIndex === index}
          >
            {uploadingIndex === index ? (
              <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> กำลังอัปโหลด...</>
            ) : (
              <><Upload className="mr-1 h-3 w-3" /> แนบไฟล์</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPrograms() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [form, setForm] = useState(emptyProgram);
  const [newGuidelineTitle, setNewGuidelineTitle] = useState("");
  const [newReportTitle, setNewReportTitle] = useState("");
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadingReportIndex, setUploadingReportIndex] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const reportFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const handleGuidelineDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt(String(active.id).replace("guideline-", ""));
    const newIndex = parseInt(String(over.id).replace("guideline-", ""));
    setForm((f) => ({ ...f, guidelines: arrayMove(f.guidelines, oldIndex, newIndex) }));
  }, []);

  const handleReportDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt(String(active.id).replace("report-", ""));
    const newIndex = parseInt(String(over.id).replace("report-", ""));
    setForm((f) => ({ ...f, reports: arrayMove(f.reports, oldIndex, newIndex) }));
  }, []);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        about: (p.about as ContentBlock[]) ?? [],
        guidelines: normalizeGuidelines(p.guidelines),
        reports: normalizeGuidelines(p.reports),
      })) as Program[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (program: Omit<Program, "sort_order"> & { sort_order?: number }) => {
      const payload = {
        ...program,
        about: program.about as unknown as string,
        guidelines: program.guidelines as unknown as string,
        reports: program.reports as unknown as string,
        sort_order: program.sort_order ?? programs.length,
      };
      if (editingProgram) {
        const { error } = await supabase.from("programs").update(payload).eq("id", editingProgram.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("programs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setDialogOpen(false);
      toast({ title: editingProgram ? "อัปเดตโครงการสำเร็จ" : "เพิ่มโครงการสำเร็จ" });
    },
    onError: (err: Error) => {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast({ title: "ลบโครงการสำเร็จ" });
    },
  });

  const openAdd = () => {
    setEditingProgram(null);
    setForm(emptyProgram);
    setNewGuidelineTitle("");
    setDialogOpen(true);
  };

  const openEdit = (p: Program) => {
    setEditingProgram(p);
    setForm({
      id: p.id,
      name: p.name,
      description: p.description,
      icon: p.icon,
      about: [...p.about],
      guidelines: p.guidelines.map((g) => ({ ...g, files: [...g.files] })),
      reports: p.reports.map((r) => ({ ...r, files: [...r.files] })),
    });
    setNewGuidelineTitle("");
    setDialogOpen(true);
  };

  const addGuideline = () => {
    if (!newGuidelineTitle.trim()) return;
    setForm((f) => ({ ...f, guidelines: [...f.guidelines, { title: newGuidelineTitle.trim(), files: [] }] }));
    setNewGuidelineTitle("");
  };

  const removeGuideline = (index: number) => {
    setForm((f) => ({ ...f, guidelines: f.guidelines.filter((_, i) => i !== index) }));
  };

  const updateGuidelineTitle = (index: number, title: string) => {
    setForm((f) => ({
      ...f,
      guidelines: f.guidelines.map((g, i) => (i === index ? { ...g, title } : g)),
    }));
  };

  const handleFileUpload = async (guidelineIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingIndex(guidelineIndex);
    try {
      const newFiles: GuidelineFile[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `guidelines/${form.id || "new"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("program-assets").upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("program-assets").getPublicUrl(path);
        newFiles.push({ url: urlData.publicUrl, name: file.name });
      }
      setForm((f) => ({
        ...f,
        guidelines: f.guidelines.map((g, i) =>
          i === guidelineIndex ? { ...g, files: [...g.files, ...newFiles] } : g
        ),
      }));
    } catch (err: any) {
      toast({ title: "อัปโหลดไฟล์ไม่สำเร็จ", description: err.message, variant: "destructive" });
    } finally {
      setUploadingIndex(null);
    }
  };

  const removeFile = (guidelineIndex: number, fileIndex: number) => {
    setForm((f) => ({
      ...f,
      guidelines: f.guidelines.map((g, i) =>
        i === guidelineIndex ? { ...g, files: g.files.filter((_, fi) => fi !== fileIndex) } : g
      ),
    }));
  };

  /* ── Report handlers (mirror guideline handlers) ── */
  const addReport = () => {
    if (!newReportTitle.trim()) return;
    setForm((f) => ({ ...f, reports: [...f.reports, { title: newReportTitle.trim(), files: [] }] }));
    setNewReportTitle("");
  };

  const removeReport = (index: number) => {
    setForm((f) => ({ ...f, reports: f.reports.filter((_, i) => i !== index) }));
  };

  const updateReportTitle = (index: number, title: string) => {
    setForm((f) => ({
      ...f,
      reports: f.reports.map((r, i) => (i === index ? { ...r, title } : r)),
    }));
  };

  const handleReportFileUpload = async (reportIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingReportIndex(reportIndex);
    try {
      const newFiles: GuidelineFile[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `reports/${form.id || "new"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("program-assets").upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("program-assets").getPublicUrl(path);
        newFiles.push({ url: urlData.publicUrl, name: file.name });
      }
      setForm((f) => ({
        ...f,
        reports: f.reports.map((r, i) =>
          i === reportIndex ? { ...r, files: [...r.files, ...newFiles] } : r
        ),
      }));
    } catch (err: any) {
      toast({ title: "อัปโหลดไฟล์ไม่สำเร็จ", description: err.message, variant: "destructive" });
    } finally {
      setUploadingReportIndex(null);
    }
  };

  const removeReportFile = (reportIndex: number, fileIndex: number) => {
    setForm((f) => ({
      ...f,
      reports: f.reports.map((r, i) =>
        i === reportIndex ? { ...r, files: r.files.filter((_, fi) => fi !== fileIndex) } : r
      ),
    }));
  };

  const handleSave = () => {
    if (!form.id.trim() || !form.name.trim()) {
      toast({ title: "กรุณากรอก Slug และชื่อโครงการ", variant: "destructive" });
      return;
    }
    upsertMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการโครงการ</h1>
          <p className="text-sm text-muted-foreground">เพิ่ม แก้ไข หรือลบโครงการภายใต้ G-Green</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> เพิ่มโครงการ
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">กำลังโหลด...</p>
      ) : (
        <div className="grid gap-3">
          {programs.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`ต้องการลบโครงการ "${p.name}" หรือไม่?`)) {
                        deleteMutation.mutate(p.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProgram ? "แก้ไขโครงการ" : "เพิ่มโครงการใหม่"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="about" className="flex-1">เกี่ยวกับโครงการ</TabsTrigger>
              <TabsTrigger value="guidelines" className="flex-1">แนวทาง</TabsTrigger>
              <TabsTrigger value="reports" className="flex-1">รายงาน</TabsTrigger>
            </TabsList>
            <TabsContent value="about" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Slug (ID)</Label>
                  <Input
                    value={form.id}
                    onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                    placeholder="green-hotel"
                    disabled={!!editingProgram}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>ไอคอน</Label>
                  <Input
                    value={form.icon}
                    onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                    placeholder="Building2"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>ชื่อโครงการ</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Green Hotel"
                />
              </div>
              <div className="space-y-1.5">
                <Label>คำอธิบายสั้น</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="โรงแรมที่เป็นมิตรกับสิ่งแวดล้อม"
                />
              </div>
              <div className="space-y-1.5">
                <Label>เกี่ยวกับโครงการ</Label>
                <AboutContentEditor
                  blocks={form.about}
                  onChange={(about) => setForm((f) => ({ ...f, about }))}
                  programId={form.id || "new"}
                />
              </div>
            </TabsContent>
            <TabsContent value="guidelines" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label>แนวทางการดำเนินงาน</Label>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGuidelineDragEnd}>
                  <SortableContext items={form.guidelines.map((_, i) => `guideline-${i}`)} strategy={verticalListSortingStrategy}>
                    {form.guidelines.map((g, i) => (
                      <SortableGuidelineCard
                        key={`guideline-${i}`}
                        id={`guideline-${i}`}
                        guideline={g}
                        index={i}
                        onTitleChange={updateGuidelineTitle}
                        onRemove={removeGuideline}
                        onRemoveFile={removeFile}
                        onUpload={handleFileUpload}
                        fileInputRefs={fileInputRefs}
                        uploadingIndex={uploadingIndex}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                {/* Add new guideline */}
                <div className="flex gap-2">
                  <Input
                    value={newGuidelineTitle}
                    onChange={(e) => setNewGuidelineTitle(e.target.value)}
                    placeholder="เพิ่มหัวข้อแนวทาง..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGuideline())}
                  />
                  <Button variant="outline" size="sm" onClick={addGuideline} type="button">
                    เพิ่ม
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="reports" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label>รายงาน</Label>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReportDragEnd}>
                  <SortableContext items={form.reports.map((_, i) => `report-${i}`)} strategy={verticalListSortingStrategy}>
                    {form.reports.map((r, i) => (
                      <SortableGuidelineCard
                        key={`report-${i}`}
                        id={`report-${i}`}
                        guideline={r}
                        index={i}
                        onTitleChange={updateReportTitle}
                        onRemove={removeReport}
                        onRemoveFile={removeReportFile}
                        onUpload={handleReportFileUpload}
                        fileInputRefs={reportFileInputRefs}
                        uploadingIndex={uploadingReportIndex}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                <div className="flex gap-2">
                  <Input
                    value={newReportTitle}
                    onChange={(e) => setNewReportTitle(e.target.value)}
                    placeholder="เพิ่มหัวข้อรายงาน..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addReport())}
                  />
                  <Button variant="outline" size="sm" onClick={addReport} type="button">
                    เพิ่ม
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
