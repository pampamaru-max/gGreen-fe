import { useState, useEffect, useMemo } from "react";
import { ListChecks, Plus, Pencil, Trash2, ChevronRight, Loader2, GripVertical, ChevronLeft, FolderTree } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import AddTopicWithIndicatorsDialog from "@/components/AddTopicWithIndicatorsDialog";
import { AlertActionPopup } from "@/components/AlertActionPopup";
import { formatNumber, mergeUniqueById } from "@/helpers/functions";
import { LoadingOverlay } from "@/components/loading/LoadingOverlay";

interface DbProgram {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  categories: number;
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
  topics: number;
  indicators: number;
  isDefault?: boolean;
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
  parentId?: string | null;
  isHeader?: boolean;
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
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="edit-button h-7 w-7" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
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

// 🔴 1. Dialog สำหรับ "ข้างนอกบล็อก" (ให้เลือกได้ว่าเป็น หัวข้อจัดกลุ่ม หรือ ตัวชี้วัดปกติ)
function AddIndicatorDialog({
  onAdd,
  maxAllowed,
  scoreType = "score",
  buttonTrigger
}: {
  onAdd: (name: string, maxScore: number, isHeader: boolean) => void;
  maxAllowed: number;
  scoreType?: DbScoreType;
  buttonTrigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isHeader, setIsHeader] = useState(false);
  const [maxScore, setMaxScore] = useState(Math.min(4, maxAllowed));
  
  const isYesNo = isYesNoType(scoreType);
  const reset = () => { setName(""); setMaxScore(Math.min(4, maxAllowed)); setIsHeader(false); };
  const isOverLimit = !isYesNo && !isHeader && (maxScore > maxAllowed || maxAllowed <= 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) reset(); }}>
      <DialogTrigger asChild>
        {buttonTrigger || (
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-9 text-muted-foreground hover:text-primary hover:bg-primary/10 w-full justify-start border border-dashed border-border/50 mt-2">
            <Plus className="h-4 w-4" /> เพิ่มตัวชี้วัด
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>เพิ่มรายการใหม่</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>รูปแบบตัวชี้วัด</Label>
            <div className="grid grid-cols-2 gap-3">
              <div 
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${!isHeader ? 'border-primary bg-primary/10 text-primary' : 'border-muted bg-muted/20 text-muted-foreground hover:bg-muted/40'}`}
                onClick={() => setIsHeader(false)}
              >
                <ListChecks className="h-6 w-6 mb-2" />
                <span className="text-sm font-bold">ตัวชี้วัดปกติ</span>
                <span className="text-[10px] opacity-70 mt-1">ตัวชี้วัดแบบพื้นฐาน</span>
              </div>
              <div 
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${isHeader ? 'border-primary bg-primary/10 text-primary' : 'border-muted bg-muted/20 text-muted-foreground hover:bg-muted/40'}`}
                onClick={() => setIsHeader(true)}
              >
                <FolderTree className="h-6 w-6 mb-2" />
                <span className="text-sm font-bold">หัวข้อจัดกลุ่ม</span>
                <span className="text-[10px] opacity-70 mt-1">สร้างหัวข้อย่อยซ้อนข้างในตัวชี้วัด</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label>{isHeader ? "ชื่อหัวข้อย่อย (เช่น 4.1.1)" : "ชื่อตัวชี้วัด"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isHeader ? "เช่น 4.1.1 โรงแรมมีการตรวจสอบ..." : "เช่น มีมาตรการประหยัดน้ำ"} autoFocus />
          </div>

          {!isHeader && (
            isYesNo ? (
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
                    {maxAllowed <= 0 ? "คะแนนเต็มของหมวดเต็มแล้ว" : `เกินคะแนนเต็ม (เหลือ ${maxAllowed})`}
                  </p>
                )}
              </div>
            )
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">ยกเลิก</Button></DialogClose>
          <Button
            onClick={() => {
              onAdd(name.trim(), (isYesNo || isHeader) ? 0 : maxScore, isHeader);
              reset();
              setOpen(false);
            }}
            disabled={!name.trim() || isOverLimit}
          >
            เพิ่มรายการ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 🔴 2. Dialog สำหรับ "ข้างในบล็อกย่อย" (บังคับเป็นตัวชี้วัดปกติอย่างเดียว เพราะเราตั้งลิมิตซ้อนได้แค่ 1 ชั้น)
function AddSimpleIndicatorDialog({
  onAdd,
  maxAllowed,
  scoreType = "score",
  buttonTrigger
}: {
  onAdd: (name: string, maxScore: number) => void;
  maxAllowed: number;
  scoreType?: DbScoreType;
  buttonTrigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [maxScore, setMaxScore] = useState(Math.min(4, maxAllowed));
  const isYesNo = isYesNoType(scoreType);
  const reset = () => { setName(""); setMaxScore(Math.min(4, maxAllowed)); };
  const isOverLimit = !isYesNo && (maxScore > maxAllowed || maxAllowed <= 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) reset(); }}>
      <DialogTrigger asChild>
        {buttonTrigger || (
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-muted-foreground hover:text-primary hover:bg-primary/10">
            <Plus className="h-3.5 w-3.5" /> เพิ่มตัวชี้วัด
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>เพิ่มตัวชี้วัดใหม่</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>ชื่อตัวชี้วัด</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น นโยบายการจัดซื้อในท้องถิ่น" autoFocus />
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
              <Input type="number" value={formatNumber(maxScore)} onChange={(e) => setMaxScore(Number(e.target.value))} min={1} max={maxAllowed} className={isOverLimit ? "border-destructive" : ""} />
              {isOverLimit && <p className="text-xs text-destructive">เกินคะแนนเต็ม (เหลือ {maxAllowed})</p>}
            </div>
          )}
        </div>
        {/* ปุ่มหน้าเพิ่มตัวชี้วัดใหม่ */}
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">ยกเลิก</Button></DialogClose>
          <Button onClick={() => { onAdd(name.trim(), isYesNo ? 0 : maxScore); reset(); setOpen(false); }} disabled={!name.trim() || isOverLimit}>
            เพิ่มตัวชี้วัด
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
  openEditIndDialog,
  setOpenEditIndDialog,
  setSelectedIndicator,
}: {
  data: DbIndicator[];
  indicator: DbIndicator;
  onSave: (data: any) => void;
  maxAllowed: number;
  scoreType?: DbScoreType;
  openEditIndDialog: boolean;
  setOpenEditIndDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedIndicator: React.Dispatch<React.SetStateAction<DbIndicator | null>>;
}) {
  const isYesNo = isYesNoType(scoreType);
  const isHeader = indicator?.isHeader || false;

  const [name, setName] = useState(indicator?.name || "");
  const [maxScore, setMaxScore] = useState(indicator?.maxScore || 0);
  const [description, setDescription] = useState(indicator?.description || "");
  const [detail, setDetail] = useState(indicator?.detail || "");
  const [notes, setNotes] = useState(indicator?.notes || "");
  const [scoringCriteria, setScoringCriteria] = useState<ScoringCriterion[]>(indicator?.scoringCriteria || []);
  const [evidenceDescription, setEvidenceDescription] = useState(indicator?.evidenceDescription || "");
  
  const [passLabel, setPassLabel] = useState("");
  const [failLabel, setFailLabel] = useState("");

  const [currentIndex, setCurrentIndex] = useState(indicator ? data.findIndex(d => d.id === indicator.id) : 0);

  useEffect(() => {
    if (openEditIndDialog && indicator) {
      const idx = data.findIndex(d => d.id === indicator.id);
      setCurrentIndex(idx);
      resetFormIndicator(data[idx]);
    }
  }, [openEditIndDialog, indicator]);

  const resetFormIndicator = (ind: DbIndicator = indicator) => {
    if (!ind) return;
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
        existing.length > 0 ? existing : Array.from({ length: ind.maxScore }, (_, i) => ({ score: i + 1, label: "" }))
      );
    }
  };

  const addCriterion = () => setScoringCriteria([...scoringCriteria, { score: 0, label: "" }]);
  const clearCriterion = () => setScoringCriteria([]);
  const removeCriterion = (idx: number) => setScoringCriteria(scoringCriteria.filter((_, i) => i !== idx));
  const updateCriterion = (idx: number, field: keyof ScoringCriterion, value: string | number) => {
    const updated = [...scoringCriteria];
    updated[idx] = { ...updated[idx], [field]: value };
    setScoringCriteria(updated);
  };

  const isDirty = useMemo(() => {
    if(!indicator) return false;
    return name !== indicator.name || maxScore !== indicator.maxScore || description !== (indicator.description || "") || detail !== (indicator.detail || "") || notes !== (indicator.notes || "") || evidenceDescription !== (indicator.evidenceDescription || "") || JSON.stringify(scoringCriteria) !== JSON.stringify(indicator.scoringCriteria);
  }, [name, maxScore, description, detail, notes, evidenceDescription, scoringCriteria, indicator]);

  const handleSave = (closeDialog: boolean = true) => {
    const criteria = isYesNo ? [{ score: 1, label: passLabel }, { score: 0, label: failLabel }] : scoringCriteria;
    onSave({ id: indicator.id, name: name.trim(), maxScore: (isYesNo || isHeader) ? 0 : maxScore, description, detail, notes, evidenceDescription, scoringCriteria: criteria, isHeader: indicator.isHeader, parentId: indicator.parentId });
    if(closeDialog) { setOpenEditIndDialog(false); setSelectedIndicator(null); }
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

  if(!indicator) return null;

  return (
    <Dialog open={openEditIndDialog} onOpenChange={(v) => setOpenEditIndDialog(v)}>
      <DialogContent className={`${isHeader ? 'max-w-md' : 'max-w-6xl w-[95vw] h-[90vh]'} flex flex-col overflow-hidden`}>
        <DialogHeader className="shrink-0"><DialogTitle>แก้ไข{isHeader ? "หัวข้อย่อย" : "ตัวชี้วัด"}</DialogTitle></DialogHeader>
        <div className={`grid ${isHeader ? 'grid-cols-1 w-full px-1' : 'grid-cols-1 md:grid-cols-2 flex-1 min-h-0 overflow-hidden'} gap-6 py-2`}>
          <div className={`space-y-3 ${isHeader ? 'pb-4' : 'overflow-y-auto pr-1'}`}>
            {isHeader ? (
              <>
              <div className="space-y-2.5 p-0.5">
                <Label>ชื่อหัวข้อย่อย</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="font-bold focus-visible:ring-offset-2" />
              </div>

              <div className="space-y-2.5 p-0.5 pt-2">
                <Label>คำอธิบายใต้หัวข้อ (ถ้ามี)</Label>
                <Textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ระบุรายละเอียดเพิ่มเติม..."
                  className="bg-muted/10 min-h-[80px]"
                />
              </div>
            </>
            ) : isYesNo ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label>ชื่อตัวชี้วัด</Label>
                  <span className="text-xs rounded-full px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200">ผ่าน/ไม่ผ่าน</span>
                </div>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            ) : (
              <div className="grid grid-cols-[1fr_120px] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label>ชื่อตัวชี้วัด</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>คะแนนเต็ม</Label>
                    <span className="text-xs text-muted-foreground">เหลือได้อีก {maxAllowed} คะแนน</span>
                  </div>
                  <Input type="number" value={formatNumber(maxScore)} onChange={(e) => setMaxScore(Number(e.target.value))} min={1} max={maxAllowed} className={maxScore > maxAllowed ? "border-destructive" : ""} />
                </div>
              </div>
            )}
            
            {!isHeader && (
              <div className="space-y-1.5">
                <Label>คำอธิบาย</Label>
                <RichTextEditor value={description} onChange={setDescription} placeholder="คำอธิบาย..." minHeight="80px" />
              </div>
            )}
            
            {!isHeader && (
              <>
                <div className="space-y-1.5">
                  <Label>รายละเอียดตัวชี้วัด</Label>
                  <RichTextEditor value={detail} onChange={setDetail} placeholder="รายละเอียด..." minHeight="180px" />
                </div>
                <div className="space-y-1.5">
                  <Label>{isYesNo ? "หมายเหตุ" : "หมายเหตุเกณฑ์การให้คะแนน"}</Label>
                  <RichTextEditor value={notes} onChange={setNotes} placeholder="หมายเหตุเพิ่มเติม..." minHeight="140px" />
                </div>
                <div className="space-y-1.5">
                  <Label>หลักฐานอ้างอิง (ไฟล์แนบ)</Label>
                  <Textarea value={evidenceDescription} onChange={(e) => setEvidenceDescription(e.target.value)} placeholder="ระบุรายละเอียด..." rows={6} className="min-h-[140px]" />
                </div>
              </>
            )}
          </div>

          {!isHeader && (
            <div className="flex flex-col min-h-0">
              {isYesNo ? (
                <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                  <Label className="text-base font-semibold block">เกณฑ์ผ่าน / ไม่ผ่าน</Label>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                    <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 border border-green-300 text-green-700 text-xs font-bold">✓</div><span className="text-sm font-semibold text-green-800">เกณฑ์ผ่าน</span></div>
                    <Textarea value={passLabel} onChange={(e) => setPassLabel(e.target.value)} placeholder="ระบุเงื่อนไข..." rows={6} className="bg-white border-green-200 focus:border-green-400 min-h-[120px]" />
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
                    <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 border border-red-300 text-red-700 text-xs font-bold">✗</div><span className="text-sm font-semibold text-red-800">เกณฑ์ไม่ผ่าน</span></div>
                    <Textarea value={failLabel} onChange={(e) => setFailLabel(e.target.value)} placeholder="ระบุเงื่อนไข..." rows={6} className="bg-white border-red-200 focus:border-red-400 min-h-[120px]" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <Label className="text-base font-semibold">เกณฑ์คะแนน</Label>
                    <div className="flex items-center gap-1.5">
                      <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => setScoringCriteria(Array.from({ length: maxScore + 1 }, (_, i) => ({ score: i, label: "" })))}>0–{maxScore}</Button>
                      <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={clearCriterion}>ล้างคะแนน</Button>
                      <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={addCriterion}><Plus className="h-3 w-3" /> เพิ่มเกณฑ์</Button>
                    </div>
                  </div>
                  <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                    {scoringCriteria.map((sc, idx) => (
                      <div key={idx} className="rounded-lg border bg-card p-3 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">{sc.score}</div>
                            <span className="text-xs font-medium text-muted-foreground">คะแนน</span>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeCriterion(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-20 shrink-0"><Input type="number" value={sc.score} onChange={(e) => updateCriterion(idx, "score", Number(e.target.value))} min={0} className="h-8 text-sm text-center" /></div>
                          <div className="flex-1"><Input value={sc.label} onChange={(e) => updateCriterion(idx, "label", e.target.value)} placeholder="คำอธิบาย..." className="h-8 text-sm" /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <div className="flex flex-1 justify-between">
            {!isHeader && (
              <div className="flex items-center gap-2 flex-1">
                <Button variant="outline" size="sm" onClick={handlePrevClick} disabled={currentIndex === 0}><ChevronLeft className="h-4 w-4 mr-1" />ก่อนหน้า</Button>
                <Button variant="outline" size="sm" onClick={handleNextClick} disabled={currentIndex === data.length - 1}>ถัดไป<ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            )}
            <div className="flex justify-end items-center gap-2 flex-1 ml-auto">
              <DialogClose asChild><Button variant="outline">ยกเลิก</Button></DialogClose>
              <Button onClick={() => handleSave(true)} disabled={!name.trim() || (!isYesNo && !isHeader && maxScore > maxAllowed) || !isDirty}>บันทึก</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Recursive Tree Node ─── */
function IndicatorTreeNode({
  ind, topicInds, color, cat, level, indexNum, onEdit, onDelete, onAddIndicator, onReorderGroup, catRemaining, sensors
}: any) {
  const childInds = topicInds.filter((i: any) => i.parentId === ind.id).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  const hasChildren = childInds.length > 0;

  let childIndex = 1;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ind.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  
  const isYesNo = isYesNoType(cat.scoreType as string);
  
  if (ind.isHeader || hasChildren ) {
      return (
          <div ref={setNodeRef} style={style} className={`mb-3 ${level > 0 ? 'ml-6' : ''}`}>
              <div className="border border-primary/20 rounded-lg bg-card shadow-sm overflow-hidden group/col">

                  <div className="flex items-start justfy-between p-3 bg-primary/5 border-b group/header">
                      <div className="flex items-start gap-2 flex-1 mt-0.5">
                          <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground mt-0.5">
                              <GripVertical className="h-4 w-4" />
                          </button>
                          <div className="mt-0.5">
                          {ind.isHeader ? <FolderTree className="h-4 w-4 text-primary/70" /> : <ListChecks className="h-4 w-4 text-muted-foreground"/>}
                          </div>
                          <div className="flex flex-col flex-1 pr-4">
                          <span className={`font-bold text-[15px] leading.sunug ${ind.isHeader ? 'text-primary' : 'text-foreground'}`}>{ind.name}</span>

                            {ind.description && (
                              <span className="text-[13px] text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">{ind.description}</span>
                            )}
                          </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(ind)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <AlertActionPopup action={() => onDelete(ind.id)} type="delete" title="ยืนยันลบ" description={`ต้องการลบ "${ind.name}" และข้อมูลภายในทั้งหมดหรือไม่?`}/>
                      </div>
                  </div>

                  <div className="p-3 bg-background border-l-2 border-primary/20 ml-2">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onReorderGroup(ind.topicId, ind.id, e)}>
                        <SortableContext items={childInds.map((i:any)=>i.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-1.5">
                                {childInds.length > 0 ? childInds.map((child: any) => {
                                    const cIdx = child.isHeader ? 0 : childIndex++;
                                    return (
                                        <IndicatorTreeNode 
                                            key={child.id} ind={child} topicInds={topicInds} color={color} cat={cat} level={level + 1} indexNum={cIdx} 
                                            onEdit={onEdit} onDelete={onDelete} onAddIndicator={onAddIndicator} onReorderGroup={onReorderGroup} catRemaining={catRemaining} sensors={sensors}
                                        />
                                    )
                                }) : (
                                    <div className="py-3 text-sm text-muted-foreground italic text-center bg-muted/10 rounded-md border border-dashed">ยังไม่มีตัวชี้วัดในหัวข้อนี้</div>
                                )}
                            </div>
                        </SortableContext>
                      </DndContext>
                      
                          {level < 1 && (
                            <AddSimpleIndicatorDialog 
                                onAdd={(name, ms) => onAddIndicator(ind.topicId, name, ms, false, ind.id)} 
                                maxAllowed={isYesNo ? Infinity : catRemaining} 
                                scoreType={cat.scoreType} 
                                buttonTrigger={
                                  <Button variant="ghost" size="sm" className="gap-1.5 text-[13px] h-8 text-muted-foreground hover:text-primary hover:bg-transparent p-0 mt-2 font-medium">
                                    <Plus className="h-4 w-4" /> เพิ่มตัวประเมินย่อย
                                  </Button>
                                }
                            />
                          )}
                  </div>
              </div>
          </div>
      )
  }

  return (
      <div ref={setNodeRef} style={style} className={`flex items-start gap-3 px-3 py-2.5 group/ind hover:bg-muted/10 border rounded-md bg-background ${level > 0 ? 'ml-6' : ''}`}>
          <button {...attributes} {...listeners} className="shrink-0 mt-0.5 cursor-grab text-muted-foreground hover:text-foreground">
              <GripVertical className="h-4 w-4" />
          </button>
          <div className="text-sm font-medium text-muted-foreground mt-0.5 shrink-0 w-4">{indexNum}.</div>
          <span className="flex-1 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{ind.name}</span>
          {!ind.isHeader && (
            isYesNo ? (
              <span className="text-xs font-semibold px-2 py-1 rounded-md bg-orange-100 text-orange-700 border border-orange-200 shrink-0">ผ่าน/ไม่ผ่าน</span>
          ) : (
              <span className="text-xs font-semibold px-2 py-1 rounded-md shrink-0" style={{ backgroundColor: `hsl(${color} / 0.1)`, color: `hsl(${color})` }}>เต็ม {ind.maxScore}</span>
          )
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover/ind:opacity-100 transition-opacity shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(ind)}>
                  <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AlertActionPopup action={() => onDelete(ind.id)} type="delete" title="ยืนยันลบ" description={`ลบตัวชี้วัด "${ind.name}" หรือไม่?`}/>
          </div>
      </div>
  );
}

/* ─── Main Page ─── */

const CAT_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  // --- กลุ่มคะแนนปกติ ---
  score:        { label: "ปกติ",         className: "text-blue-700 " },
  score_new:    { label: "ปกติ",         className: "text-blue-700 " },
  upgrade:      { label: "ยกระดับ",       className: "text-purple-700 " },
  score_upgrad: { label: "ยกระดับ",       className: "text-purple-700 " },
  score_renew:  { label: "ต่ออายุ",        className: "text-amber-700 " },

  // --- กลุ่มผ่าน/ไม่ผ่าน (ปรับ Label ให้เหมือนด้านบน) ---
  yes_no:        { label: "ปกติ",         className: "text-blue-700 " },
  yes_no_new:    { label: "ปกติ",         className: "text-blue-700 " },
  yes_no_upgrad: { label: "ยกระดับ",       className: "text-purple-700 " },
  yes_no_renew:  { label: "ต่ออายุ",        className: "text-amber-700 " },
};


const SettingsIndicators = ({role = "admin"}: {role?: string}) => {
  const [programs, setPrograms] = useState<DbProgram[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [topics, setTopics] = useState<DbTopic[]>([]);
  const [indicators, setIndicators] = useState<DbIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [openEditIndDialog, setOpenEditIndDialog] = useState(false);

  const [fetchedCategories, setFetchedCategories] = useState<Set<string>>(new Set());
  const [fetchedTopics, setFetchedTopics] = useState<Set<number>>(new Set());
  const [fetchedIndicators, setFetchedIndicators] = useState<Set<string>>(new Set());

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<DbIndicator | null>(null);

  // 🎯 แทนที่บล็อก categoryStats เดิมด้วยชุดนี้
  const categoryStats = useMemo(() => {
    return categories.reduce((acc, cat) => {
      // เช็คว่าหมวดหมู่นี้ถูกโหลดข้อมูล Topics มาเก็บในเครื่องหรือยัง
      const isTopicsLoaded = fetchedTopics.has(cat.id);
      
      // 1. ค่าเริ่มต้น: ใช้ตัวเลขจาก Database เพื่อให้โชว์ทันทีตอนโหลดหน้าเว็บ
      let tCount = cat.topics || 0;
      let iCount = 0;

      // 2. ถ้ามีการเปิดดูแล้ว หรือมีการเพิ่ม/ลบข้อมูล: ให้นับจาก State จริง (เพื่อให้ Auto-Update)
      if (isTopicsLoaded) {
        const catTopics = topics.filter(t => t.categoryId === cat.id);
        tCount = catTopics.length;
        
        const topicIds = catTopics.map(t => t.id);
        
        // เช็คว่าโหลด Indicator ของประเด็นเหล่านั้นมาครบหรือยัง
        const allIndsLoaded = topicIds.length === 0 || topicIds.every(id => fetchedIndicators.has(id));
        
        if (allIndsLoaded) {
          iCount = indicators.filter(ind => topicIds.includes(ind.topicId) && !ind.parentId).length;
        }
      }

      acc[cat.id] = {
        topicCount: tCount,
        indicatorCount: iCount
      };
      return acc;
    }, {} as Record<number, { topicCount: number; indicatorCount: number }>);
  }, [categories, topics, indicators, fetchedTopics, fetchedIndicators]);


  const fetchData = async (
    { programs = false, categories = false, topics = false, indicators = false, categoryId, topicId }:
    { programs?: boolean, categories?: boolean, topics?: boolean, indicators?: boolean, categoryId?: number, topicId?: string }
  ) => {
    try {
      const [progRes, catRes, topicRes, indRes] = await Promise.all([
        programs ? apiClient.get<DbProgram[]>("programs/names-with-sort", { params: { catCount: true } }) : Promise.resolve(null),
        categories ? apiClient.get<DbCategory[]>("categories", { params: { programId: selectedProgramId, topicCount: true, indCount: true } }) : Promise.resolve(null),
        topics ? apiClient.get<DbTopic[]>("topics", { params: { categoryId: categoryId ?? selectedCategoryId } }) : Promise.resolve(null),
        indicators ? apiClient.get<DbIndicator[]>("indicators", { params: { topicId: topicId ?? selectedTopicId } }) : Promise.resolve(null),
      ]);

      if (programs && progRes) setPrograms(progRes.data);
      if (categories && catRes && selectedProgramId) {
        setCategories(prev => mergeUniqueById(prev, catRes.data));
        setFetchedCategories(prev => new Set(prev).add(selectedProgramId));
      }
      if (topics && topicRes && (categoryId ?? selectedCategoryId)) {
        const cid = categoryId ?? selectedCategoryId!;
        setTopics(prev => mergeUniqueById(prev, topicRes.data));
        setFetchedTopics(prev => new Set(prev).add(cid));
      }
      if (indicators && indRes && (topicId ?? selectedTopicId)) {
        const tid = topicId ?? selectedTopicId!;
        const mapped = indRes.data.map(d => ({
          ...d,
          notes: d.notes || "",
          evidenceDescription: d.evidenceDescription || "",
          scoringCriteria: d.scoringCriteria || [],
          isHeader: d.isHeader || false,
          parentId: d.parentId || null,
        }));
        setIndicators(prev => mergeUniqueById(prev, mapped));
        setFetchedIndicators(prev => new Set(prev).add(tid));
      } 
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const cleanData = (action: 'edit' | 'delete', update: 'topic' | 'indicator', catId?: number, topicId?: string) => {
    if (update === 'topic' && catId !== undefined) {
      setFetchedTopics(prev => { const newSet = new Set(prev); newSet.delete(catId); return newSet; });
      setTopics(prev => prev.filter(t => t.categoryId !== catId));
      if(action === 'delete' && topicId !== undefined) {
        setFetchedIndicators(prev => { const newSet = new Set(prev); newSet.delete(topicId); return newSet; });
      }
    } else if (update === 'indicator' && topicId !== undefined) {
      setFetchedIndicators(prev => { const newSet = new Set(prev); newSet.delete(topicId); return newSet; });
    }
  }

  useEffect(() => { fetchData({programs: true}).finally(() => setLoading(false)); },[])
  useEffect(() => { if(selectedProgramId && !fetchedCategories.has(selectedProgramId)) fetchData({ categories: true }); },[selectedProgramId])

    // ✅ 1. เมื่อได้หมวดหมู่มาแล้ว ให้ซุ่มโหลด "ประเด็น" ของทุกหมวดหมู่ทันที
  useEffect(() => {
    if (categories.length > 0) {
      categories.forEach(cat => {
        if (!fetchedTopics.has(cat.id)) {
          fetchData({ categoryId: cat.id, topics: true });
        }
      });
    }
  }, [categories]);

  // ✅ 2. เมื่อได้ประเด็นมาแล้ว ให้ซุ่มโหลด "ตัวชี้วัด" ของทุกประเด็นทันที
  useEffect(() => {
    if (topics.length > 0) {
      topics.forEach(topic => {
        if (!fetchedIndicators.has(topic.id)) {
          fetchData({ topicId: topic.id, indicators: true });
        }
      });
    }
  }, [topics]);

  useEffect(() => {
    if(openEditIndDialog) {
      const indTopics = indicators.filter((i)=>i.topicId === selectedIndicator?.topicId).sort((a,b)=> a.sortOrder - b.sortOrder);
      if (indTopics.length > 0) setSelectedIndicator(indTopics[indTopics.length - 1]);
    }
  },[indicators])

  const getNextTopicNum = (catId: number) => topics.filter((t) => t.categoryId === catId).length + 1;

  const getCatRemainingBudget = (catId: number, excludeIndId?: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 0;
    const catTopics = topics.filter(t => t.categoryId === catId);
    const used = indicators
      .filter(i => catTopics.some(t => t.id === i.topicId) && i.id !== excludeIndId && !i.isHeader)
      .reduce((sum, i) => sum + i.maxScore, 0);
    return cat.maxScore - used;
  };

// 🎯 วางทับฟังก์ชัน handleAddTopicWithIndicators อันเก่า
  const handleAddTopicWithIndicators = async (catId: number, topicName: string, indicatorDrafts: any[]) => {
    const cat = categories.find(c => c.id === catId);
    if (cat && !isYesNoType(cat.scoreType)) {
      // คำนวณคะแนน โดยรวมของลูกเข้าไปด้วย
      const newTotal = indicatorDrafts.reduce((sum, ind) => {
        if (ind.isHeader && ind.children) {
           return sum + ind.children.reduce((cSum: number, c: any) => cSum + c.maxScore, 0);
        }
        return sum + ind.maxScore;
      }, 0);
      
      const remaining = getCatRemainingBudget(catId);
      if (newTotal > remaining) {
        toast({ title: "คะแนนเกินที่กำหนด", variant: "destructive" });
        return;
      }
    }
    
    const nextNum = getNextTopicNum(catId);
    const topicId = `${catId}.${nextNum}`;
    
    // 1. สร้างหัวข้อ (Topic)
    try {
      await apiClient.post("topics", { id: topicId, categoryId: catId, name: topicName, sortOrder: nextNum });
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาดในการสร้างประเด็น", variant: "destructive" });
      return;
    }

    if (indicatorDrafts.length > 0) {
      try {
        const promises: Promise<any>[] = [];
        let sortIndex = 1;
        
        // 2. ลูปรายการที่ผู้ใช้กรอกมา
        indicatorDrafts.forEach((draft) => {
          // กำหนด ID ให้ตัวหลัก เผื่อมีลูกจะได้อ้างอิง parentId ถูกต้อง
          const currentParentId = `${topicId}.${sortIndex}`;
          
          // ส่ง API Save ตัวแม่
          promises.push(
            apiClient.post("indicators", { 
              id: currentParentId, 
              topicId, 
              name: draft.name, 
              description: draft.description || "",
              maxScore: draft.maxScore, 
              sortOrder: sortIndex++, 
              isHeader: draft.isHeader || false, 
              parentId: null 
            })
          );
          
          // ส่ง API Save ตัวลูก (ถ้าเป็นกลุ่มและมีลูก)
          if (draft.isHeader && draft.children && draft.children.length > 0) {
            draft.children.forEach((child: any) => {
              promises.push(
                apiClient.post("indicators", { 
                  id: `${topicId}.${sortIndex}`, 
                  topicId, 
                  name: child.name, 
                  maxScore: child.maxScore, 
                  sortOrder: sortIndex++, 
                  isHeader: false, 
                  parentId: currentParentId  // ผูกเป็นลูกของตัวข้างบน
                })
              );
            });
          }
        });
        
        await Promise.all(promises); // ยิง API ทั้งหมดพร้อมกัน
      } catch (err: any) {
        toast({ title: "เกิดข้อผิดพลาดในการสร้างตัวชี้วัด", variant: "destructive" });
        return;
      }
    }
    
    toast({ title: "เพิ่มประเด็นและตัวชี้วัดสำเร็จ", variant: "success" });
    fetchData({ categoryId: catId, topics: true, indicators: true }); // โหลดข้อมูลมาโชว์ใหม่
  };

  const handleEditTopic = async (catId: number, topicId: string, name: string) => {
    try {
      await apiClient.patch(`topics/${topicId}`, { name });
      toast({ title: "แก้ไขสำเร็จ", variant: "success" });
      cleanData('edit', 'topic', catId);
      setTopics(prev => prev.filter(t => t.categoryId !== catId));
      fetchData({ categoryId: catId, topics: true });
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    }
  };

  const handleDeleteTopic = async (catId: number, topicId: string) => {
    setLoading(true);
    try {
      await apiClient.delete(`topics/${topicId}`);
      toast({ title: "ลบสำเร็จ", variant: "success" });
      cleanData('delete', 'topic', catId, topicId)
      setTopics(prev => prev.filter(t => t.id !== topicId));
      setIndicators(prev => prev.filter(i => i.topicId !== topicId));
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddIndicator = async (topicId: string, name: string, maxScore: number, isHeader: boolean = false, parentId: string | null = null) => {
    const topic = topics.find(t => t.id === topicId);
    if (topic && !isHeader) {
      const cat = categories.find(c => c.id === topic.categoryId);
      if (cat && !isYesNoType(cat.scoreType)) {
        const remaining = getCatRemainingBudget(topic.categoryId);
        if (maxScore > remaining) {
          toast({ title: "คะแนนเกินที่กำหนด", variant: "destructive" });
          return;
        }
      }
    }
    const groupInds = indicators.filter((i) => i.topicId === topicId && (i.parentId || null) === parentId);
    const nextNum = groupInds.length > 0 ? Math.max(...groupInds.map(i=>i.sortOrder)) + 1 : 1;
    const id = `${topicId}.${Date.now().toString().slice(-6)}`;
    try {
      await apiClient.post("indicators", { id, topicId, name, maxScore, sortOrder: nextNum, isHeader, parentId });
      toast({ title: "เพิ่มสำเร็จ", variant: "success" });
      fetchData({ topicId, indicators: true });
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    }
  };

  const handleEditIndicator = async (indId: string, data: any) => {
    setLoading(true);
    try {
      await apiClient.patch(`indicators/${indId}`, {
        name: data.name,
        maxScore: data.maxScore,
        description: data.description,
        detail: data.detail,
        notes: data.notes,
        evidenceDescription: data.evidenceDescription,
        scoringCriteria: data.scoringCriteria,
        isHeader: data.isHeader,
        parentId: data.parentId,
      });
      toast({ title: "แก้ไขสำเร็จ", variant: "success" });
      const ind = indicators.find(i => i.id === indId);
      cleanData('edit', 'indicator', null, ind?.topicId);
      setIndicators(prev => prev.filter(i => i.id !== indId));
      if(ind) fetchData({ topicId: ind.topicId, indicators: true });
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIndicator = async (topicId: string, indId: string) => {
    setLoading(true);
    try {
      await apiClient.delete(`indicators/${indId}`);
      toast({ title: "ลบสำเร็จ", variant: "success" });
      cleanData('delete', 'indicator', null, topicId);
      setIndicators(prev => prev.filter(i => i.id !== indId));
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReorderGroup = async (topicId: string, parentId: string | null, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const groupInds = indicators.filter(i => i.topicId === topicId && (i.parentId || null) === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    const oldIndex = groupInds.findIndex(i => i.id === active.id);
    const newIndex = groupInds.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedGroup = [...groupInds];
    const [moved] = reorderedGroup.splice(oldIndex, 1);
    reorderedGroup.splice(newIndex, 0, moved);

    const minSort = groupInds.length > 0 ? Math.min(...groupInds.map(i=>i.sortOrder)) : 1;
    const updatedIndicators = indicators.map(ind => {
      const idx = reorderedGroup.findIndex(r => r.id === ind.id);
      return idx !== -1 ? { ...ind, sortOrder: minSort + idx } : ind;
    });
    setIndicators(updatedIndicators);

    await Promise.all(reorderedGroup.map((ind, idx) => apiClient.patch(`indicators/${ind.id}`, { sortOrder: minSort + idx })));
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4">
      <LoadingOverlay visible={loading} />
      <div className="px-6 py-4 rounded-2xl shrink-0" style={{ background: "var(--glass-bg)", backdropFilter: "blur(14px)", border: "1px solid var(--glass-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-700">
            <ListChecks className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-green-800">จัดการประเด็น / ตัวชี้วัด</h2>
            <p className="text-xs text-muted-foreground">เพิ่ม แก้ไข หรือลบประเด็นและตัวชี้วัด (รองรับหัวข้อย่อยซ้อนกันได้ไม่จำกัด)</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={{ background: "var(--glass-bg)", backdropFilter: "blur(14px)", border: "1px solid var(--glass-border)" }}>
        <div className="h-full overflow-y-auto px-6 py-6 space-y-6">
        {programs.map((program) => {
          const typeOrder = (st: string) => (st.includes("_upgrad") || st === "upgrade") ? 1 : st.includes("_renew") ? 2 : 0;
          const programCategories = categories.filter(c => c.programId === program.id).sort((a, b) => typeOrder(a.scoreType as string) - typeOrder(b.scoreType as string) || a.sortOrder - b.sortOrder);

          return (
            <Collapsible key={program.id} defaultOpen={false} className="group/prog">
              <div className="rounded-xl border border-accent/30 bg-accent/5 overflow-hidden shadow-sm">
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center gap-3 px-5 py-4 hover:bg-accent/10 transition-colors group" onClick={() => setSelectedProgramId(program.id)}>
                    <ChevronRight className="h-5 w-5 text-accent-foreground/70 transition-transform duration-300 group-data-[state=open]:rotate-90" />
                    <p className="font-bold text-foreground text-left flex-1 text-base">{program.name}</p>
                    <span className="text-xs text-muted-foreground px-3 py-1 bg-background rounded-full border">{program.categories} หมวด</span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-5 pb-5 pt-2 space-y-3">
                    {programCategories.map((cat) => {
                      const color = "210 70% 45%";
                      const isYesNoCat = isYesNoType(cat.scoreType);
                      const stats = categoryStats[cat.id] || { topicCount: 0, indicatorCount: 0 };
                      const catRemaining = isYesNoCat ? Infinity : getCatRemainingBudget(cat.id);
                      const catTopics = topics.filter((t) => t.categoryId === cat.id);
                    
                      return (
                        <Collapsible key={cat.id} defaultOpen={false} className="group/cat rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                          <CollapsibleTrigger asChild>
                            <button className="flex w-full items-center gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left group" onClick={() => setSelectedCategoryId(cat.id)}>
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-90 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-foreground text-[15px] truncate">{cat.name}</p>
                              </div>
                              {CAT_TYPE_CONFIG[cat.scoreType] && (
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold  ${CAT_TYPE_CONFIG[cat.scoreType].className}`}>
                                      {CAT_TYPE_CONFIG[cat.scoreType].label}
                                    </span>
                                    </div>
                                  )}
                              <div className="text-right text-xs text-muted-foreground flex gap-3 items-center shrink-0">
                              
                                  <span className="font-medium">{stats.topicCount} ประเด็น</span>
                                  <span className="font-medium border-l pl-3 border-border/50">{stats.indicatorCount} ตัวชี้วัด</span>
                                  {!isYesNoCat ? (
                                    <span className={`px-2.5 py-1 rounded-lg border font-bold shadow-sm ${cat.scoreType.includes("upgrad") || cat.scoreType === "upgrade" ? "bg-purple-50 text-purple-600 border-purple-200" : cat.scoreType.includes("renew") ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"} `}>
                                      คะแนนเต็ม {cat.maxScore}
                                    </span>
                                  ) : (
                                    <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg border border-orange-200 font-bold shadow-sm">
                                      ผ่าน / ไม่ผ่าน
                                    </span>
                                  )}
                                  {cat.isDefault && (
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">Default</span>
                                  )}
                              </div>
                            </button>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="flex flex-col bg-background/50 border-t border-border/50">
                              {catTopics.length > 0 ? catTopics.map((topic) => {
                                const topicInds = indicators.filter((i) => i.topicId === topic.id).sort((a, b) => a.sortOrder - b.sortOrder);
                                let displayIndex = 1;
                                return (
                                  <Collapsible key={topic.id} defaultOpen={false} className="group/topic border-b border-border/40 last:border-none">
                                    <div className="flex items-center gap-2 px-4 py-2 hover:bg-accent/5 transition-colors">
                                      <CollapsibleTrigger asChild>
                                        <button className="shrink-0 p-1 hover:bg-muted rounded group" onClick={() => setSelectedTopicId(topic.id)}>
                                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-90" />
                                        </button>
                                      </CollapsibleTrigger>
                                      <span className="text-sm font-semibold text-foreground flex-1 cursor-pointer" onClick={() => setSelectedTopicId(topic.id)}>{topic.name}</span>
                                      <div className="flex gap-1 opacity-40 hover:opacity-100 transition-opacity">
                                        <EditTopicDialog topic={topic} onSave={(name) => handleEditTopic(cat.id, topic.id, name)} />
                                        <AlertActionPopup action={() => handleDeleteTopic(cat.id, topic.id)} type="delete" title="ยืนยันลบ" description={`ลบ "${topic.name}" หรือไม่?`}/>
                                      </div>
                                    </div>

                                    <CollapsibleContent>
                                      <div className="bg-background pl-6 pr-2 py-3 border-l-2 border-muted ml-4 mb-2 space-y-2">
                                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleReorderGroup(topic.id, null, e)}>
                                            <SortableContext items={topicInds.filter(i=>!i.parentId).map(i=>i.id)} strategy={verticalListSortingStrategy}>
                                              <div className="space-y-1.5">
                                                {topicInds.filter(i=>!i.parentId).map((rootNode) => {
                                                  const currentIdx = rootNode.isHeader ? 0 : displayIndex++;
                                                  return (
                                                    <IndicatorTreeNode 
                                                      key={rootNode.id}
                                                      ind={rootNode}
                                                      topicInds={topicInds}
                                                      color={color}
                                                      cat={cat}
                                                      level={0}
                                                      indexNum={currentIdx}
                                                      onEdit={(ind: any) => { setSelectedIndicator(ind); setOpenEditIndDialog(true); }}
                                                      onDelete={(id: string) => handleDeleteIndicator(topic.id, id)}
                                                      onAddIndicator={handleAddIndicator}
                                                      onReorderGroup={handleReorderGroup}
                                                      catRemaining={catRemaining}
                                                      sensors={sensors}
                                                    />
                                                  )
                                                })}
                                              </div>
                                            </SortableContext>
                                          </DndContext>
                                          
                                          <AddIndicatorDialog 
                                              onAdd={(name, ms, isH) => handleAddIndicator(topic.id, name, ms, isH, null)} 
                                              maxAllowed={isYesNoCat ? Infinity : catRemaining} 
                                              scoreType={cat.scoreType}
                                              buttonTrigger={
                                                <Button variant="ghost" size="sm" className="gap-1 text-xs h-9 text-muted-foreground hover:text-primary hover:bg-primary/10 w-full justify-start border border-dashed border-border/50 mt-2">
                                                  <Plus className="h-4 w-4" /> เพิ่มตัวชี้วัด
                                                </Button>
                                              }
                                          />

                                          {selectedIndicator && selectedIndicator.topicId === topic.id &&
                                            <EditIndicatorDialog
                                              data={topicInds}
                                              indicator={selectedIndicator}
                                              onSave={(data) => handleEditIndicator(data.id, data)}
                                              maxAllowed={isYesNoCat ? Infinity : catRemaining + selectedIndicator.maxScore}
                                              scoreType={cat.scoreType}
                                              openEditIndDialog={openEditIndDialog}
                                              setOpenEditIndDialog={setOpenEditIndDialog}
                                              setSelectedIndicator={setSelectedIndicator}
                                            />
                                          }
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                );
                              }) : <div className="px-6 py-6 text-center text-muted-foreground text-sm">ยังไม่มีประเด็นพิจารณา</div>}

                              <div className="px-5 py-3 bg-muted/10 border-t border-border/50">
                                 <AddTopicWithIndicatorsDialog
                                   categories={[cat]}
                                   getNextTopicNum={getNextTopicNum}
                                   onSave={handleAddTopicWithIndicators}
                                   preSelectedCatId={cat.id}
                                   triggerLabel="เพิ่มประเด็น"
                                   compact
                                   categoryBudgets={{ [cat.id]: catRemaining }}
                                 />
                              </div>
                            </div>
                          </CollapsibleContent>
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
    </div>
  );
};

export default SettingsIndicators;
