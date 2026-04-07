import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";

export type DbScoreType = "score" | "upgrade" | "yes_no" | "score_new" | "yes_no_new" | "score_upgrad" | "yes_no_upgrad" | "score_renew" | "yes_no_renew";

interface EditCategoryData {
  id: number;
  name: string;
  maxScore: number;
  sortOrder: number;
  scoreType: DbScoreType;
}

interface Props {
  category: EditCategoryData;
  onSave: (updated: EditCategoryData) => void;
}

const getGroup = (scoreType: DbScoreType): "new" | "upgrad" | "renew" => {
  if (scoreType === "score_upgrad" || scoreType === "yes_no_upgrad" || scoreType === "upgrade") return "upgrad";
  if (scoreType === "score_renew" || scoreType === "yes_no_renew") return "renew";
  return "new";
};

export function EditCategoryDialog({ category, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [maxScore, setMaxScore] = useState<string>(category.maxScore.toString());
  const [sortOrder, setSortOrder] = useState<string>(category.sortOrder.toString());
  const [isYesNo, setIsYesNo] = useState(category.scoreType.startsWith("yes_no"));

  const reset = () => {
    setName(category.name);
    setMaxScore(category.maxScore.toString());
    setSortOrder(category.sortOrder.toString());
    setIsYesNo(category.scoreType.startsWith("yes_no"));
  };

  const isValid = name.trim() && Number(sortOrder) >= 1 && (isYesNo || Number(maxScore) > 0);

  const handleSubmit = () => {
    if (!isValid) return;
    const group = getGroup(category.scoreType);
    const newScoreType: DbScoreType = isYesNo ? `yes_no_${group}` : `score_${group}`;
    onSave({
      id: category.id,
      name: name.trim(),
      maxScore: isYesNo ? 0 : Number(maxScore),
      sortOrder: Number(sortOrder),
      scoreType: newScoreType,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) reset(); }}>
      <Button
        variant="ghost"
        size="icon"
        className="edit-button"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>แก้ไขหมวด</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>ลำดับหมวด</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} min={1} />
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อหมวด</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">ใช่/ไม่ใช่ (ไม่คิดคะแนน)</p>
              <p className="text-xs text-muted-foreground">หมวดนี้จะใช้ตอบ ใช่/ไม่ใช่ แทนการให้คะแนน</p>
            </div>
            <Switch checked={isYesNo} onCheckedChange={setIsYesNo} />
          </div>
          {!isYesNo && (
            <div className="space-y-1.5">
              <Label>คะแนนเต็มหมวด</Label>
              <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} min={1} />
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">ยกเลิก</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!isValid}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
