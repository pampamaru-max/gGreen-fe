import { useState } from "react";
import { Plus, Trash2, FolderTree, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ✅ เพิ่ม description เข้าไปในโครงสร้าง
interface IndicatorDraft {
  name: string;
  description?: string; 
  maxScore: number;
  isHeader?: boolean;
  children?: { name: string; maxScore: number }[];
}

interface Category {
  id: number;
  name: string;
  scoreType?: string;
}

const getCategoryTypeLabel = (scoreType?: string): "ปกติ" | "อัพเกณฑ์" | "ต่ออายุ" => {
  if (!scoreType) return "ปกติ";
  if (scoreType.includes("_renew")) return "ต่ออายุ";
  if (scoreType.includes("_upgrad") || scoreType === "upgrade" || scoreType === "yes_no") return "อัพเกณฑ์";
  return "ปกติ";
};

interface Props {
  categories: Category[];
  getNextTopicNum: (catId: number) => number;
  onSave: (catId: number, topicName: string, indicators: IndicatorDraft[]) => Promise<void>;
  preSelectedCatId?: number;
  triggerLabel?: string;
  compact?: boolean;
  categoryBudgets?: Record<number, number>;
}

export default function AddTopicWithIndicatorsDialog({ categories, onSave, preSelectedCatId, triggerLabel, compact, categoryBudgets }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catId, setCatId] = useState<string>(preSelectedCatId ? String(preSelectedCatId) : "");
  const [topicName, setTopicName] = useState("");
  
  const [indicators, setIndicators] = useState<IndicatorDraft[]>([
    { name: "", description: "", maxScore: 4, isHeader: false, children: [] },
  ]);

  const reset = () => {
    setCatId(preSelectedCatId ? String(preSelectedCatId) : "");
    setTopicName("");
    setIndicators([{ name: "", description: "", maxScore: 4, isHeader: false, children: [] }]);
  };

  const addIndicator = () => {
    setIndicators((prev) => [...prev, { name: "", description: "", maxScore: 4, isHeader: false, children: [] }]);
  };

  const updateIndicator = (idx: number, field: keyof IndicatorDraft, value: any) => {
    setIndicators((prev) =>
      prev.map((ind, i) => (i === idx ? { ...ind, [field]: value } : ind))
    );
  };

  const removeIndicator = (idx: number) => {
    setIndicators((prev) => prev.filter((_, i) => i !== idx));
  };

  const addChildIndicator = (parentIdx: number) => {
    setIndicators(prev => prev.map((ind, i) => 
      i === parentIdx ? { ...ind, children: [...(ind.children || []), { name: "", maxScore: 4 }] } : ind
    ));
  };

  const updateChildIndicator = (parentIdx: number, childIdx: number, field: string, value: any) => {
    setIndicators(prev => prev.map((ind, i) => {
      if (i === parentIdx && ind.children) {
        const newChildren = [...ind.children];
        newChildren[childIdx] = { ...newChildren[childIdx], [field]: value };
        return { ...ind, children: newChildren };
      }
      return ind;
    }));
  };

  const removeChildIndicator = (parentIdx: number, childIdx: number) => {
    setIndicators(prev => prev.map((ind, i) => {
      if (i === parentIdx && ind.children) {
        return { ...ind, children: ind.children.filter((_, ci) => ci !== childIdx) };
      }
      return ind;
    }));
  };

  const selectedCat = categories.find(c => c.id === Number(catId));
  const isYesNoCat = !!selectedCat?.scoreType && selectedCat.scoreType.includes("yes_no");
  const validIndicators = indicators.filter((ind) => ind.name.trim());
  
  const remaining = (!isYesNoCat && catId && categoryBudgets) ? (categoryBudgets[Number(catId)] ?? Infinity) : Infinity;
  
  const newTotal = isYesNoCat ? 0 : validIndicators.reduce((sum, ind) => {
    if (ind.isHeader) {
      return sum + (ind.children?.reduce((cSum, c) => cSum + (c.name.trim() ? c.maxScore : 0), 0) || 0);
    }
    return sum + ind.maxScore;
  }, 0);

  const isOverBudget = !isYesNoCat && newTotal > remaining;
  const canSubmit = catId && topicName.trim() && validIndicators.length > 0 && !isOverBudget;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const drafts = validIndicators.map(i => ({
        ...i,
        maxScore: (isYesNoCat || i.isHeader) ? 0 : i.maxScore,
        children: i.children?.filter(c => c.name.trim()).map(c => ({
          ...c,
          maxScore: isYesNoCat ? 0 : c.maxScore
        })) || []
      }));
      await onSave(Number(catId), topicName.trim(), drafts);
      reset();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); reset(); }}>
      <DialogTrigger asChild>
      <Button variant={compact ? "ghost" : "default"} size={compact ? "sm" : "default"} className={compact ? "gap-1 text-xs h-7" : "gap-1.5"} onClick={() => setOpen(true)}>
        <Plus className={compact ? "h-3 w-3" : "h-4 w-4"} /> {triggerLabel || "เพิ่มประเด็น/ตัวชี้วัด"}
      </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>เพิ่มประเด็นใหม่</DialogTitle>
        </DialogHeader>

        <div className="shrink-0 space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-base font-semibold">เลือกหมวด</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกหมวด..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name} - {getCategoryTypeLabel(cat.scoreType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-base font-semibold">ชื่อประเด็น</Label>
            <Input
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="เช่น สภาพแวดล้อม"
              className="text-base py-3"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <Label className="text-base font-semibold">รายการประเมิน</Label>
            {isYesNoCat ? (
              <span className="text-xs rounded-full px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200">ผ่าน/ไม่ผ่าน</span>
            ) : (catId && categoryBudgets && (
              <span className={`text-xs font-medium ${isOverBudget ? "text-destructive" : "text-muted-foreground"}`}>
                {isOverBudget
                  ? `เกินกำหนด ${newTotal - remaining} คะแนน`
                  : `เหลือได้อีก ${remaining - newTotal} / ${remaining} คะแนน`}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-1">
          <div className="rounded-xl border bg-card p-4 space-y-4">
            {indicators.map((ind, idx) => (
              <div key={idx} className="rounded-lg border bg-background p-4 space-y-4 shadow-sm">
                
                {/* ปุ่มสลับประเภท */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateIndicator(idx, "isHeader", false)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-bold transition-all ${
                      !ind.isHeader 
                        ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <ListChecks className="h-4 w-4" /> ตัวชี้วัดปกติ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateIndicator(idx, "isHeader", true);
                      if (!ind.children || ind.children.length === 0) {
                        updateIndicator(idx, "children", [{ name: "", maxScore: 4 }]);
                      }
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-bold transition-all ${
                      ind.isHeader 
                        ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <FolderTree className="h-4 w-4" /> หัวข้อจัดกลุ่ม
                  </button>
                </div>

                {/* 🎯 บรรทัดที่ 1: ชื่อ */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {ind.isHeader ? "ชื่อหัวข้อจัดกลุ่ม" : "ชื่อตัวชี้วัด"}
                  </Label>
                  <Textarea
                    value={ind.name}
                    onChange={(e) => {
                      updateIndicator(idx, "name", e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    onFocus={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                    placeholder={ind.isHeader ? "เช่น 4.1.1 โรงแรมมีการตรวจสอบ..." : "พิมพ์ชื่อตัวชี้วัด..."}
                    className={`w-full resize-none overflow-hidden min-h-[50px] text-sm leading-relaxed ${ind.isHeader ? 'font-bold text-primary placeholder:text-primary/40' : ''}`}
                    rows={2}
                  />
                </div>

                {/* 🎯 บรรทัดที่ 2: คำบรรยาย (แยกชัดเจน โชว์เมื่อเป็นหัวข้อจัดกลุ่ม) */}
                {ind.isHeader && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">คำบรรยายใต้หัวข้อ (ถ้ามี)</Label>
                    <Textarea
                      value={ind.description || ""}
                      onChange={(e) => {
                        updateIndicator(idx, "description", e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      onFocus={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                      placeholder="ระบุคำอธิบายเพิ่มเติม..."
                      className="w-full resize-none overflow-hidden min-h-[50px] text-sm bg-muted/20 border-dashed"
                      rows={2}
                    />
                  </div>
                )}

                {/* คะแนนเต็ม และปุ่มลบตัวแม่ */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                  {!isYesNoCat && !ind.isHeader && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground shrink-0">คะแนนเต็ม</Label>
                      <Input
                        type="number"
                        value={ind.maxScore}
                        onChange={(e) => updateIndicator(idx, "maxScore", Number(e.target.value))}
                        min={1}
                        className="w-16 text-center h-8 text-sm"
                      />
                    </div>
                  )}
                  
                  {ind.isHeader && (
                    <div className="text-[11px] text-primary/70 font-medium flex items-center gap-1.5">
                      <ListChecks className="h-3 w-3" /> ตัวชี้วัดย่อยด้านล่าง
                    </div>
                  )}
                  
                  <div className="flex-1" />
                  
                  {indicators.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => removeIndicator(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* ลูกๆ (ซ้อนข้างใน) */}
                {ind.isHeader && (
                  <div className="mt-2 ml-2 pl-4 border-l-2 border-primary/20 space-y-3 pt-1">
                    {ind.children?.map((child, cIdx) => (
                      <div key={cIdx} className="flex flex-col gap-2 bg-muted/10 p-3 rounded-lg border shadow-sm">
                        <div className="flex gap-2 items-start">
                          <div className="pt-2"><ListChecks className="h-3 w-3 text-muted-foreground" /></div>
                          <Textarea
                            value={child.name}
                            onChange={(e) => {
                              updateChildIndicator(idx, cIdx, "name", e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height = e.target.scrollHeight + "px";
                            }}
                            placeholder="ชื่อตัวชี้วัดย่อย..."
                            className="w-full resize-none overflow-hidden min-h-[40px] text-sm bg-white"
                            rows={1}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between pl-6">
                          {!isYesNoCat ? (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">คะแนน</Label>
                              <Input
                                type="number"
                                value={child.maxScore}
                                onChange={(e) => updateChildIndicator(idx, cIdx, "maxScore", Number(e.target.value))}
                                min={1}
                                className="w-14 text-center h-7 text-xs bg-white"
                              />
                            </div>
                          ) : <div />}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeChildIndicator(idx, cIdx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addChildIndicator(idx)}
                      className="h-8 text-xs text-primary hover:bg-primary/5 gap-1.5 w-full border-dashed"
                    >
                      <Plus className="h-3.5 w-3.5" /> เพิ่มตัวชี้วัดย่อย
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
            <Button
              type="button"
              variant="ghost"
              className="gap-1.5 text-[13px] h-10 text-muted-foreground hover:text-primary hover:bg-primary/5 w-full justify-start border border-dashed border-border/50 rounded-lg mt-2"
              onClick={addIndicator}
            >
              <Plus className="h-4 w-4" /> เพิ่มตัวชี้วัด
            </Button>
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-3">
          <DialogClose asChild>
            <Button variant="outline">ยกเลิก</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!canSubmit || saving}>
            {saving ? "กำลังบันทึก..." : isOverBudget ? "คะแนนเกินกำหนด" : "บันทึกข้อมูล"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}