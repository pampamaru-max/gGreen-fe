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
import { Pencil } from "lucide-react";

interface EditCategoryData {
  id: number;
  name: string;
  maxScore: number;
  sortOrder: number;
}

interface Props {
  category: EditCategoryData;
  onSave: (updated: EditCategoryData) => void;
}

export function EditCategoryDialog({ category, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [maxScore, setMaxScore] = useState<string>(category.maxScore.toString());
  const [sortOrder, setSortOrder] = useState<string>(category.sortOrder.toString());

  const reset = () => {
    setName(category.name);
    setMaxScore(category.maxScore.toString());
    setSortOrder(category.sortOrder.toString());
  };

  const isValid = name.trim() && Number(maxScore) > 0 && Number(sortOrder) >= 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onSave({ id: category.id, name: name.trim(), maxScore: Number(maxScore), sortOrder: Number(sortOrder) });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) reset(); }}>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
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
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} min={0} />
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อหมวด</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>คะแนนเต็มหมวด</Label>
            <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} min={1} />
          </div>
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
