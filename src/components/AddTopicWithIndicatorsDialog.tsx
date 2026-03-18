import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IndicatorDraft {
  name: string;
  maxScore: number;
}

interface Category {
  id: number;
  name: string;
}

interface Props {
  categories: Category[];
  /** Returns the next sort_order number for topics under the given category */
  getNextTopicNum: (catId: number) => number;
  onSave: (catId: number, topicName: string, indicators: IndicatorDraft[]) => Promise<void>;
  /** Pre-selected category ID (when opened from within a category card) */
  preSelectedCatId?: number;
  /** Custom trigger button label */
  triggerLabel?: string;
  /** Whether to show as a small ghost button */
  compact?: boolean;
}

export default function AddTopicWithIndicatorsDialog({ categories, onSave, preSelectedCatId, triggerLabel, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catId, setCatId] = useState<string>(preSelectedCatId ? String(preSelectedCatId) : "");
  const [topicName, setTopicName] = useState("");
  const [indicators, setIndicators] = useState<IndicatorDraft[]>([
    { name: "", maxScore: 4 },
  ]);

  const reset = () => {
    setCatId(preSelectedCatId ? String(preSelectedCatId) : "");
    setTopicName("");
    setIndicators([{ name: "", maxScore: 4 }]);
  };

  const addIndicator = () => {
    setIndicators((prev) => [...prev, { name: "", maxScore: 4 }]);
  };

  const updateIndicator = (idx: number, field: keyof IndicatorDraft, value: string | number) => {
    setIndicators((prev) =>
      prev.map((ind, i) => (i === idx ? { ...ind, [field]: value } : ind))
    );
  };

  const removeIndicator = (idx: number) => {
    setIndicators((prev) => prev.filter((_, i) => i !== idx));
  };

  const validIndicators = indicators.filter((ind) => ind.name.trim());
  const canSubmit = catId && topicName.trim() && validIndicators.length > 0;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSave(Number(catId), topicName.trim(), validIndicators);
      reset();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <Button variant={compact ? "ghost" : "default"} size={compact ? "sm" : "default"} className={compact ? "gap-1 text-xs h-7" : "gap-1.5"} onClick={() => setOpen(true)}>
        <Plus className={compact ? "h-3 w-3" : "h-4 w-4"} /> {triggerLabel || "เพิ่มประเด็น/ตัวชี้วัด"}
      </Button>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>เพิ่มประเด็นใหม่</DialogTitle>
        </DialogHeader>

        {/* Frozen top section */}
        <div className="shrink-0 space-y-5 py-2">
          {/* Category Select */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">เลือกหมวด</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกหมวด..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Topic Name */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">ชื่อประเด็น</Label>
            <Input
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="เช่น สภาพแวดล้อม"
              className="text-base py-3"
            />
          </div>

          {/* Indicators label */}
          <Label className="text-base font-semibold block pt-1">ตัวชี้วัด</Label>
        </div>

        {/* Scrollable indicators list */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-1">
          <div className="rounded-xl border bg-card p-4 space-y-3">
            {indicators.map((ind, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Input
                  value={ind.name}
                  onChange={(e) => updateIndicator(idx, "name", e.target.value)}
                  placeholder="ชื่อตัวชี้วัด"
                  className="flex-1 min-w-0"
                />
                <Input
                  type="number"
                  value={ind.maxScore}
                  onChange={(e) => updateIndicator(idx, "maxScore", Number(e.target.value))}
                  min={1}
                  max={10}
                  className="w-14 text-center shrink-0"
                />
                {indicators.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeIndicator(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs mt-1"
              onClick={addIndicator}
            >
              <Plus className="h-3.5 w-3.5" /> เพิ่มตัวชี้วัด
            </Button>
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-2">
          <DialogClose asChild>
            <Button variant="outline">ยกเลิก</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!canSubmit || saving}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
