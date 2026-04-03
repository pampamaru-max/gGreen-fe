import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";

export type AddScoreType =
  | "score_new" | "yes_no_new"
  | "score_upgrad" | "yes_no_upgrad"
  | "score_renew" | "yes_no_renew";

interface AddCategoryData {
  name: string;
  maxScore: number;
  sortOrder: number;
  scoreType: AddScoreType;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scoreType: AddScoreType;
  nextSortOrder: number;
  onAdd: (data: AddCategoryData) => void;
}

const LABELS: Record<AddScoreType, { title: string; badge: string; badgeClass: string }> = {
  "score_new":    { title: "เพิ่มหมวดแบบคะแนน",               badge: "คะแนน",             badgeClass: "border-blue-300 text-blue-600 bg-blue-50" },
  "yes_no_new":   { title: "เพิ่มหมวดแบบใช่/ไม่ใช่",           badge: "ใช่/ไม่ใช่",        badgeClass: "border-orange-300 text-orange-600 bg-orange-50" },
  "score_upgrad": { title: "เพิ่มหมวดแบบคะแนน (อัพเกรด)",     badge: "ปรับเกณฑ์",         badgeClass: "border-purple-300 text-purple-600 bg-purple-50" },
  "yes_no_upgrad":{ title: "เพิ่มหมวดแบบใช่/ไม่ใช่ (อัพเกรด)", badge: "ใช่/ไม่ใช่ (อัพ)",  badgeClass: "border-teal-300 text-teal-600 bg-teal-50" },
  "score_renew":  { title: "เพิ่มหมวดแบบคะแนน (ต่ออายุ)",      badge: "ต่ออายุ",            badgeClass: "border-emerald-300 text-emerald-600 bg-emerald-50" },
  "yes_no_renew": { title: "เพิ่มหมวดแบบใช่/ไม่ใช่ (ต่ออายุ)", badge: "ใช่/ไม่ใช่ (ต่ออายุ)", badgeClass: "border-amber-300 text-amber-600 bg-amber-50" },
};

export function AddCategoryDialog({ open, onOpenChange, scoreType, nextSortOrder, onAdd }: Props) {
  const [sortOrder, setSortOrder] = useState<string>(nextSortOrder.toString());
  const [name, setName] = useState("");
  const [maxScore, setMaxScore] = useState<string>("15");

  useEffect(() => {
    if (open) {
      setSortOrder(nextSortOrder.toString());
      setName("");
      setMaxScore("15");
    }
  }, [open, nextSortOrder]);

  const hasScore = !scoreType.startsWith("yes_no");
  const isValid = name.trim() && Number(sortOrder) >= 1 && (!hasScore || Number(maxScore) > 0);

  const handleSubmit = () => {
    if (!isValid) return;
    onAdd({
      name: name.trim(),
      maxScore: hasScore ? Number(maxScore) : 0,
      sortOrder: Number(sortOrder),
      scoreType,
    });
    onOpenChange(false);
  };

  const { title, badge, badgeClass } = LABELS[scoreType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <Badge variant="outline" className={`text-xs ${badgeClass}`}>{badge}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>ลำดับหมวด</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} min={1} />
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อหมวด</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สภาพแวดล้อม" />
          </div>
          {hasScore && (
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
          <Button onClick={handleSubmit} disabled={!isValid}>เพิ่มหมวด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
