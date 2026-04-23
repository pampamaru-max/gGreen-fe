import { useState, useEffect } from "react";
import { Award, Trophy, Medal, Plus, Loader2, Save, Pencil, GripVertical, ChevronRight, CheckCircle2, XCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast, useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import apiClient from "@/lib/axios";
import { AlertActionPopup } from "@/components/AlertActionPopup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ScoringLevel } from "./ProjectRegistration";

export enum ScoringLevelType {
  new = "new",
  renew = "renew",
  upgrade = "upgrade",
}
export enum ScoringLevelTypeText {
  new = "ปกติ",
  renew = "ต่ออายุ",
  upgrade = "ยกระดับ",
}
// interface ScoringLevel {
//   id: number;
//   name: string;
//   minScore: number;
//   maxScore: number;
//   color: string;
//   icon: string;
//   sortOrder: number;
//   type: ScoringLevelType;
//   condition: string | null;
//   isActive?: boolean;
//   programId: string | null;
// }

interface DbProgram {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  scoringType?: 'score' | 'yes_no';
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
  onSubmit: (data: Omit<ScoringLevel, "id" | "sortOrder" | "isActive" | "isPass" | "programId">) => void;
  trigger: React.ReactNode;
  title: string;
  programLevels: ScoringLevel[];
  levelId?: number;
  type: ScoringLevelType;
}

const LevelFormDialog = ({
  initial,
  onSubmit,
  trigger,
  title,
  programLevels,
  levelId,
  type
}: LevelFormProps) => {
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name || "");
  const [minScore, setMinScore] = useState(String(initial?.minScore ?? ""));
  const [maxScore, setMaxScore] = useState(String(initial?.maxScore ?? ""));
  const [color, setColor] = useState(initial?.color || "#22c55e");
  const [icon, setIcon] = useState(initial?.icon || "trophy");
  const [open, setOpen] = useState(false);
  const [condition, setCondition] = useState<string>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name || "");
      setMinScore(String(initial?.minScore ?? ""));
      setMaxScore(String(initial?.maxScore ?? ""));
      setColor(initial?.color || "#22c55e");
      setIcon(initial?.icon || "trophy");
      setCondition(initial?.condition || null);
    }
  }, [open, initial]);

  const handleSubmit = () => {
    const min = parseFloat(minScore);
    const max = parseFloat(maxScore);
    if (!name.trim() || minScore === "" || maxScore === "") {
      toast({ title: "กรุณากรอกข้อมูลให้ครบ", variant: "destructive" });
      return;
    } else if (max > 100 || min > 100) {
      toast({
        title: "ไม่สามารถใส่คะแนนมากกว่า 100 ได้",
        variant: "destructive",
      });
      return;
    } else if (min > max) {
      toast({
        title: "คะแนนต่ำสุดต้องน้อยกว่าคะแนนสูงสุด",
        variant: "destructive",
      });
      return;
    } else if (programLevels.length) {
      const IsInRange = programLevels.find(
        (e) => e.id != levelId &&
          e.condition === condition &&
          (((e.minScore <= min && min <= e.maxScore) ||
          (e.minScore <= max && max <= e.maxScore) ||
          (min <= e.minScore && e.maxScore <= max))),
      );
      
      if (IsInRange) {
        toast({
          title: `ช่วงคะแนนทับซ้อนกับช่วงคะแนน ${IsInRange.minScore} - ${IsInRange.maxScore}`,
          variant: "destructive",
        });
        return;
      }
    }
    onSubmit({
      name: name.trim(),
      minScore: Number(minScore),
      maxScore: Number(maxScore),
      color,
      icon,
      type,
      condition,
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
          {type !== ScoringLevelType.new && <div>
            <Label>เงื่อนไข</Label>
            <Input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="เช่น ครั้งที่ 1" />
          </div>}
          {/* Preview */}
          <div className="rounded-xl border-2 p-4 flex items-center gap-3" style={{ borderColor: color, backgroundColor: `${color}10` }}>
            {(() => { const IC = getIconComponent(icon); return <IC className="h-6 w-6" style={{ color }} />; })()}
            <div>
              <p className="font-bold" style={{ color }}>{name || "ชื่อระดับ"}</p>
              <p className="text-xs" style={{ color: "var(--green-muted)" }}>{minScore || "0"} – {maxScore || "100"} คะแนน</p>
              {!!condition?.length && <p className="text-xs text-muted-foreground">เงื่อนไข: {condition}</p>}
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

const SortableLevelCard = ({
  level,
  onEdit,
  onDelete,
  programLevels,
  type,
}: {
  level: ScoringLevel;
  onEdit: (id: number, data: any) => void;
  onDelete: (id: number) => void;
  programLevels: ScoringLevel[];
  type: ScoringLevelType;
}) => {
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
        {!!level.condition?.length && <p className="text-sm text-amber-600">เงื่อนไข: {level.condition}</p>}
        <p className="text-xs text-muted-foreground">ช่วงคะแนน: {level.minScore}% – {level.maxScore}%</p>
      </div>
      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: level.color }} />
      <LevelFormDialog
        title="แก้ไขระดับ"
        initial={level}
        onSubmit={(data) => onEdit(level.id, data)}
        trigger={
          <Button variant="ghost" size="icon" className="edit-button">
            <Pencil className="h-4 w-4" />
          </Button>
        }
        programLevels={programLevels}
        levelId={level.id}
        type={type}
      />
      <AlertActionPopup
        action={() => onDelete(level.id)}
        type="delete"
        title="ยืนยันการลบระดับ"
        description={`คุณต้องการลบระดับ "${level.name}" ใช่หรือไม่?`}
      />
    </div>
  );
};

const ScoreBar = ({ levels }: { levels: ScoringLevel[] }) => (
  <div className="rounded-xl border bg-card p-4 mb-2">
    <p className="text-sm font-semibold text-foreground mb-3">แผนภาพช่วงคะแนน</p>
    <div className="relative h-10 rounded-lg overflow-hidden bg-muted">
      {levels.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          ยังไม่มีระดับ
        </div>
      ) : (
        levels.map((level) => {
          const left = level.minScore;
          const width = Math.max(0, level.maxScore - level.minScore + 1);
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
    <div className="relative mt-1 h-4">
      {levels.map((level, idx) => {
        const left = level.minScore;
        const width = Math.max(0, level.maxScore - level.minScore + 1);

        return (
          <div
            key={level.id}
            className={`absolute text-[10px] text-muted-foreground flex justify-between px-1 ${idx % 2 ? '-mt-[60px]' : ''}`}
            style={{
              left: `${left}%`,
              width: `${width}%`,
            }}
          >
            <span>{level.minScore}%</span>
            <span>{level.maxScore}%</span>
          </div>
        );
      })}
    </div>
  </div>
);

const YesNoScoringView = () => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">โครงการนี้ใช้เกณฑ์แบบสอดคล้อง/ไม่สอดคล้อง ไม่ต้องกำหนดช่วงคะแนน</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-emerald-700 leading-none">สอดคล้อง</h4>
          <p className="text-sm text-emerald-600/80 mt-1">ผ่านเกณฑ์การประเมิน</p>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-rose-100 bg-rose-50/50 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <XCircle className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-rose-700 leading-none">ไม่สอดคล้อง</h4>
          <p className="text-sm text-rose-600/80 mt-1">ไม่ผ่านเกณฑ์การประเมิน</p>
        </div>
      </div>
    </div>
  </div>
);

const CopyScoringLevelsDialog = ({
  selectedProgram,
  scoringPrograms,
  onSubmit,
  trigger,
}: {
  selectedProgram: DbProgram;
  scoringPrograms: (DbProgram & { scoringLevels: ScoringLevel[]; })[];
  onSubmit: (data: ScoringLevel[], setOpen: (boolean) => void) => void;
  trigger: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectItem] = useState<Partial<DbProgram> & { scoringLevels: ScoringLevel[]; }>(null);

  useEffect(() => {
    if (open) {
      setSelectItem(null);
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex flex-col p-0 max-h-[80vh] overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>
            คัดลอกเกณฑ์คะแนนที่มีอยู่ - {selectedProgram.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col max-h-full gap-4 px-6 py-1 overflow-hidden">
          <Select
            value={selectedItem?.id.toString()}
            onValueChange={(value) =>
              setSelectItem(
                scoringPrograms.find((t) => t.id === value) || null,
              )
            }
          >
            <SelectTrigger className="w-3/5">
              <SelectValue placeholder="เลือกโครงการ..." />
            </SelectTrigger>
            <SelectContent>
              {scoringPrograms.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedItem && (
            <div className="flex flex-col gap-2 overflow-y-scroll">
              {selectedItem.scoringLevels.sort().map((level) => {
                const IconComp = getIconComponent(level.icon);
                return (
                  <div className="flex flex-col">
                    {level.sortOrder === 1 &&
                      <p
                        className={
                          cn(
                            'text-sm font-semibold',
                            level.type === ScoringLevelType.new && 'text-blue-600',
                            level.type === ScoringLevelType.renew && 'text-green-600',
                            level.type === ScoringLevelType.upgrade && 'text-purple-600'
                          )}
                      >
                        เกณฑ์คะแนน{ScoringLevelTypeText[level.type]}
                      </p>
                    }
                    <div className="flex gap-3 p-2 items-center border-[1px] rounded-md">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${level.color}20`, color: level.color }}
                      >
                        <IconComp className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{level.name}</p>
                        {!!level.condition?.length && <p className="text-sm text-amber-600">เงื่อนไข: {level.condition}</p>}
                        <p className="text-xs text-muted-foreground">ช่วงคะแนน: {level.minScore}% – {level.maxScore}%</p>
                      </div>
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: level.color }} />
                    </div>
                  </div>
                );
              }
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-2 bg-background">
          <DialogClose asChild>
            <Button variant="outline">ยกเลิก</Button>
          </DialogClose>
          <Button
            onClick={() => onSubmit(selectedItem.scoringLevels, setOpen)}
          >
            <Save className="mr-2 h-4 w-4" />
            ใช้เกณฑ์คะแนน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ScoringLevelView = ({
  type,
  isActive,
  program,
  programLevels,
  scoringPrograms,
  setLevels,
  fetchAll,
  onEdit,
  onDelete
}: {
  type: ScoringLevelType;
  isActive: boolean;
  program: DbProgram;
  programLevels: ScoringLevel[];
  scoringPrograms: (DbProgram & { scoringLevels: ScoringLevel[]; })[];
  setLevels: React.Dispatch<React.SetStateAction<ScoringLevel[]>>;
  fetchAll: () => void;
  onEdit: (id: number, data: any) => void;
  onDelete: (id: number) => void;
}) => {

  const sensors = useSensors( useSensor(PointerSensor),useSensor(KeyboardSensor) );

  const handleAdd = async (
    data: Omit<ScoringLevel, "id" | "sortOrder" | "isActive" | "isPass" | "programId">,
    programId: string,
  ) => {
    const nextOrder =
      programLevels.length > 0
        ? Math.max(...programLevels.map((l) => l.sortOrder)) + 1
        : 1;

    try {
      await apiClient.post("scoring-levels", {
        ...data,
        programId: programId,
        sortOrder: nextOrder,
        type,
      });

      toast({ title: "เพิ่มระดับสำเร็จ", variant: "success" });
      fetchAll();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (data: ScoringLevel[], setOpen: (boolean) => void) => {
    try {
      const newData = data.map((l: any) => {
        delete l.id;
        delete l.createdAt;
        delete l.updatedAt;
        l.maxScore = typeof l.maxScore === 'string' ? parseFloat(l.maxScore) : l.maxScore;
        l.minScore = typeof l.minScore === 'string' ? parseFloat(l.minScore) : l.minScore;
        return { ...l };
      })
      await apiClient.post(`scoring-levels/${program.id}`, [ ...newData ]);
      toast({ title: " คัดลอกระดับสำเร็จ", variant: "success" });
      setOpen(false);
      fetchAll();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async () => {
    try {
      await apiClient.patch(`scoring-levels/status`, { programId: program.id, type, isActive: !isActive });
      toast({ title: "แก้ไขสถานะการเปิดใช้งานสำเร็จ", variant: "success" });
      fetchAll();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (programId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = programLevels.findIndex((l) => l.id === active.id);
    const newIndex = programLevels.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(programLevels, oldIndex, newIndex);

    // Optimistic update
    setLevels((prev) => {
      const others = prev.filter((l) => l.programId !== programId);
      return [
        ...others,
        ...reordered.map((l, i) => ({ ...l, sortOrder: i + 1 })),
      ];
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

  return (
    <>
      <div className="flex flex-col gap-2 mb-2 items-end">
        <Switch checked={isActive} onClick={handleUpdateStatus} disabled={!programLevels.length}/>
        <Label>สถานะการเปิดใช้เกณฑ์คะแนน</Label>
      </div>

      {/* Score bar for this program */}
      <ScoreBar levels={programLevels} />

      {/* Level cards */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => handleDragEnd(program.id, e)}
      >
        <SortableContext
          items={programLevels.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {programLevels.map((level) => (
              <SortableLevelCard
                key={level.id}
                level={level}
                onEdit={onEdit}
                onDelete={onDelete}
                programLevels={programLevels}
                type={type}
              />
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

     <div className="flex gap-2">
        {/* Add button */}
        <LevelFormDialog
          title="เพิ่มระดับใหม่"
          onSubmit={(data) => handleAdd(data, program.id)}
          trigger={
            <Button variant="outline" size="sm" className="gap-1.5 mt-2">
              <Plus className="h-4 w-4" /> เพิ่มระดับ
            </Button>
          }
          programLevels={programLevels}
          type={type}
        />
        <CopyScoringLevelsDialog
          selectedProgram={program}
          scoringPrograms={scoringPrograms.filter((p) => p.id !== program.id)}
          onSubmit={(data, setOpen) => handleCopy(data, setOpen)}
          trigger={
            <Button variant="outline" size="sm" className="gap-1.5 mt-2">
              <Copy className="h-4 w-4" /> ใช้เกณฑ์คะแนนที่มีอยู่
            </Button>
          }
        />
      </div>
    </>
  );
};

const ProgramScoringTabs = ({
  program,
  programLevels,
  scoringPrograms,
  setLevels,
  fetchAll,
  onEdit,
  onDelete
}: {
  program: DbProgram;
  programLevels: ScoringLevel[];
  scoringPrograms: (DbProgram & { scoringLevels: ScoringLevel[]; })[];
  setLevels: React.Dispatch<React.SetStateAction<ScoringLevel[]>>;
  fetchAll: () => void;
  onEdit: (id: number, data: any) => void;
  onDelete: (id: number) => void;
}) => {
  const [selectedType, setSelectedType] = useState<ScoringLevelType>(
    ScoringLevelType.new
  );
  return (
    <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as ScoringLevelType)}>
      <TabsList className="w-full justify-start">
        <TabsTrigger value={ScoringLevelType.new} className="text-xs sm:text-sm">
          เกณฑ์คะแนนปกติ
        </TabsTrigger>
        <TabsTrigger value={ScoringLevelType.renew} className="text-xs sm:text-sm">
          เกณฑ์คะแนนต่ออายุ
        </TabsTrigger>
        <TabsTrigger value={ScoringLevelType.upgrade} className="text-xs sm:text-sm">
          เกณฑ์คะแนนยกระดับ
        </TabsTrigger>
      </TabsList>
      {Object.values(ScoringLevelType).map((type) => 
        <TabsContent key={type} value={type}>
          <ScoringLevelView
            type={type}
            isActive={programLevels.find((l) => l.type === type)?.isActive}
            program={program}
            programLevels={programLevels.filter((l) => l.type === type)}
            scoringPrograms={scoringPrograms}
            setLevels={setLevels}
            fetchAll={fetchAll}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}

const SettingsScoringCriteria = () => {
  const [levels, setLevels] = useState<ScoringLevel[]>([]);
  const [programs, setPrograms] = useState<DbProgram[]>([]);
  const [scoringPrograms, setScoringPrograms] = useState<(DbProgram & { scoringLevels: ScoringLevel[]; })[]>([]);
  const [loading, setLoading] = useState(true);

  const handleProgramTypeChange = async (programId: string, type: 'score' | 'yes_no') => {
    // Note: If backend supports update, call it. For now, local update.
    setPrograms(prev => prev.map(p => p.id === programId ? { ...p, scoringType: type } : p));
    
    // Optional: Persist to backend if API exists
    try {
      await apiClient.patch(`programs/${programId}`, { scoringType: type });
      toast({
        title: "บันทึกสำเร็จ",
        description: `เปลี่ยนรูปแบบเกณฑ์การประเมินเป็น ${type === 'score' ? 'เกณฑ์คะแนน' : 'สอดคล้อง / ไม่สอดคล้อง'} เรียบร้อยแล้ว`,
        variant: "success",
      });
    } catch (error: any) {
      console.error("Failed to update program scoring type:", error);
      toast({
        title: "เกิดข้อผิดพลาดในการบันทึก",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const fetchAll = async () => {
    try {
      const [levelsRes, progRes] = await Promise.all([
        apiClient.get("scoring-levels"),
        apiClient.get("programs"),
      ]);
      setLevels(levelsRes.data);
      setPrograms(progRes.data);
      const progWithSl = progRes.data.map((p) => ({...p, scoringLevels: levelsRes.data.filter((l) => l.programId === p.id)})).filter((p) => p.scoringLevels.length);
      setScoringPrograms(progWithSl);
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

  const handleEdit = async (
    id: number,
    data: Omit<ScoringLevel, "id" | "sortOrder" | "programId">
  ) => {
    try {
      await apiClient.patch(`scoring-levels/${id}`, data);
      toast({ title: "แก้ไขระดับสำเร็จ", variant: "success" });
      fetchAll();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`scoring-levels/${id}`);
      toast({ title: "ลบระดับสำเร็จ", variant: "success" });
      fetchAll();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
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
    <div className="h-full flex flex-col gap-3 p-4">
      <div className="px-6 py-4 rounded-2xl shrink-0" style={{ background: "var(--glass-bg)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "var(--glass-shadow)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "#3a7d2c" }}>
            <Award className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: "var(--green-heading)" }}>เกณฑ์คะแนน</h2>
            <p className="text-xs text-muted-foreground">กำหนดระดับคะแนนและรูปแบบการประเมินในแต่ละโครงการ</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={{ background: "var(--glass-bg)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", boxShadow: "var(--glass-shadow)", border: "1px solid var(--glass-border)" }}>
        <div className="h-full overflow-y-auto px-6 py-6 space-y-6">
        {programs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">ยังไม่มีโครงการ กรุณาเพิ่มโครงการก่อน</p>
        )}

        {programs.map((program) => {
          const programLevels = levels
            .filter(l => l.programId === program.id)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          return (
            <Collapsible key={program.id} className="group/prog" defaultOpen={false}>
              <div className="rounded-xl border border-emerald-100/50 bg-emerald-50/30 overflow-hidden shadow-sm">
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center gap-3 px-5 py-4 hover:bg-emerald-50/60 transition-colors">
                    <ChevronRight className="h-5 w-5 text-emerald-600/70 transition-transform group-data-[state=open]/prog:rotate-90" />
                    <p className="font-bold text-slate-800 text-left flex-1 text-base truncate">{program.name}</p>
                    <span className="text-xs text-slate-500">
                      {program.scoringType === 'yes_no' ? 'สอดคล้อง/ไม่สอดคล้อง' : `${programLevels.length} ระดับ`}
                    </span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t px-5 py-5 space-y-6 bg-white/50">
                    {/* Evaluation Type Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-foreground">รูปแบบเกณฑ์การประเมิน</Label>
                      <RadioGroup
                        defaultValue={program.scoringType || 'score'}
                        onValueChange={(v) => handleProgramTypeChange(program.id, v as 'score' | 'yes_no')}
                        className="flex items-center gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="score" id={`score-${program.id}`} />
                          <Label htmlFor={`score-${program.id}`} className="text-sm font-medium cursor-pointer">เกณฑ์คะแนน (ช่วง %)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes_no" id={`yes_no-${program.id}`} />
                          <Label htmlFor={`yes_no-${program.id}`} className="text-sm font-medium cursor-pointer">สอดคล้อง / ไม่สอดคล้อง</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {program.scoringType === 'yes_no' ? (
                      <YesNoScoringView />
                    ) : (
                      <ProgramScoringTabs
                        program={program}
                        programLevels={programLevels}
                        scoringPrograms={scoringPrograms}
                        setLevels={setLevels}
                        fetchAll={fetchAll}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
        {/* Unassigned levels */}
        {levels.some((l) => !l.programId) && (
          <div className="rounded-xl border border-dashed bg-muted/30 p-4 space-y-3">
            <p className="font-semibold text-sm text-muted-foreground">
              ระดับที่ยังไม่ได้ผูกกับโครงการ
            </p>
            {(() => {
              const unassignedLevels = levels.filter((l) => !l.programId);
              return unassignedLevels.map((level) => (
                <SortableLevelCard
                  key={level.id}
                  level={level}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  programLevels={unassignedLevels}
                  type={ScoringLevelType.new}
                />
              ));
            })()}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default SettingsScoringCriteria;
