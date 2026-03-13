import { useState, useEffect } from "react";
import { AddCategoryDialog } from "@/components/AddCategoryDialog";
import { EditCategoryDialog } from "@/components/EditCategoryDialog";
import { getCategoryColor } from "@/components/CategoryCard";
import { Trash2, FolderTree, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface DbCategory {
  id: number;
  name: string;
  max_score: number;
  sort_order: number;
  is_default: boolean;
}

interface CategoryItemProps {
  cat: DbCategory;
  idx: number;
  topicCount: number;
  indicatorCount: number;
  onEdit: (updated: DbCategory) => void;
  onDelete: (id: number) => void;
}

const CategoryItem = ({ cat, idx, topicCount, indicatorCount, onEdit, onDelete }: CategoryItemProps) => {
  const color = getCategoryColor(idx);

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{cat.name}</p>
        <p className="text-xs text-muted-foreground">
          ลำดับที่ {cat.sort_order} · {topicCount} ประเด็น · {indicatorCount} ตัวชี้วัด · คะแนนเต็ม {cat.max_score}
        </p>
      </div>
      <EditCategoryDialog
        category={{ id: cat.id, name: cat.name, maxScore: cat.max_score, sortOrder: cat.sort_order }}
        onSave={(updated) => onEdit({ ...cat, name: updated.name, max_score: updated.maxScore, sort_order: updated.sortOrder })}
      />
      {topicCount > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground opacity-40 cursor-not-allowed"
                disabled
              >
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
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
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

const SettingsCategories = () => {
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [topicCounts, setTopicCounts] = useState<Record<number, number>>({});
  const [indicatorCounts, setIndicatorCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);


  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");

    if (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
      return;
    }
    setCategories(data || []);

    // Fetch topic and indicator counts
    const { data: topics } = await supabase.from("topics").select("id, category_id");
    const { data: indicators } = await supabase.from("indicators").select("id, topic_id");

    const tCounts: Record<number, number> = {};
    const iCounts: Record<number, number> = {};
    const topicToCat: Record<string, number> = {};

    (topics || []).forEach((t: any) => {
      tCounts[t.category_id] = (tCounts[t.category_id] || 0) + 1;
      topicToCat[t.id] = t.category_id;
    });

    (indicators || []).forEach((ind: any) => {
      const catId = topicToCat[ind.topic_id];
      if (catId) iCounts[catId] = (iCounts[catId] || 0) + 1;
    });

    setTopicCounts(tCounts);
    setIndicatorCounts(iCounts);
  };

  useEffect(() => {
    fetchCategories().finally(() => setLoading(false));
  }, []);

  const handleAddCategory = async (data: { name: string; maxScore: number; sortOrder: number }) => {
    const { error } = await supabase.from("categories").insert({
      name: data.name,
      max_score: data.maxScore,
      sort_order: data.sortOrder,
      is_default: false,
    });

    if (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "เพิ่มหมวดสำเร็จ" });
    fetchCategories();
  };

  const handleDeleteCategory = async (id: number) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "ลบหมวดสำเร็จ" });
    fetchCategories();
  };

  const handleEditCategory = async (updated: DbCategory) => {
    const { error } = await supabase
      .from("categories")
      .update({ name: updated.name, max_score: updated.max_score, sort_order: updated.sort_order })
      .eq("id", updated.id);

    if (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "แก้ไขหมวดสำเร็จ" });
    fetchCategories();
  };


  const nextSortOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 1;

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
            <p className="text-xs text-muted-foreground">เพิ่ม ลบ หรือแก้ไขหมวดเกณฑ์การประเมิน</p>
          </div>
          <AddCategoryDialog nextSortOrder={nextSortOrder} onAdd={handleAddCategory} />
        </div>
      </div>

      <div className="px-6 pt-4">
        {(() => {
          const totalMax = categories.reduce((sum, c) => sum + c.max_score, 0);
          const isUnder = totalMax < 100;
          const isExact = totalMax === 100;
          const colorClass = isUnder
            ? "border-yellow-400 bg-yellow-50 text-yellow-700"
            : isExact
              ? "border-green-400 bg-green-50 text-green-700"
              : "border-red-400 bg-red-50 text-red-700";
          const label = isUnder ? "ยังไม่ครบ 100 คะแนน" : isExact ? "ครบ 100 คะแนนพอดี ✓" : "เกิน 100 คะแนน ⚠";
          return (
            <div className={`flex items-center justify-between rounded-xl border-2 px-5 py-3 ${colorClass}`}>
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xl font-bold tabular-nums">{totalMax} <span className="text-sm font-normal opacity-70">/ 100</span></span>
            </div>
          );
        })()}
      </div>

      <div className="px-6 py-4 space-y-3">
        {categories.map((cat, idx) => (
          <CategoryItem
            key={cat.id}
            cat={cat}
            idx={idx}
            topicCount={topicCounts[cat.id] || 0}
            indicatorCount={indicatorCounts[cat.id] || 0}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
          />
        ))}
      </div>
    </div>
  );
};

export default SettingsCategories;
