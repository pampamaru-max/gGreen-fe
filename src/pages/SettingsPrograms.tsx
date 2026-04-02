import { useState, useRef, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AboutContentEditor, { type ContentBlock } from "@/components/AboutContentEditor";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Pencil, GripVertical, X, Upload, FileText, Loader2,
  Building2, UtensilsCrossed, Home, Factory, Trees, Recycle, Award, Star,
  ClipboardCheck, Leaf, ShoppingBag, Landmark, Globe, Sun, Wind, Droplets,
  Sprout, Hotel, FlameKindling, Bike, Bus, Car, Package, Truck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AlertActionPopup } from "@/components/AlertActionPopup";

/* ── Icon picker ── */
const ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: "Building2", Icon: Building2 },
  { name: "UtensilsCrossed", Icon: UtensilsCrossed },
  { name: "Home", Icon: Home },
  { name: "Factory", Icon: Factory },
  { name: "Trees", Icon: Trees },
  { name: "Recycle", Icon: Recycle },
  { name: "Award", Icon: Award },
  { name: "Star", Icon: Star },
  { name: "ClipboardCheck", Icon: ClipboardCheck },
  { name: "Leaf", Icon: Leaf },
  { name: "Sprout", Icon: Sprout },
  { name: "ShoppingBag", Icon: ShoppingBag },
  { name: "Landmark", Icon: Landmark },
  { name: "Globe", Icon: Globe },
  { name: "Sun", Icon: Sun },
  { name: "Wind", Icon: Wind },
  { name: "Droplets", Icon: Droplets },
  { name: "Hotel", Icon: Hotel },
  { name: "FlameKindling", Icon: FlameKindling },
  { name: "Bike", Icon: Bike },
  { name: "Bus", Icon: Bus },
  { name: "Car", Icon: Car },
  { name: "Package", Icon: Package },
  { name: "Truck", Icon: Truck },
];

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const found = ICON_OPTIONS.find((o) => o.name === value);
  const CurrentIcon = found?.Icon ?? Building2;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 font-normal">
          <CurrentIcon className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">{value || "เลือกไอคอน"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="grid grid-cols-4 gap-1">
          {ICON_OPTIONS.map(({ name, Icon }) => (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => { onChange(name); setOpen(false); }}
              className={`flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-accent transition-colors ${value === name ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate w-full text-center leading-tight">{name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => onRemove(index)}
          >
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

/* ── Sortable program card ── */
function SortableProgramCard({ program, onEdit, onDelete }: { program: Program; onEdit: (p: Program) => void; onDelete: (p: Program) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: program.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <Card ref={setNodeRef} style={style} className="bg-accent/10 border-accent/30">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" className="cursor-grab touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="font-semibold text-sm">{program.name}</p>
            <p className="text-xs text-muted-foreground truncate">{program.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(program)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertActionPopup
            type="delete"
            action={() => onDelete(program)}
            title="ยืนยันการลบโครงการ"
            description={`ต้องการลบโครงการ "${program.name}" หรือไม่?`}
          />
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
      const { data } = await apiClient.get<Program[]>("programs");
      return data.map((p: any) => ({
        ...p,
        sort_order: p.sortOrder,
        about: (p.about as ContentBlock[]) ?? [],
        guidelines: normalizeGuidelines(p.guidelines),
        reports: normalizeGuidelines(p.reports),
      })) as Program[];
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered: Program[]) => {
      await Promise.all(
        reordered.map((p, i) => apiClient.patch(`programs/${p.id}`, { sortOrder: i }))
      );
    },
    onMutate: async (reordered) => {
      await queryClient.cancelQueries({ queryKey: ["programs"] });
      const previous = queryClient.getQueryData<Program[]>(["programs"]);
      queryClient.setQueryData(["programs"], reordered);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["programs"], context.previous);
      toast({ title: "จัดลำดับไม่สำเร็จ", variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["programs"] }),
  });

  const handleProgramDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = programs.findIndex((p) => p.id === active.id);
    const newIndex = programs.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(programs, oldIndex, newIndex).map((p, i) => ({ ...p, sort_order: i }));
    reorderMutation.mutate(reordered);
  }, [programs, reorderMutation]);

  const upsertMutation = useMutation({
    mutationFn: async (program: Omit<Program, "sort_order"> & { sort_order?: number }) => {
      if (editingProgram) {
        const { name, description, icon, about, guidelines, reports, sort_order } = program;
        await apiClient.patch(`programs/${editingProgram.id}`, {
          name, description, icon, about, guidelines, reports,
          sortOrder: sort_order ?? programs.length,
        });
      } else {
        await apiClient.post("programs", {
          id: program.id,
          name: program.name,
          description: program.description,
          icon: program.icon,
          about: program.about,
          guidelines: program.guidelines,
          reports: program.reports,
          sortOrder: program.sort_order ?? programs.length,
        });
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
      await apiClient.delete(`programs/${id}`);
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
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", `guidelines/${form.id || "new"}`);
        const { data } = await apiClient.post<{ url: string }>("files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        });
        newFiles.push({ url: data.url, name: file.name });
      }
      setForm((f) => ({
        ...f,
        guidelines: f.guidelines.map((g, i) =>
          i === guidelineIndex ? { ...g, files: [...g.files, ...newFiles] } : g,
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
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", `reports/${form.id || "new"}`);
        const { data } = await apiClient.post<{ url: string }>("files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        });
        newFiles.push({ url: data.url, name: file.name });
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
    <div className="min-h-full bg-background">
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">จัดการโครงการ</h2>
            <p className="text-xs text-muted-foreground">เพิ่ม แก้ไข หรือลบโครงการภายใต้ G-Green</p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> เพิ่มโครงการ
          </Button>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProgramDragEnd}>
            <SortableContext items={programs.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-3">
                {programs.map((p) => (
                  <SortableProgramCard
                    key={p.id}
                    program={p}
                    onEdit={openEdit}
                    onDelete={(prog) => deleteMutation.mutate(prog.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden p-0 flex flex-col">
          <div className="px-6 pt-6 pb-3 flex-shrink-0">
            <DialogHeader>
              <DialogTitle>{editingProgram ? "แก้ไขโครงการ" : "เพิ่มโครงการใหม่"}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="overflow-y-auto scrollbar-thin flex-1 px-6 pb-2 mr-2">
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
                  <IconPicker
                    value={form.icon}
                    onChange={(v) => setForm((f) => ({ ...f, icon: v }))}
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
          </div>
          <div className="px-6 py-4 flex-shrink-0 border-t">
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
              <Button onClick={handleSave} disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

