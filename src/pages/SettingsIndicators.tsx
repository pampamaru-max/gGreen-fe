import { useState, useEffect } from "react";
import { getCategoryColor } from "@/components/CategoryCard";
import { ListChecks, Plus, Pencil, Trash2, ChevronRight, Loader2, GripVertical } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
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

interface DbProgram {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

interface DbCategory {
  id: number;
  name: string;
  max_score: number;
  sort_order: number;
  program_id: string | null;
}

interface DbTopic {
  id: string;
  category_id: number;
  name: string;
  sort_order: number;
}

interface ScoringCriterion {
  score: number;
  label: string;
}

interface DbIndicator {
  id: string;
  topic_id: string;
  name: string;
  max_score: number;
  sort_order: number;
  description: string;
  detail: string;
  notes: string;
  evidence_description: string;
  scoring_criteria: ScoringCriterion[];
}

/* ─── Dialogs ─── */

function EditTopicDialog({ topic, onSave }: { topic: DbTopic; onSave: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(topic.name);
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setName(topic.name); }}>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setOpen(true)}>
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

function AddIndicatorDialog({ onAdd }: { onAdd: (name: string, maxScore: number) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [maxScore, setMaxScore] = useState(4);
  const reset = () => { setName(""); setMaxScore(4); };
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3" /> เพิ่มตัวชี้วัด
      </Button>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>เพิ่มตัวชี้วัดใหม่</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>ชื่อตัวชี้วัด</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น มีมาตรการประหยัดน้ำ" />
          </div>
          <div className="space-y-1.5">
            <Label>คะแนนเต็ม</Label>
            <Input type="number" value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} min={1} max={10} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">ยกเลิก</Button></DialogClose>
          <Button onClick={() => { onAdd(name.trim(), maxScore); reset(); setOpen(false); }} disabled={!name.trim()}>เพิ่ม</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditIndicatorDialog({ indicator, onSave }: { indicator: DbIndicator; onSave: (data: { name: string; maxScore: number; description: string; detail: string; notes: string; evidenceDescription: string; scoringCriteria: ScoringCriterion[] }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(indicator.name);
  const [maxScore, setMaxScore] = useState(indicator.max_score);
  const [description, setDescription] = useState(indicator.description || "");
  const [detail, setDetail] = useState(indicator.detail || "");
  const [notes, setNotes] = useState(indicator.notes || "");
  const [scoringCriteria, setScoringCriteria] = useState<ScoringCriterion[]>(indicator.scoring_criteria || []);
  const [evidenceDescription, setEvidenceDescription] = useState(indicator.evidence_description || "");

  const resetFromIndicator = () => {
    setName(indicator.name);
    setMaxScore(indicator.max_score);
    setDescription(indicator.description || "");
    setDetail(indicator.detail || "");
    setNotes(indicator.notes || "");
    setEvidenceDescription(indicator.evidence_description || "");
    setScoringCriteria(indicator.scoring_criteria || []);
  };

  const addCriterion = () => setScoringCriteria([...scoringCriteria, { score: 0, label: "" }]);
  const removeCriterion = (idx: number) => setScoringCriteria(scoringCriteria.filter((_, i) => i !== idx));
  const updateCriterion = (idx: number, field: keyof ScoringCriterion, value: string | number) => {
    const updated = [...scoringCriteria];
    updated[idx] = { ...updated[idx], [field]: value };
    setScoringCriteria(updated);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) resetFromIndicator(); }}>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setOpen(true)}>
        <Pencil className="h-3 w-3" />
      </Button>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0"><DialogTitle>แก้ไขตัวชี้วัด {indicator.id}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden py-2">
          {/* Left column - Details */}
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="space-y-1.5">
                <Label>ชื่อตัวชี้วัด</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>คะแนนเต็ม</Label>
                <Input type="number" value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} min={1} max={10} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>คำอธิบาย</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="คำอธิบายตัวชี้วัด..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>รายละเอียดตัวชี้วัด</Label>
              <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." rows={8} className="min-h-[180px]" />
            </div>
            <div className="space-y-1.5">
              <Label>หมายเหตุเกณฑ์การให้คะแนน</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="หมายเหตุเพิ่มเติม..." rows={6} className="min-h-[140px]" />
            </div>
            <div className="space-y-1.5">
              <Label>หลักฐานอ้างอิง (ไฟล์แนบ)</Label>
              <Textarea value={evidenceDescription} onChange={(e) => setEvidenceDescription(e.target.value)} placeholder="ระบุรายละเอียดหลักฐานอ้างอิงที่ต้องแนบ เช่น รูปถ่าย, เอกสารรับรอง, ผลทดสอบ..." rows={6} className="min-h-[140px]" />
            </div>
          </div>

          {/* Right column - Scoring Criteria */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <Label className="text-base font-semibold">เกณฑ์คะแนน</Label>
              <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={addCriterion}>
                <Plus className="h-3 w-3" /> เพิ่มเกณฑ์
              </Button>
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
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">ยกเลิก</Button></DialogClose>
          <Button onClick={() => { onSave({ name: name.trim(), maxScore, description, detail, notes, evidenceDescription, scoringCriteria }); setOpen(false); }} disabled={!name.trim()}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Sortable Indicator Row ─── */

function SortableIndicatorRow({ ind, color, onEdit, onDelete }: { ind: DbIndicator; color: string; onEdit: (data: any) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ind.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={{ ...style, backgroundColor: `hsl(${color} / 0.03)` }} className="flex items-center gap-3 px-4 py-2.5 group/ind hover:bg-muted/10 border-b last:border-b-0">
      <button {...attributes} {...listeners} className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm text-foreground">{ind.name}</span>
      <span
        className="text-xs font-semibold px-2 py-1 rounded-md"
        style={{ backgroundColor: `hsl(${color} / 0.1)`, color: `hsl(${color})` }}
      >
        เต็ม {ind.max_score}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover/ind:opacity-100 transition-opacity">
        <EditIndicatorDialog indicator={ind} onSave={onEdit} />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
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

  const fetchAll = async () => {
    const [progRes, catRes, topicRes, indRes] = await Promise.all([
      supabase.from("programs").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("topics").select("*").order("sort_order"),
      supabase.from("indicators").select("*").order("sort_order"),
    ]);

    if (progRes.data) setPrograms(progRes.data);
    if (catRes.data) setCategories(catRes.data);
    if (topicRes.data) setTopics(topicRes.data);
    if (indRes.data) setIndicators(indRes.data.map(d => ({ ...d, notes: (d as any).notes || "", evidence_description: (d as any).evidence_description || "", scoring_criteria: (d.scoring_criteria as unknown as ScoringCriterion[] ?? []) })));
  };

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, []);

  const getNextTopicNum = (catId: number) => {
    const catTopics = topics.filter((t) => t.category_id === catId);
    return catTopics.length + 1;
  };

  // Topic CRUD
  const handleAddTopicWithIndicators = async (
    catId: number,
    topicName: string,
    indicatorDrafts: { name: string; maxScore: number }[]
  ) => {
    const nextNum = getNextTopicNum(catId);
    const topicId = `${catId}.${nextNum}`;
    const { error: topicError } = await supabase.from("topics").insert({
      id: topicId, category_id: catId, name: topicName, sort_order: nextNum,
    });
    if (topicError) {
      toast({ title: "เกิดข้อผิดพลาด", description: topicError.message, variant: "destructive" });
      return;
    }

    // Insert indicators
    const indRows = indicatorDrafts.map((ind, idx) => ({
      id: `${topicId}.${idx + 1}`,
      topic_id: topicId,
      name: ind.name,
      max_score: ind.maxScore,
      sort_order: idx + 1,
    }));
    if (indRows.length > 0) {
      const { error: indError } = await supabase.from("indicators").insert(indRows);
      if (indError) {
        toast({ title: "เกิดข้อผิดพลาด", description: indError.message, variant: "destructive" });
        return;
      }
    }

    toast({ title: "เพิ่มประเด็นและตัวชี้วัดสำเร็จ" });
    fetchAll();
  };


  const handleEditTopic = async (topicId: string, name: string) => {
    const { error } = await supabase.from("topics").update({ name }).eq("id", topicId);
    if (error) { toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" }); return; }
    toast({ title: "แก้ไขประเด็นสำเร็จ" });
    fetchAll();
  };

  const handleDeleteTopic = async (topicId: string) => {
    const { error } = await supabase.from("topics").delete().eq("id", topicId);
    if (error) { toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" }); return; }
    toast({ title: "ลบประเด็นสำเร็จ" });
    fetchAll();
  };

  // Indicator CRUD
  const handleAddIndicator = async (topicId: string, name: string, maxScore: number) => {
    const topicInds = indicators.filter((i) => i.topic_id === topicId);
    const nextNum = topicInds.length + 1;
    const id = `${topicId}.${nextNum}`;
    const { error } = await supabase.from("indicators").insert({
      id, topic_id: topicId, name, max_score: maxScore, sort_order: nextNum,
    });
    if (error) { toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" }); return; }
    toast({ title: "เพิ่มตัวชี้วัดสำเร็จ" });
    fetchAll();
  };

  const handleEditIndicator = async (indId: string, data: { name: string; maxScore: number; description: string; detail: string; notes: string; evidenceDescription: string; scoringCriteria: ScoringCriterion[] }) => {
    const { error } = await supabase.from("indicators").update({ name: data.name, max_score: data.maxScore, description: data.description, detail: data.detail, notes: data.notes, evidence_description: data.evidenceDescription, scoring_criteria: JSON.parse(JSON.stringify(data.scoringCriteria)) } as any).eq("id", indId);
    if (error) { toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" }); return; }
    toast({ title: "แก้ไขตัวชี้วัดสำเร็จ" });
    fetchAll();
  };

  const handleDeleteIndicator = async (indId: string) => {
    const { error } = await supabase.from("indicators").delete().eq("id", indId);
    if (error) { toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" }); return; }
    toast({ title: "ลบตัวชี้วัดสำเร็จ" });
    fetchAll();
  };

  const handleReorderIndicators = async (topicId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const topicInds = indicators.filter(i => i.topic_id === topicId).sort((a, b) => a.sort_order - b.sort_order);
    const oldIndex = topicInds.findIndex(i => i.id === active.id);
    const newIndex = topicInds.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...topicInds];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Optimistic update
    const updatedIndicators = indicators.map(ind => {
      const idx = reordered.findIndex(r => r.id === ind.id);
      if (idx !== -1) return { ...ind, sort_order: idx + 1 };
      return ind;
    });
    setIndicators(updatedIndicators);

    // Persist
    const updates = reordered.map((ind, idx) =>
      supabase.from("indicators").update({ sort_order: idx + 1 }).eq("id", ind.id)
    );
    await Promise.all(updates);
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
          const programCategories = categories.filter(c => c.program_id === program.id);
          if (programCategories.length === 0) return null;

          return (
            <Collapsible key={program.id} defaultOpen={progIdx === 0} className="group/prog">
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
                      const color = "210 70% 45%"; // consistent blue for all categories
                      const catTopics = topics.filter((t) => t.category_id === cat.id);

                      return (
                        <Collapsible key={cat.id} defaultOpen={catIdx === 0} className="group/cat">
                          <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
                            <CollapsibleTrigger asChild>
                              <button
                                className="flex w-full items-center gap-3 px-4 py-3 border-b hover:bg-muted/30 transition-colors"
                                style={{ backgroundColor: `hsl(${color} / 0.1)` }}
                              >
                                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]/cat:rotate-90" />
                                <p className="font-bold text-foreground text-left flex-1">{cat.name}</p>
                                <span className="text-xs text-muted-foreground">
                                  {catTopics.length} ประเด็น · {indicators.filter(i => catTopics.some(t => t.id === i.topic_id)).length} ตัวชี้วัด · คะแนนเต็ม {cat.max_score}
                                </span>
                              </button>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              {catTopics.map((topic) => {
                                const topicInds = indicators.filter((i) => i.topic_id === topic.id).sort((a, b) => a.sort_order - b.sort_order);
                                return (
                                  <Collapsible key={topic.id} defaultOpen className="group/topic border-b last:border-b-0">
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
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteTopic(topic.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
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
                                                onEdit={(data) => handleEditIndicator(ind.id, data)}
                                                onDelete={() => handleDeleteIndicator(ind.id)}
                                              />
                                            ))}
                                          </div>
                                        </SortableContext>
                                      </DndContext>
                                      <div className="px-4 py-2 border-t border-dashed">
                                        <AddIndicatorDialog onAdd={(name, ms) => handleAddIndicator(topic.id, name, ms)} />
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                );
                              })}

                              {/* Add topic button inside category */}
                              <div className="px-4 py-2.5 border-t border-dashed">
                                <AddTopicWithIndicatorsDialog
                                  categories={programCategories}
                                  getNextTopicNum={getNextTopicNum}
                                  onSave={handleAddTopicWithIndicators}
                                  preSelectedCatId={cat.id}
                                  triggerLabel="เพิ่มประเด็น"
                                  compact
                                />
                              </div>
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
