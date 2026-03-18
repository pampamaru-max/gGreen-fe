import { useState, useEffect } from "react";
import { AddCategoryDialog } from "@/components/AddCategoryDialog";
import { EditCategoryDialog } from "@/components/EditCategoryDialog";
import { Trash2, FolderTree, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/axios";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DbCategory {
  id: number;
  name: string;
  maxScore: number;
  sortOrder: number;
  isDefault: boolean;
  programId: string | null;
}

interface DbProgram {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

interface CategoryItemProps {
  cat: DbCategory;
  topicCount: number;
  indicatorCount: number;
  onEdit: (updated: DbCategory) => void;
  onDelete: (id: number) => void;
}

const CategoryItem = ({ cat, topicCount, indicatorCount, onEdit, onDelete }: CategoryItemProps) => {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{cat.name}</p>
        <p className="text-xs text-muted-foreground">
          ลำดับที่ {cat.sortOrder} · {topicCount} ประเด็น · {indicatorCount} ตัวชี้วัด · คะแนนเต็ม {cat.maxScore}
        </p>
      </div>
      <EditCategoryDialog
        category={{ id: cat.id, name: cat.name, maxScore: cat.maxScore, sortOrder: cat.sortOrder }}
        onSave={(updated) => onEdit({ ...cat, name: updated.name, maxScore: updated.maxScore, sortOrder: updated.sortOrder })}
      />
      {topicCount > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground opacity-40 cursor-not-allowed h-8 w-8" disabled>
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>ไม่สามารถลบได้ เนื่องจากมี {topicCount} ประเด็นอยู่ในหมวดนี้</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการลบหมวด</AlertDialogTitle>
              <AlertDialogDescription>
                คุณต้องการลบหมวด "{cat.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDelete(cat.id)}
              >
                ลบ
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

interface ProgramCardProps {
  program: DbProgram;
  categories: DbCategory[];
  topicCounts: Record<number, number>;
  indicatorCounts: Record<number, number>;
  onAddCategory: (data: { name: string; maxScore: number; sortOrder: number }, programId: string) => void;
  onEditCategory: (updated: DbCategory) => void;
  onDeleteCategory: (id: number) => void;
}

const ProgramCard = ({ program, categories, topicCounts, indicatorCounts, onAddCategory, onEditCategory, onDeleteCategory }: ProgramCardProps) => {
  const [open, setOpen] = useState(false);
  const totalMax = categories.reduce((sum, c) => sum + c.maxScore, 0);
  const nextSortOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder)) + 1 : 1;

  const isUnder = totalMax < 100;
  const isExact = totalMax === 100;
  const statusColor = isUnder
    ? "text-yellow-600 bg-yellow-50 border-yellow-200"
    : isExact
      ? "text-green-600 bg-green-50 border-green-200"
      : "text-red-600 bg-red-50 border-red-200";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-accent/30 bg-accent/10 shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors">
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground">{program.name}</p>
              <p className="text-xs text-muted-foreground">{categories.length} หมวด</p>
            </div>
            <div className={`rounded-lg border px-3 py-1 text-xs font-semibold ${statusColor}`}>
              {totalMax} / 100
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 py-3 space-y-2">
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีหมวดในโครงการนี้</p>
            )}
            {categories.map((cat) => (
              <CategoryItem
                key={cat.id}
                cat={cat}
                topicCount={topicCounts[cat.id] || 0}
                indicatorCount={indicatorCounts[cat.id] || 0}
                onEdit={onEditCategory}
                onDelete={onDeleteCategory}
              />
            ))}
            <div className="pt-1">
              <AddCategoryDialog
                nextSortOrder={nextSortOrder}
                onAdd={(data) => onAddCategory(data, program.id)}
              />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const SettingsCategories = () => {
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [programs, setPrograms] = useState<DbProgram[]>([]);
  const [topicCounts, setTopicCounts] = useState<Record<number, number>>({});
  const [indicatorCounts, setIndicatorCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [catRes, progRes, topicRes, indRes] = await Promise.all([
        apiClient.get<DbCategory[]>("categories"),
        apiClient.get<DbProgram[]>("programs/names-with-sort"),
        apiClient.get<any[]>("topics"),
        apiClient.get<any[]>("indicators"),
      ]);

      setCategories(catRes.data);
      setPrograms(progRes.data);

      const tCounts: Record<number, number> = {};
      const iCounts: Record<number, number> = {};
      const topicToCat: Record<string, number> = {};

      topicRes.data.forEach((t) => {
        tCounts[t.categoryId] = (tCounts[t.categoryId] || 0) + 1;
        topicToCat[t.id] = t.categoryId;
      });

      indRes.data.forEach((ind) => {
        const catId = topicToCat[ind.topicId];
        if (catId) iCounts[catId] = (iCounts[catId] || 0) + 1;
      });

      setTopicCounts(tCounts);
      setIndicatorCounts(iCounts);
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  const handleAddCategory = async (data: { name: string; maxScore: number; sortOrder: number }, programId: string) => {
    try {
      await apiClient.post("categories", {
        name: data.name,
        maxScore: data.maxScore,
        sortOrder: data.sortOrder,
        isDefault: false,
        programId,
      });
      toast({ title: "เพิ่มหมวดสำเร็จ" });
      fetchData();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await apiClient.delete(`categories/${id}`);
      toast({ title: "ลบหมวดสำเร็จ" });
      fetchData();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
    }
  };

  const handleEditCategory = async (updated: DbCategory) => {
    try {
      await apiClient.patch(`categories/${updated.id}`, {
        name: updated.name,
        maxScore: updated.maxScore,
        sortOrder: updated.sortOrder,
      });
      toast({ title: "แก้ไขหมวดสำเร็จ" });
      fetchData();
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.response?.data?.message ?? err.message, variant: "destructive" });
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
    <div className="min-h-full bg-background">
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <FolderTree className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">จัดการหมวด</h2>
            <p className="text-xs text-muted-foreground">เพิ่ม ลบ หรือแก้ไขหมวดเกณฑ์การประเมินตามโครงการ</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {programs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">ยังไม่มีโครงการ กรุณาเพิ่มโครงการก่อน</p>
        )}
        {programs.map((program) => {
          const programCategories = categories
            .filter((c) => c.programId === program.id)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          return (
            <ProgramCard
              key={program.id}
              program={program}
              categories={programCategories}
              topicCounts={topicCounts}
              indicatorCounts={indicatorCounts}
              onAddCategory={handleAddCategory}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          );
        })}

        {/* Show unassigned categories if any */}
        {categories.some((c) => !c.programId) && (
          <div className="rounded-xl border border-dashed bg-muted/30 p-4 space-y-2">
            <p className="font-semibold text-sm text-muted-foreground">หมวดที่ยังไม่ได้ผูกกับโครงการ</p>
            {categories.filter((c) => !c.programId).map((cat) => (
              <CategoryItem
                key={cat.id}
                cat={cat}
                topicCount={topicCounts[cat.id] || 0}
                indicatorCount={indicatorCounts[cat.id] || 0}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsCategories;
