import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface AddCategoryData {
  name: string;
  maxScore: number;
  sortOrder: number;
}

interface Props {
  nextSortOrder: number;
  onAdd: (data: AddCategoryData) => void;
}

export function AddCategoryDialog({ nextSortOrder, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<string>(nextSortOrder.toString());
  const [name, setName] = useState("");
  const [maxScore, setMaxScore] = useState<string>("15");

  const reset = () => {
    setSortOrder(nextSortOrder.toString());
    setName("");
    setMaxScore("15");
  };

  const isValid = name.trim() && Number(maxScore) > 0 && Number(sortOrder) >= 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onAdd({ name: name.trim(), maxScore: Number(maxScore), sortOrder: Number(sortOrder) });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          เพิ่มหมวด
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่มหมวดใหม่</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>ลำดับหมวด</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อหมวด</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สภาพแวดล้อม"
            />
          </div>
          <div className="space-y-1.5">
            <Label>คะแนนเต็มหมวด</Label>
            <Input
              type="number"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              min={1}
            />
          </div>
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
