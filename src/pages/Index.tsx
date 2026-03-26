import { useState, useMemo } from "react";
import { evaluationData as defaultData, Category } from "@/data/evaluationData";
import { CategoryCard, UploadedFile } from "@/components/CategoryCard";
import { ScoreSummary } from "@/components/ScoreSummary";
import { AddCategoryDialog } from "@/components/AddCategoryDialog";
import { ClipboardCheck } from "lucide-react";

const defaultIds = new Set(defaultData.map((c) => c.id));

const Index = () => {
  const [categories, setCategories] = useState<Category[]>(defaultData);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile[]>>({});

  const handleFilesChange = (indicatorId: string, files: UploadedFile[]) => {
    setUploadedFiles((prev) => ({ ...prev, [indicatorId]: files }));
  };

  const handleScoreChange = (indicatorId: string, score: number) => {
    setScores((prev) => ({ ...prev, [indicatorId]: score }));
  };

  const handleAddCategory = (category: Category) => {
    setCategories((prev) => [...prev, category]);
  };

  const handleDeleteCategory = (id: number) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const totalTopics = categories.reduce((s, c) => s + c.topics.length, 0);
  const totalIndicators = categories.reduce(
    (s, c) => s + c.topics.reduce((ts, t) => ts + t.indicators.length, 0),
    0
  );

  const summaryData = useMemo(() => {
    return categories.map((cat, idx) => {
      let totalScore = 0;
      let totalMax = 0;
      cat.topics.forEach((topic) => {
        topic.indicators.forEach((ind) => {
          totalScore += scores[ind.id] || 0;
          totalMax += ind.maxScore;
        });
      });
      return { id: cat.id, name: cat.name, score: totalScore, maxScore: cat.maxScore, totalPossible: totalMax, index: idx };
    });
  }, [scores, categories]);

  const grandTotal = summaryData.reduce((s, c) => s + c.score, 0);
  const grandMax = summaryData.reduce((s, c) => s + c.totalPossible, 0);
  const nextId = categories.length > 0 ? Math.max(...categories.map((c) => c.id)) + 1 : 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">ระบบประเมินผล</h1>
            <p className="text-xs text-muted-foreground">
              {categories.length} หมวด · {totalTopics} ประเด็น · {totalIndicators} ตัวชี้วัด
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <AddCategoryDialog nextSortOrder={nextId} onAdd={(data) => handleAddCategory({ id: nextId, name: data.name, maxScore: data.maxScore, topics: [] })} />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">คะแนนรวม</p>
              <p className="text-2xl font-bold text-primary">
                {grandTotal}<span className="text-sm font-normal text-muted-foreground">/{grandMax}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <ScoreSummary data={summaryData} showOnlyWithScore={true} />
        {categories.map((category, idx) => (
          <CategoryCard
            key={category.id}
            category={category}
            colorIndex={idx}
            scores={scores}
            onScoreChange={handleScoreChange}
            onDelete={!defaultIds.has(category.id) ? () => handleDeleteCategory(category.id) : undefined}
            uploadedFiles={uploadedFiles}
            onFilesChange={handleFilesChange}
          />
        ))}
      </main>
    </div>
  );
};

export default Index;
