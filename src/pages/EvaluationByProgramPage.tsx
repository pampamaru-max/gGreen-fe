import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Category } from "@/data/evaluationData";
import type { UploadedFile, IndicatorNavItem } from "@/components/CategoryCard";
import { CategoryCard, IndicatorDialog, getCategoryColor } from "@/components/CategoryCard";
import { ScoreSummary } from "@/components/ScoreSummary";
import { ClipboardCheck, Loader2, ArrowLeft } from "lucide-react";
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";

const EvaluationByProgramPage = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const evaluateeId = new URLSearchParams(location.search).get("evaluateeId");
  const { isAdmin, role, accessibleProgramIds, loading: roleLoading } = useUserRole();

  const [programName, setProgramName] = useState("");
  const [scoreView, setScoreView] = useState<"self" | "committee">(role !== "user" ? "committee" : "self");
  const [categories, setCategories] = useState<Category[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile[]>>({});
  const [implementationDetails, setImplementationDetails] = useState<Record<string, string>>({});
  const [committeeScores, setCommitteeScores] = useState<Record<string, number>>({});
  const [committeeComments, setCommitteeComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);

  // Check access
  useEffect(() => {
    if (roleLoading || !programId) return;
    if (!isAdmin && !accessibleProgramIds.includes(programId)) {
      toast.error("คุณไม่มีสิทธิ์เข้าถึงโครงการนี้");
      navigate("/evaluation");
    }
  }, [roleLoading, isAdmin, accessibleProgramIds, programId, navigate]);

  useEffect(() => {
    if (!programId || roleLoading) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch program name
      const { data: prog } = await apiClient.get(`programs/${programId}`);
      setProgramName(prog?.name || "");

      const [catRes, topicRes, indRes] = await Promise.all([
        apiClient.get(`categories?programId=${programId}`),
        apiClient.get(`topics`),
        apiClient.get(`indicators`),
      ]);

      const catData = catRes.data || [];
      const topicData = topicRes.data || [];
      const indData = indRes.data || [];

      if (catData && topicData && indData) {
        const cats: Category[] = catData.map((c: any) => {
          const topics = topicData
            .filter((t: any) => t.categoryId === c.id)
            .map((t: any) => ({
              id: t.id,
              name: t.name,
              indicators: indData
                .filter((i: any) => i.topicId === t.id)
                .map((i: any) => ({
                  id: i.id,
                  name: i.name,
                  maxScore: i.maxScore,
                  description: i.description || "",
                  detail: i.detail || "",
                  notes: i.notes || "",
                  evidenceDescription: i.evidenceDescription || "",
                  scoringCriteria: Array.isArray(i.scoringCriteria)
                    ? (i.scoringCriteria as { score: number; label: string }[])
                    : [],
                })),
            }));
          return { id: c.id, name: c.name, maxScore: c.maxScore, topics };
        });
        setCategories(cats);

        // Load latest draft evaluation for this program
        const { data: evalData } = await apiClient.get(`evaluation/program/${programId}${evaluateeId ? `?evaluateeId=${evaluateeId}` : ""}`);

        if (evalData) {
          setEvaluationId(evalData.id);
          const scoresData = evalData.evaluationScores || [];
          
          const loaded: Record<string, number> = {};
          const loadedDetails: Record<string, string> = {};
          const loadedCommittee: Record<string, number> = {};
          const loadedComments: Record<string, string> = {};
          
          scoresData.forEach((s: any) => {
            loaded[s.indicatorId] = Number(s.score);
            if (s.notes) loadedDetails[s.indicatorId] = s.notes;
            if (s.committeeScore) loadedCommittee[s.indicatorId] = Number(s.committeeScore);
            if (s.evidenceUrl) loadedComments[s.indicatorId] = s.evidenceUrl;
          });
          
          setScores(loaded);
          setImplementationDetails(loadedDetails);
          setCommitteeScores(loadedCommittee);
          setCommitteeComments(loadedComments);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [programId, roleLoading]);

  const handleScoreChange = (indicatorId: string, score: number) => {
    setScores((prev) => ({ ...prev, [indicatorId]: score }));
  };

  const handleFilesChange = (indicatorId: string, files: UploadedFile[]) => {
    setUploadedFiles((prev) => ({ ...prev, [indicatorId]: files }));
  };

  const handleImplementationDetailChange = (indicatorId: string, value: string) => {
    setImplementationDetails((prev) => ({ ...prev, [indicatorId]: value }));
  };

  const handleCommitteeScoreChange = (indicatorId: string, score: number) => {
    setCommitteeScores((prev) => ({ ...prev, [indicatorId]: score }));
  };

  const handleCommitteeCommentChange = (indicatorId: string, value: string) => {
    setCommitteeComments((prev) => ({ ...prev, [indicatorId]: value }));
  };

  const handleSaveIndicator = useCallback(async (indicatorId: string) => {
    const score = scores[indicatorId] || 0;
    const detail = implementationDetails[indicatorId] || "";
    const cScore = committeeScores[indicatorId] || 0;
    const cComment = committeeComments[indicatorId] || "";

    const { data } = await apiClient.post("evaluation/score", {
      evaluationId,
      indicatorId,
      score,
      notes: detail,
      committeeScore: cScore,
      committeeComment: cComment,
      programId,
      programName,
      evaluateeId,
    });

    if (data.evaluationId && !evaluationId) {
      setEvaluationId(data.evaluationId);
    }

    toast.success("บันทึกเรียบร้อยแล้ว");
  }, [evaluationId, scores, uploadedFiles, implementationDetails, committeeScores, committeeComments, programId, programName]);

  const totalTopics = categories.reduce((s, c) => s + c.topics.length, 0);
  const totalIndicators = categories.reduce(
    (s, c) => s + c.topics.reduce((ts, t) => ts + t.indicators.length, 0), 0
  );

  const summaryData = useMemo(() => {
    return categories.map((cat) => {
      let totalScore = 0;
      let totalMax = 0;
      cat.topics.forEach((topic) => {
        topic.indicators.forEach((ind) => {
          totalScore += scores[ind.id] || 0;
          totalMax += ind.maxScore;
        });
      });
      return { id: cat.id, name: cat.name, score: totalScore, maxScore: cat.maxScore, totalPossible: totalMax };
    });
  }, [scores, categories]);

  const committeeSummaryData = useMemo(() => {
    if (role === "user") return undefined;
    return categories.map((cat) => {
      let totalScore = 0;
      let totalMax = 0;
      cat.topics.forEach((topic) => {
        topic.indicators.forEach((ind) => {
          totalScore += committeeScores[ind.id] || 0;
          totalMax += ind.maxScore;
        });
      });
      return { id: cat.id, name: cat.name, score: totalScore, maxScore: cat.maxScore, totalPossible: totalMax };
    });
  }, [committeeScores, categories]);

  const grandTotal = (scoreView === "committee" && committeeSummaryData ? committeeSummaryData : summaryData).reduce((s, c) => s + c.score, 0);
  const grandMax = summaryData.reduce((s, c) => s + c.totalPossible, 0);

  // ── Wizard ──────────────────────────────────────────────────────────────────
  const flatIndicators = useMemo(() => {
    const items: Array<{ indicator: Category["topics"][0]["indicators"][0]; colorIndex: number }> = [];
    categories.forEach((cat, catIdx) => {
      cat.topics.forEach((topic) => {
        topic.indicators.forEach((indicator) => {
          items.push({ indicator, colorIndex: catIdx });
        });
      });
    });
    return items;
  }, [categories]);

  const [wizardIndex, setWizardIndex] = useState<number | null>(null);
  const wizardItem = wizardIndex !== null ? flatIndicators[wizardIndex] : null;

  const handleOpenWizard = useCallback((indicator: Category["topics"][0]["indicators"][0]) => {
    const idx = flatIndicators.findIndex((item) => item.indicator.id === indicator.id);
    if (idx !== -1) setWizardIndex(idx);
  }, [flatIndicators]);

  const navItems: IndicatorNavItem[] = useMemo(() =>
    flatIndicators.map(({ indicator, colorIndex }) => ({
      id: indicator.id,
      name: indicator.name,
      // ใช้ self score เพื่อแสดงสีว่า "item นี้ evaluatee กรอกแล้ว"
      // committee score ใช้แสดงค่า แต่ self score ใช้เป็น color indicator
      score: (scores[indicator.id] ?? 0) || (committeeScores[indicator.id] ?? 0),
      maxScore: indicator.maxScore,
      color: getCategoryColor(colorIndex),
    })),
  [flatIndicators, scores, committeeScores]);

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/evaluation")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">ประเมิน {programName}</h2>
            <p className="text-xs text-muted-foreground">
              {categories.length} หมวด · {totalTopics} ประเด็น · {totalIndicators} ตัวชี้วัด · คะแนนเต็ม {grandMax}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">คะแนนรวม</p>
            <p className="text-2xl font-bold text-primary">
              {grandTotal}<span className="text-sm font-normal text-muted-foreground">/{grandMax}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <ScoreSummary
          data={summaryData}
          committeeData={committeeSummaryData}
          view={scoreView}
          onViewChange={setScoreView}
        />
        {categories.map((category, idx) => (
          <CategoryCard
            key={category.id}
            category={category}
            colorIndex={idx}
            scores={scores}
            onScoreChange={handleScoreChange}
            uploadedFiles={uploadedFiles}
            onFilesChange={handleFilesChange}
            onSave={handleSaveIndicator}
            implementationDetails={implementationDetails}
            onImplementationDetailChange={handleImplementationDetailChange}
            committeeScores={committeeScores}
            onCommitteeScoreChange={handleCommitteeScoreChange}
            committeeComments={committeeComments}
            onCommitteeCommentChange={handleCommitteeCommentChange}
            userRole={role}
            scoreView={scoreView}
            onIndicatorClick={handleOpenWizard}
          />
        ))}
      </div>

      {wizardItem && (
        <IndicatorDialog
          indicator={wizardItem.indicator}
          score={scores[wizardItem.indicator.id] ?? 0}
          onScoreChange={(v) => handleScoreChange(wizardItem.indicator.id, v)}
          color={getCategoryColor(wizardItem.colorIndex)}
          files={uploadedFiles[wizardItem.indicator.id] ?? []}
          onFilesChange={(f) => handleFilesChange(wizardItem.indicator.id, f)}
          open={wizardIndex !== null}
          onOpenChange={(open) => { if (!open) setWizardIndex(null); }}
          onSave={() => handleSaveIndicator(wizardItem.indicator.id)}
          implementationDetail={implementationDetails[wizardItem.indicator.id] ?? ""}
          onImplementationDetailChange={(v) => handleImplementationDetailChange(wizardItem.indicator.id, v)}
          committeeScore={committeeScores[wizardItem.indicator.id] ?? 0}
          onCommitteeScoreChange={(v) => handleCommitteeScoreChange(wizardItem.indicator.id, v)}
          committeeComment={committeeComments[wizardItem.indicator.id] ?? ""}
          onCommitteeCommentChange={(v) => handleCommitteeCommentChange(wizardItem.indicator.id, v)}
          userRole={role}
          hasPrev={wizardIndex! > 0}
          hasNext={wizardIndex! < flatIndicators.length - 1}
          onPrev={() => setWizardIndex((i) => (i !== null ? i - 1 : i))}
          onNext={() => setWizardIndex((i) => (i !== null ? i + 1 : i))}
          progressLabel={`${wizardIndex! + 1} / ${flatIndicators.length}`}
          navItems={navItems}
          currentNavIndex={wizardIndex ?? undefined}
          onJumpTo={(idx) => setWizardIndex(idx)}
        />
      )}
    </div>
  );
};

export default EvaluationByProgramPage;
