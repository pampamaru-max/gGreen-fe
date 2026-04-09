import { useState, useEffect, useMemo } from "react";
import { ListChecks, Plus, Pencil, Trash2, ChevronRight, Loader2, GripVertical, ChevronLeft } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import apiClient from "@/lib/axios";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import AddTopicWithIndicatorsDialog from "@/components/AddTopicWithIndicatorsDialog";
import { AlertActionPopup } from "@/components/AlertActionPopup";
import { formatNumber } from "@/helpers/functions";
import { LoadingOverlay } from "@/components/loading/LoadingOverlay";

interface DbProgram {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

type DbScoreType = "score" | "upgrade" | "yes_no" | "score_new" | "yes_no_new" | "score_upgrad" | "yes_no_upgrad" | "score_renew" | "yes_no_renew";
const isYesNoType = (st: string) => st.includes("yes_no");

interface DbCategory {
  id: number;
  name: string;
  maxScore: number;
  sortOrder: number;
  programId: string | null;
  scoreType: DbScoreType;
}

interface DbTopic {
  id: string;
  categoryId: number;
  name: string;
  sortOrder: number;
}

interface ScoringCriterion {
  score: number;
  label: string;
}

interface DbIndicator {
  id: string;
  topicId: string;
  name: string;
  maxScore: number;
  sortOrder: number;
  description: string;
  detail: string;
  notes: string;
  evidenceDescription: string;
  scoringCriteria: ScoringCriterion[];
}

/* ─── Dialogs ─── */

function EditTopicDialog({ topic, onSave }: { topic: DbTopic; onSave: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(topic.name);
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setName(topic.name); }}>
      <Button variant="ghost" size="icon" className="edit-button" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>แก้ไขประเด็น {topic.id}</DialogTitle></DialogHeader>
        <div className="space-y-2 py-2">
          <Label>ชื่อประเด็น</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">ยกเลิก</Button></DialogClose>
          <Button onClick={() => { onSave(name.trim()); setOpen(false); }} disabled={!name.trim()}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddIndicatorDialog({
  onAdd,
  maxAllowed,
  scoreType = "score",
  openAddIndDialog,
  setOpenAddIndDialog,
}: {
  onAdd: (name: string, maxScore: number) => void;
  maxAllowed: number;
  scoreType?: DbScoreType;
  openAddIndDialog: boolean;
  setOpenAddIndDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [name, setName] = useState("");
  const [maxScore, setMaxScore] = useState(Math.min(4, maxAllowed));
  const isYesNo = isYesNoType(scoreType);
  const reset = () => { setName(""); setMaxScore(Math.min(4, maxAllowed)); };
  const isOverLimit = !isYesNo && (maxScore > maxAllowed || maxAllowed <= 0);
  return (
    <Dialog open={openAddIndDialog} onOpenChange={(v) => { setOpenAddIndDialog(v); if (!v) reset(); }}>
      <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => setOpenAddIndDialog(true)}>
        <Plus className="h-3 w-3" /> เพิ่มตัวชี้วัด
      </Button>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>เพิ่มตัวชี้วัดใหม่</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>ชื่อตัวชี้วัด</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น มีมาตรการประหยัดน้ำ" />
          </div>
          {isYesNo ? (
            <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              หมวดนี้ใช้รูปแบบ <strong>ผ่าน / ไม่ผ่าน</strong> — ไม่มีการให้คะแนน
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>คะแนนเต็ม</Label>
                <span className="text-xs text-muted-foreground">เหลือได้อีก {maxAllowed} คะแนน</span>
              </div>
              <Input
                type="number"
                value={formatNumber(maxScore)}
                onChange={(e) => setMaxScore(Number(e.target.value))}
                min={1}
                max={maxAllowed}
                className={isOverLimit ? "border-destructive" : ""}
              />
              {isOverLimit && (
                <p className="text-xs text-destructive">
                  {maxAllowed <= 0 ? "คะแนนเต็มของหมวดเต็มแล้ว" : `เกินคะแนนเต็มของหมวด (เหลือได้ ${maxAllowed} คะแนน)`}
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">ยกเลิก</Button></DialogClose>
          <Button
            onClick={() => {
              onAdd(name.trim(), isYesNo ? 0 : maxScore);
              reset();
              setOpenAddIndDialog(false);
            }}
            disabled={!name.trim() || isOverLimit}
          >
            เพิ่ม
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditIndicatorDialog({
  data,
  indicator,
  onSave,
  maxAllowed,
  scoreType = "score",
  setOpenAddIndDialog,
  openEditIndDialog,
  setOpenEditIndDialog,
  setSelectedIndicator,
}: {
  data: DbIndicator[];
  indicator: DbIndicator;
  onSave: (data: {
    id: string;
    name: string;
    maxScore: number;
    description: string;
    detail: string;
    notes: string;
    evidenceDescription: string;
    scoringCriteria: ScoringCriterion[];
  }) => void;
  maxAllowed: number;
  scoreType?: DbScoreType;
  setOpenAddIndDialog: React.Dispatch<React.SetStateAction<boolean>>;
  openEditIndDialog: boolean;
  setOpenEditIndDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedIndicator: React.Dispatch<React.SetStateAction<DbIndicator | null>>;
}) {
  const isYesNo = isYesNoType(scoreType);
  const [name, setName] = useState(indicator.name);
  const [maxScore, setMaxScore] = useState(indicator.maxScore);
  const [description, setDescription] = useState(indicator.description || "");
  const [detail, setDetail] = useState(indicator.detail || "");
  const [notes, setNotes] = useState(indicator.notes || "");
  const [scoringCriteria, setScoringCriteria] = useState<ScoringCriterion[]>(indicator.scoringCriteria || []);
  const [evidenceDescription, setEvidenceDescription] = useState(indicator.evidenceDescription || "");
  // yes_no specific
  const [passLabel, setPassLabel] = useState("");
  const [failLabel, setFailLabel] = useState("");

  const [currentIndex, setCurrentIndex] = useState(data.findIndex(d => d.id === indicator.id));

  useEffect(() => {
    if (openEditIndDialog && indicator) {
      const idx = data.findIndex(d => d.id === indicator.id);
      setCurrentIndex(idx);
      resetFormIndicator(data[idx]);
    }
  }, [openEditIndDialog, indicator]);

  const resetFormIndicator = (ind: DbIndicator = indicator) => {
    setName(ind.name);
    setMaxScore(ind.maxScore);
    setDescription(ind.description || "");
    setDetail(ind.detail || "");
    setNotes(ind.notes || "");
    setEvidenceDescription(ind.evidenceDescription || "");

    if (isYesNo) {
      const existing = ind.scoringCriteria || [];
      setPassLabel(existing.find(c => c.score === 1)?.label ?? "สอดคล้อง");
      setFailLabel(existing.find(c => c.score === 0)?.label ?? "ไม่สอดคล้อง");
    } else {
      const existing = ind.scoringCriteria || [];
      setScoringCriteria(
        existing.length > 0
          ? existing
          : Array.from({ length: ind.maxScore }, (_, i) => ({
              score: i + 1,
              label: "",
            }))
      );
    }
  };

  const addCriterion = () => setScoringCriteria([...scoringCriteria, { score: 0, label: "" }]);
  const removeCriterion = (idx: number) => setScoringCriteria(scoringCriteria.filter((_, i) => i !== idx));
  const updateCriterion = (idx: number, field: keyof ScoringCriterion, value: string | number) => {
    const updated = [...scoringCriteria];
    updated[idx] = { ...updated[idx], [field]: value };
    setScoringCriteria(updated);
  };

  const isDirty = useMemo(() => {
    if(!indicator) return false;

    return name !== indicator.name ||
        maxScore !== indicator.maxScore ||
        description !== (indicator.description || "") ||
        detail !== (indicator.detail || "") ||
        notes !== (indicator.notes || "") ||
        evidenceDescription !== (indicator.evidenceDescription || "") ||
        JSON.stringify(scoringCriteria) !== JSON.stringify(indicator.scoringCriteria);
  }, [name, maxScore, description, detail, notes, evidenceDescription, scoringCriteria, indicator]);

  const handleSave = (closeDialog: boolean = true) => {
    const criteria = isYesNo
      ? [{ score: 1, label: passLabel }, { score: 0, label: failLabel }]
      : scoringCriteria;
    onSave({ id: indicator.id, name: name.trim(), maxScore: isYesNo ? 0 : maxScore, description, detail, notes, evidenceDescription, scoringCriteria: criteria });
    if(closeDialog) {
      setOpenEditIndDialog(false);
      setSelectedIndicator(null);
    }
  };

  const handlePrevClick = () => {
    if(!indicator) return;
    if(isDirty) handleSave(false);
    setSelectedIndicator(data[Math.max(0, data.findIndex(d => d.id === indicator.id) - 1)]);
  };

  const handleNextClick = () => {
    if(!indicator) return;
    if(isDirty) handleSave(false);
    setSelectedIndicator(data[Math.min(data.length - 1, data.findIndex(d => d.id === indicator.id) + 1)]);
  };

  return (
    <Dialog open={openEditIndDialog} onOpenChange={(v) => setOpenEditIndDialog(v)}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0"><DialogTitle>แก้ไขตัวชี้วัด {indicator?.id}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden py-2">
          {/* Left column - Details */}
          <div className="space-y-3 overflow-y-auto pr-1">
            {isYesNo ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label>ชื่อตัวชี้วัด</Label>
                  <span className="text-xs rounded-full px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200">ผ่าน/ไม่ผ่าน</span>
                </div>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            ) : (
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <div className="space-y-1.5">
                  <Label>ชื่อตัวชี้วัด</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>คะแนนเต็ม</Label>
                    <span className="text-xs text-muted-foreground">เหลือได้อีก {maxAllowed} คะแนน</span>
                  </div>
                  <Input
                    type="number"
                    value={formatNumber(maxScore)}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    min={1}
                    max={maxAllowed}
                    className={maxScore > maxAllowed ? "border-destructive" : ""}
                  />
                  {maxScore > maxAllowed && (
                    <p className="text-xs text-destructive">เกินคะแนนเต็มของหมวด (เหลือได้ {maxAllowed} คะแนน)</p>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>คำอธิบาย</Label>
              <RichTextEditor value={description} onChange={setDescription} placeholder="คำอธิบายตัวชี้วัด..." minHeight="80px" />
            </div>
            <div className="space-y-1.5">
              <Label>รายละเอียดตัวชี้วัด</Label>
              <RichTextEditor value={detail} onChange={setDetail} placeholder="รายละเอียดเพิ่มเติม..." minHeight="180px" />
            </div>
            <div className="space-y-1.5">
              <Label>{isYesNo ? "หมายเหตุ" : "หมายเหตุเกณฑ์การให้คะแนน"}</Label>
              <RichTextEditor value={notes} onChange={setNotes} placeholder="หมายเหตุเพิ่มเติม..." minHeight="140px" />
            </div>
            <div className="space-y-1.5">
              <Label>หลักฐานอ้างอิง (ไฟล์แนบ)</Label>
              <Textarea value={evidenceDescription} onChange={(e) => setEvidenceDescription(e.target.value)} placeholder="ระบุรายละเอียดหลักฐานอ้างอิงที่ต้องแนบ เช่น รูปถ่าย, เอกสารรับรอง, ผลทดสอบ..." rows={6} className="min-h-[140px]" />
            </div>
          </div>

          {/* Right column - Scoring Criteria / Yes-No */}
          <div className="flex flex-col min-h-0">
            {isYesNo ? (
              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                <Label className="text-base font-semibold block">เกณฑ์ผ่าน / ไม่ผ่าน</Label>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 border border-green-300 text-green-700 text-xs font-bold">✓</div>
                    <span className="text-sm font-semibold text-green-800">เกณฑ์ผ่าน</span>
                  </div>
                  <Textarea
                    value={passLabel}
                    onChange={(e) => setPassLabel(e.target.value)}
                    placeholder="ระบุเงื่อนไขที่ถือว่าผ่าน..."
                    rows={6}
                    className="bg-white border-green-200 focus:border-green-400 min-h-[120px]"
                  />
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 border border-red-300 text-red-700 text-xs font-bold">✗</div>
                    <span className="text-sm font-semibold text-red-800">เกณฑ์ไม่ผ่าน</span>
                  </div>
                  <Textarea
                    value={failLabel}
                    onChange={(e) => setFailLabel(e.target.value)}
                    placeholder="ระบุเงื่อนไขที่ถือว่าไม่ผ่าน..."
                    rows={6}
                    className="bg-white border-red-200 focus:border-red-400 min-h-[120px]"
                  />
                </div>
              </div>
            ) : (
              <>
            <div className="flex items-center justify-between mb-3 shrink-0">
              <Label className="text-base font-semibold">เกณฑ์คะแนน</Label>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-7"
                  onClick={() => setScoringCriteria(Array.from({ length: maxScore + 1 }, (_, i) => ({ score: i, label: "" })))}
                  title="สร้างเกณฑ์คะแนน 0 ถึงคะแนนเต็ม"
                >
                  0–{maxScore}
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={addCriterion}>
                  <Plus className="h-3 w-3" /> เพิ่มเกณฑ์
                </Button>
              </div>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {scoringCriteria.map((sc, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-3 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                        {sc.score}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">คะแนน</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeCriterion(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-20 shrink-0">
                      <Input type="number" value={sc.score} onChange={(e) => updateCriterion(idx, "score", Number(e.target.value))} min={0} className="h-8 text-sm text-center" />
                    </div>
                    <div className="flex-1">
                      <Input value={sc.label} onChange={(e) => updateCriterion(idx, "label", e.target.value)} placeholder="คำอธิบายเกณฑ์คะแนน..." className="h-8 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
              {scoringCriteria.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted py-12 text-center">
                  <ListChecks className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">ยังไม่มีเกณฑ์คะแนน</p>
                  <p className="text-xs text-muted-foreground/70">กดปุ่ม "เพิ่มเกณฑ์" เพื่อเริ่มกำหนดเกณฑ์</p>
                </div>
              )}
            </div>
              </>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <div className="flex flex-1 justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevClick}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                ก่อนหน้า
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextClick}
                disabled={currentIndex === data.length - 1}
              >
                ถัดไป
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="flex justify-end items-center gap-2 flex-1">
              <DialogClose asChild>
                <Button variant="outline">ยกเลิก</Button>
              </DialogClose>
              <Button
                onClick={() => handleSave(true)}
                disabled={
                  !name.trim() || (!isYesNo && maxScore > maxAllowed) || !isDirty
                }
              >
                บันทึก
              </Button>
              <Button
                className="gap-1"
                onClick={() =>{ isDirty && handleSave(false); setOpenAddIndDialog(true); }}
              >
                <Plus /> <span className="max-sm:hidden">เพิ่มตัวชี้วัด</span>
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Sortable Indicator Row ─── */

function SortableIndicatorRow({
  ind,
  color,
  onEdit,
  onDelete,
  scoreType = "score",
}: {
  ind: DbIndicator;
  color: string;
  onEdit: (data: any) => void;
  onDelete: () => void;
  scoreType?: DbScoreType;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ind.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const isYesNo = isYesNoType(scoreType);

  return (
    <div ref={setNodeRef} style={{ ...style, backgroundColor: `hsl(${color} / 0.03)` }} className="flex items-center gap-3 px-4 py-2.5 group/ind hover:bg-muted/10 border-b last:border-b-0">
      <button {...attributes} {...listeners} className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm text-foreground whitespace-pre-wrap">{ind.name}</span>
      {isYesNo ? (
        <span className="text-xs font-semibold px-2 py-1 rounded-md bg-orange-100 text-orange-700 border border-orange-200">
          ผ่าน/ไม่ผ่าน
        </span>
      ) : (
        <span
          className="text-xs font-semibold px-2 py-1 rounded-md"
          style={{ backgroundColor: `hsl(${color} / 0.1)`, color: `hsl(${color})` }}
        >
          เต็ม {ind.maxScore}
        </span>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover/ind:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="edit-button" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <AlertActionPopup action={onDelete} type="delete" title="ยืนยันการลบตัวชี้วัด" description={`ต้องการลบตัวชี้วัด "${ind.name}" หรือไม่?`}/>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

const SettingsIndicators = () => {
  const [programs, setPrograms] = useState<DbProgram[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [topics, setTopics] = useState<DbTopic[]>([]);
  const [indicators, setIndicators] = useState<DbIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [openAddIndDialog, setOpenAddIndDialog] = useState(false);
  const [openEditIndDialog, setOpenEditIndDialog] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<DbIndicator | null>(null);

  const fetchAll = async () => {
    try {
      const [progRes, catRes, topicRes, indRes] = await Promise.all([
        apiClient.get<DbProgram[]>("programs/names-with-sort"),
        apiClient.get<DbCategory[]>("categories"),
        apiClient.get<DbTopic[]>("topics"),
        apiClient.get<DbIndicator[]>("indicators"),
      ]);
      setPrograms(progRes.data);
      setCategories(catRes.data);
      setTopics(topicRes.data);
      setIndicators(indRes.data.map(d => ({
        ...d,
        notes: d.notes || "",
        evidenceDescription: d.evidenceDescription || "",
        scoringCriteria: d.scoringCriteria || [],
      })));
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if(openEditIndDialog) {
      const indTopics = indicators.filter((i)=>i.topicId === selectedIndicator.topicId).sort((a,b)=> a.sortOrder - b.sortOrder);
      setSelectedIndicator(indTopics[indTopics.length - 1])
    }
  },[indicators])

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, []);

  const getNextTopicNum = (catId: number) => {
    const catTopics = topics.filter((t) => t.categoryId === catId);
    return catTopics.length + 1;
  };

  const getCatRemainingBudget = (catId: number, excludeIndId?: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 0;
    const catTopics = topics.filter(t => t.categoryId === catId);
    const used = indicators
      .filter(i => catTopics.some(t => t.id === i.topicId) && i.id !== excludeIndId)
      .reduce((sum, i) => sum + i.maxScore, 0);
    return cat.maxScore - used;
  };

  // Topic CRUD
  const handleAddTopicWithIndicators = async (
    catId: number,
    topicName: string,
    indicatorDrafts: { name: string; maxScore: number }[]
  ) => {
    const cat = categories.find(c => c.id === catId);
    if (cat && !isYesNoType(cat.scoreType)) {
      const newTotal = indicatorDrafts.reduce((sum, i) => sum + i.maxScore, 0);
      const remaining = getCatRemainingBudget(catId);
      if (newTotal > remaining) {
        toast({
          title: "คะแนนเกินที่กำหนด",
          description: `คะแนนรวมของตัวชี้วัดใหม่ (${newTotal}) เกินคะแนนที่เหลือในหมวด "${cat.name}" (เหลือได้ ${remaining} คะแนน)`,
          variant: "destructive",
        });
        return;
      }
    }
    const nextNum = getNextTopicNum(catId);
    const topicId = `${catId}.${nextNum}`;
    try {
      await apiClient.post("topics", { id: topicId, categoryId: catId, name: topicName, sortOrder: nextNum });
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
      return;
    }

    if (indicatorDrafts.length > 0) {
      try {
        await Promise.all(indicatorDrafts.map((ind, idx) =>
          apiClient.post("indicators", {
            id: `${topicId}.${idx + 1}`,
            topicId,
            name: ind.name,
            maxScore: ind.maxScore,
            sortOrder: idx + 1,
          })
        ));
      } catch (err: any) {
        toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
        return;
      }
    }

    toast({ title: "เพิ่มประเด็นและตัวชี้วัดสำเร็จ", variant: "success" });
    fetchAll();
  };

  const handleEditTopic = async (topicId: string, name: string) => {
    try {
      await apiClient.patch(`topics/${topicId}`, { name });
      toast({ title: "แก้ไขประเด็นสำเร็จ", variant: "success" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    setLoading(true);
    try {
      await apiClient.delete(`topics/${topicId}`);
      toast({ title: "ลบประเด็นสำเร็จ", variant: "success" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Indicator CRUD
  const handleAddIndicator = async (topicId: string, name: string, maxScore: number) => {
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
      const cat = categories.find(c => c.id === topic.categoryId);
      if (cat && !isYesNoType(cat.scoreType)) {
        const remaining = getCatRemainingBudget(topic.categoryId);
        if (maxScore > remaining) {
          toast({
            title: "คะแนนเกินที่กำหนด",
            description: `คะแนนเต็มของตัวชี้วัดนี้ (${maxScore}) เกินคะแนนที่เหลือในหมวด "${cat.name}" (เหลือได้ ${remaining} คะแนน)`,
            variant: "destructive",
          });
          return;
        }
      }
    }
    const topicInds = indicators.filter((i) => i.topicId === topicId);
    const nextNum = topicInds.length + 1;
    const id = `${topicId}.${nextNum}`;
    try {
      await apiClient.post("indicators", { id, topicId, name, maxScore, sortOrder: nextNum });
      toast({ title: "เพิ่มตัวชี้วัดสำเร็จ", variant: "success" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const handleEditIndicator = async (indId: string, data: { name: string; maxScore: number; description: string; detail: string; notes: string; evidenceDescription: string; scoringCriteria: ScoringCriterion[] }) => {
    setLoading(true);
    const ind = indicators.find(i => i.id === indId);
    if (ind) {
      const topic = topics.find(t => t.id === ind.topicId);
      if (topic) {
        const cat = categories.find(c => c.id === topic.categoryId);
        if (cat && !isYesNoType(cat.scoreType)) {
          const remaining = getCatRemainingBudget(topic.categoryId, indId);
          if (data.maxScore > remaining) {
            toast({
              title: "คะแนนเกินที่กำหนด",
              description: `คะแนนเต็มของตัวชี้วัดนี้ (${data.maxScore}) เกินคะแนนที่เหลือในหมวด "${cat.name}" (เหลือได้ ${remaining} คะแนน)`,
              variant: "destructive",
            });
            return;
          }
        }
      }
    }
    try {
      await apiClient.patch(`indicators/${indId}`, {
        name: data.name,
        maxScore: data.maxScore,
        description: data.description,
        detail: data.detail,
        notes: data.notes,
        evidenceDescription: data.evidenceDescription,
        scoringCriteria: data.scoringCriteria,
      });
      toast({ title: "แก้ไขตัวชี้วัดสำเร็จ", variant: "success" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIndicator = async (indId: string) => {
    setLoading(true);
    try {
      await apiClient.delete(`indicators/${indId}`);
      toast({ title: "ลบตัวชี้วัดสำเร็จ", variant: "success" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReorderIndicators = async (topicId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const topicInds = indicators.filter(i => i.topicId === topicId).sort((a, b) => a.sortOrder - b.sortOrder);
    const oldIndex = topicInds.findIndex(i => i.id === active.id);
    const newIndex = topicInds.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...topicInds];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Optimistic update
    const updatedIndicators = indicators.map(ind => {
      const idx = reordered.findIndex(r => r.id === ind.id);
      if (idx !== -1) return { ...ind, sortOrder: idx + 1 };
      return ind;
    });
    setIndicators(updatedIndicators);

    // Persist
    await Promise.all(reordered.map((ind, idx) =>
      apiClient.patch(`indicators/${ind.id}`, { sortOrder: idx + 1 })
    ));
  };

  return (
    <div className="min-h-full bg-background">
      <LoadingOverlay visible={loading} />
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ListChecks className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">จัดการประเด็น / ตัวชี้วัด</h2>
            <p className="text-xs text-muted-foreground">เพิ่ม แก้ไข หรือลบประเด็นและตัวชี้วัดในแต่ละหมวด</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {programs.map((program, progIdx) => {
          const typeOrder = (st: string) => (st.includes("_upgrad") || st === "upgrade") ? 1 : st.includes("_renew") ? 2 : 0;
          const programCategories = categories
            .filter(c => c.programId === program.id)
            .sort((a, b) => typeOrder(a.scoreType as string) - typeOrder(b.scoreType as string) || a.sortOrder - b.sortOrder);
          if (programCategories.length === 0) return null;

          return (
            <Collapsible key={program.id} defaultOpen={false} className="group/prog">
              <div className="rounded-xl border border-accent/30 bg-accent/10 overflow-hidden shadow-sm">
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center gap-3 px-5 py-4 hover:bg-accent/20 transition-colors">
                    <ChevronRight className="h-5 w-5 text-accent-foreground/70 transition-transform group-data-[state=open]/prog:rotate-90" />
                    <p className="font-bold text-foreground text-left flex-1 text-base">{program.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {programCategories.length} หมวด
                    </span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-3">
                    {programCategories.map((cat, catIdx) => {
                      const color = "210 70% 45%";
                      const catTopics = topics.filter((t) => t.categoryId === cat.id);

                      return (
                        <Collapsible key={cat.id} defaultOpen={false} className="group/cat">
                          <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
                            <CollapsibleTrigger asChild>
                              <button
                                className="flex w-full items-center gap-3 px-4 py-3 border-b hover:bg-muted/30 transition-colors"
                                style={{ backgroundColor: `hsl(${color} / 0.1)` }}
                              >
                                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]/cat:rotate-90" />
                                <p className="font-bold text-foreground text-left flex-1">{cat.name}</p>
                                <span className="text-xs text-muted-foreground">
                                  {(() => {
                                    const st = cat.scoreType as string;
                                    const isUpgrad = st.includes("_upgrad") || st === "upgrade";
                                    const isRenew = st.includes("_renew");
                                    if (isUpgrad) return <span className="text-purple-600 font-medium">อัพเกณฑ์</span>;
                                    if (isRenew) return <span className="text-emerald-600 font-medium">ต่ออายุ</span>;
                                    return <span className="text-blue-600 font-medium">ปกติ</span>;
                                  })()}
                                  {" · "}{catTopics.length} ประเด็น · {indicators.filter(i => catTopics.some(t => t.id === i.topicId)).length} ตัวชี้วัด
                                  {!isYesNoType(cat.scoreType) && ` · คะแนนเต็ม ${cat.maxScore}`}
                                  {isYesNoType(cat.scoreType) && <span className="ml-1 text-orange-600 font-medium">· ผ่าน/ไม่ผ่าน</span>}
                                </span>
                              </button>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              {(() => {
                                const isYesNoCat = isYesNoType(cat.scoreType);
                                const catUsedScore = isYesNoCat ? 0 : indicators
                                  .filter(i => catTopics.some(t => t.id === i.topicId))
                                  .reduce((sum, i) => sum + i.maxScore, 0);
                                const catRemaining = isYesNoCat ? Infinity : (cat.maxScore - catUsedScore);
                                return catTopics.map((topic) => {
                                const topicInds = indicators.filter((i) => i.topicId === topic.id).sort((a, b) => a.sortOrder - b.sortOrder);
                                return (
                                  <Collapsible key={topic.id} defaultOpen={false} className="group/topic border-b last:border-b-0">
                                    <div
                                      className="flex items-center gap-2 px-4 py-2.5"
                                      style={{ backgroundColor: `hsl(${color} / 0.06)` }}
                                    >
                                      <CollapsibleTrigger asChild>
                                        <button className="shrink-0 p-0.5 hover:bg-muted/50 rounded">
                                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]/topic:rotate-90" />
                                        </button>
                                      </CollapsibleTrigger>
                                      <span className="text-sm font-medium text-foreground flex-1">{topic.name}</span>
                                      <EditTopicDialog topic={topic} onSave={(name) => handleEditTopic(topic.id, name)} />
                                      <AlertActionPopup action={() => handleDeleteTopic(topic.id)} type="delete" title="ยืนยันการลบประเด็น" description={`ต้องการลบประเด็น "${topic.name}" หรือไม่?`}/>
                                    </div>

                                    <CollapsibleContent>
                                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleReorderIndicators(topic.id, e)}>
                                        <SortableContext items={topicInds.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                          <div>
                                            {topicInds.map((ind) => (
                                              <SortableIndicatorRow
                                                key={ind.id}
                                                ind={ind}
                                                color={color}
                                                onEdit={() => { setSelectedIndicator(ind); setOpenEditIndDialog(true); }}
                                                onDelete={() => handleDeleteIndicator(ind.id)}
                                                scoreType={cat.scoreType}
                                              />
                                            ))}
                                            {selectedIndicator && selectedIndicator.topicId === topic.id &&
                                              <EditIndicatorDialog
                                                data={topicInds}
                                                indicator={selectedIndicator}
                                                onSave={(data) => handleEditIndicator(data.id, data)}
                                                maxAllowed={isYesNoCat ? Infinity : catRemaining + selectedIndicator.maxScore}
                                                scoreType={cat.scoreType}
                                                setOpenAddIndDialog={setOpenAddIndDialog}
                                                openEditIndDialog={openEditIndDialog}
                                                setOpenEditIndDialog={setOpenEditIndDialog}
                                                setSelectedIndicator={setSelectedIndicator}
                                              />
                                            }
                                          </div>
                                        </SortableContext>
                                      </DndContext>
                                      <div className="px-4 py-2 border-t border-dashed">
                                        <AddIndicatorDialog
                                          onAdd={(name, ms) => handleAddIndicator(topic.id, name, ms)}
                                          maxAllowed={isYesNoCat ? Infinity : catRemaining}
                                          scoreType={cat.scoreType}
                                          openAddIndDialog={openAddIndDialog}
                                          setOpenAddIndDialog={setOpenAddIndDialog}
                                        />
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                );
                              });})()}

                              {/* Add topic button inside category */}
                              {(() => {
                                const budgets: Record<number, number> = {};
                                programCategories.forEach(c => { budgets[c.id] = getCatRemainingBudget(c.id); });
                                return (
                                  <div className="px-4 py-2.5 border-t border-dashed">
                                    <AddTopicWithIndicatorsDialog
                                      categories={programCategories}
                                      getNextTopicNum={getNextTopicNum}
                                      onSave={handleAddTopicWithIndicators}
                                      preSelectedCatId={cat.id}
                                      triggerLabel="เพิ่มประเด็น"
                                      compact
                                      categoryBudgets={budgets}
                                    />
                                  </div>
                                );
                              })()}
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsIndicators;
