import { useState, useEffect, useMemo } from "react";
import { Award, Trophy, Medal, Plus, Trash2, Loader2, Save, Pencil, GripVertical, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import apiClient from "@/lib/axios";

interface ScoringLevel {
  id: number;
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
  icon: string;
  sortOrder: number;
  programId: string | null;
}

interface DbProgram {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

const ICON_OPTIONS = [
  { value: "trophy", label: "ถ้วยรางวัล", Icon: Trophy },
  { value: "medal", label: "เหรียญ", Icon: Medal },
  { value: "award", label: "รางวัล", Icon: Award },
];

const getIconComponent = (icon: string) => {
  const found = ICON_OPTIONS.find((o) => o.value === icon);
  return found ? found.Icon : Trophy;
};

interface LevelFormProps {
  initial?: Partial<ScoringLevel>;
  onSubmit: (data: Omit<ScoringLevel, "id" | "sortOrder" | "programId">) => void;
  trigger: React.ReactNode;
  title: string;
}

const LevelFormDialog = ({ initial, onSubmit, trigger, title }: LevelFormProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name || "");
  const [minScore, setMinScore] = useState(String(initial?.minScore ?? ""));
  const [maxScore, setMaxScore] = useState(String(initial?.maxScore ?? ""));
  const [color, setColor] = useState(initial?.color || "#22c55e");
  const [icon, setIcon] = useState(initial?.icon || "trophy");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setMinScore(String(initial?.minScore ?? ""));
      setMaxScore(String(initial?.maxScore ?? ""));
      setColor(initial?.color || "#22c55e");
      setIcon(initial?.icon || "trophy");
    }
  }, [open, initial]);

  const handleSubmit = () => {
    if (!name.trim() || minScore === "" || maxScore === "") {
      toast({ title: "กรุณากรอกข้อมูลให้ครบ", variant: "destructive" });
      return;
    }
    onSubmit({
      name: name.trim(),
      minScore: Number(minScore),
      maxScore: Number(maxScore),
      color,
      icon,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>ชื่อระดับ</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ทอง (Gold)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>คะแนนต่ำสุด (%)</Label>
              <Input type="number" min={0} max={100} step={0.01} value={minScore} onChange={(e) => setMinScore(e.target.value)} />
            </div>
            <div>
              <Label>คะแนนสูงสุด (%)</Label>
              <Input type="number" min={0} max={100} step={0.01} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>สี</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
              </div>
            </div>
            <div>
              <Label>ไอคอน</Label>
              <div className="flex gap-1 mt-1">
                {ICON_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={icon === opt.value ? "default" : "outline"}
                    size="icon"
                    onClick={() => setIcon(opt.value)}
                    title={opt.label}
                  >
                    <opt.Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
          </div>
          {/* Preview */}
          <div className="rounded-xl border-2 p-4 flex items-center gap-3" style={{ borderColor: color, backgroundColor: `${color}10` }}>
            {(() => { const IC = getIconComponent(icon); return <IC className="h-6 w-6" style={{ color }} />; })()}
            <div>
              <p className="font-bold" style={{ color }}>{name || "ชื่อระดับ"}</p>
              <p className="text-xs text-muted-foreground">{minScore || "0"} – {maxScore || "100"} คะแนน</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">ยกเลิก</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>
            <Save className="mr-2 h-4 w-4" />บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SortableLevelCard = ({ level, onEdit, onDelete }: { level: ScoringLevel; onEdit: (id: number, data: any) => void; onDelete: (id: number) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: level.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const IconComp = getIconComponent(level.icon);

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <button {...attributes} {...listeners} className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
        <GripVertical className="h-4 w-4" />
      </button>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${level.color}20`, color: level.color }}
      >
        <IconComp className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{level.name}</p>
        <p className="text-xs text-muted-foreground">ช่วงคะแนน: {level.minScore}% – {level.maxScore}%</p>
      </div>
      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: level.color }} />
      <LevelFormDialog
        title="แก้ไขระดับ"
        initial={level}
        onSubmit={(data) => onEdit(level.id, data)}
        trigger={
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>คุณต้องการลบระดับ "{level.name}" ใช่หรือไม่?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(level.id)}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const ScoreBar = ({ levels }: { levels: ScoringLevel[] }) => (
  <div className="rounded-xl border bg-card p-4">
    <p className="text-sm font-semibold text-foreground mb-3">แผนภาพช่วงคะแนน</p>
    <div className="relative h-10 rounded-lg overflow-hidden bg-muted">
      {levels.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          ยังไม่มีระดับ
        </div>
      ) : (
        levels.map((level) => {
          const left = level.minScore;
          const width = Math.max(0, level.maxScore - level.minScore);
          return (
            <div
              key={level.id}
              className="absolute top-0 bottom-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: level.color,
              }}
              title={`${level.name}: ${level.minScore}–${level.maxScore}%`}
            >
              {width > 8 ? level.name.split(" ")[0] : ""}
            </div>
          );
        })
      )}
    </div>
    <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
      <span>0%</span>
      <span>25%</span>
      <span>50%</span>
      <span>75%</span>
      <span>100%</span>
    </div>
  </div>
);

const SettingsScoringCriteria = () => {
  const { toast } = useToast();
  const [levels, setLevels] = useState<ScoringLevel[]>([]);
  const [programs, setPrograms] = useState<DbProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const fetchAll = async () => {
    try {
      const [levelsRes, progRes] = await Promise.all([
        apiClient.get("scoring-levels"),
        apiClient.get("programs"),
      ]);
      setLevels(levelsRes.data);
      setPrograms(progRes.data);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "เกิดข้อผิดพลาดในการโหลดข้อมูล",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, []);

  const handleAdd = async (
    data: Omit<ScoringLevel, "id" | "sortOrder" | "programId">,
    programId: string
  ) => {
    const programLevels = levels.filter(l => l.programId === programId);
    const nextOrder =
      programLevels.length > 0
        ? Math.max(...programLevels.map((l) => l.sortOrder)) + 1
        : 1;

    try {
      await apiClient.post("scoring-levels", {
        ...data,
        programId: programId,
        sortOrder: nextOrder,
      });

      toast({ title: "เพิ่มระดับสำเร็จ" });
      fetchAll();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (
    id: number,
    data: Omit<ScoringLevel, "id" | "sortOrder" | "programId">
  ) => {
    try {
      await apiClient.patch(`scoring-levels/${id}`, data);
      toast({ title: "แก้ไขระดับสำเร็จ" });
      fetchAll();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`scoring-levels/${id}`);
      toast({ title: "ลบระดับสำเร็จ" });
      fetchAll();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (programId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const programLevels = levels.filter(l => l.programId === programId).sort((a, b) => a.sortOrder - b.sortOrder);
    const oldIndex = programLevels.findIndex((l) => l.id === active.id);
    const newIndex = programLevels.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(programLevels, oldIndex, newIndex);

    // Optimistic update
    setLevels(prev => {
      const others = prev.filter(l => l.programId !== programId);
      return [...others, ...reordered.map((l, i) => ({ ...l, sortOrder: i + 1 }))];
    });

    try {
      // Note: Reorder endpoint might not exist yet, or uses a different format
      // For now, let's just update each one or wait for reorder endpoint implementation
      // Assuming a generic reorder endpoint exists as per previous code attempt
      await apiClient.patch("scoring-levels/reorder", {
        levels: reordered.map((l, i) => ({
          id: l.id,
          sortOrder: i + 1,
        })),
      });
    } catch (error) {
      console.error("Reorder error:", error);
      fetchAll(); // Revert to server state on error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Award className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">เกณฑ์คะแนน</h2>
            <p className="text-xs text-muted-foreground">กำหนดช่วงคะแนนและระดับผลการประเมินแยกตามโครงการ</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {programs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">ยังไม่มีโครงการ กรุณาเพิ่มโครงการก่อน</p>
        )}

        {programs.map((program) => {
          const programLevels = levels
            .filter(l => l.programId === program.id)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          return (
            <Collapsible key={program.id} className="group/prog" defaultOpen>
              <div className="rounded-xl border border-accent/30 bg-accent/10 overflow-hidden shadow-sm">
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center gap-3 px-5 py-4 hover:bg-accent/20 transition-colors">
                    <ChevronRight className="h-5 w-5 text-accent-foreground/70 transition-transform group-data-[state=open]/prog:rotate-90" />
                    <p className="font-bold text-foreground text-left flex-1 text-base">{program.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {programLevels.length} ระดับ
                    </span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t px-4 py-4 space-y-4 bg-white/50">
                    {/* Score bar for this program */}
                    <ScoreBar levels={programLevels} />

                    {/* Level cards */}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(program.id, e)}>
                      <SortableContext items={programLevels.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                          {programLevels.map((level) => (
                            <SortableLevelCard key={level.id} level={level} onEdit={handleEdit} onDelete={handleDelete} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    {programLevels.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <Award className="mx-auto h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">ยังไม่มีเกณฑ์คะแนนในโครงการนี้</p>
                      </div>
                    )}

                    {/* Add button */}
                    <LevelFormDialog
                      title="เพิ่มระดับใหม่"
                      onSubmit={(data) => handleAdd(data, program.id)}
                      trigger={
                        <Button variant="outline" size="sm" className="gap-1.5 mt-2">
                          <Plus className="h-4 w-4" /> เพิ่มระดับ
                        </Button>
                      }
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {/* Unassigned levels */}
        {levels.some(l => !l.programId) && (
          <div className="rounded-xl border border-dashed bg-muted/30 p-4 space-y-3">
            <p className="font-semibold text-sm text-muted-foreground">ระดับที่ยังไม่ได้ผูกกับโครงการ</p>
            {levels.filter(l => !l.programId).map((level) => (
              <SortableLevelCard key={level.id} level={level} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsScoringCriteria;
