import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Category } from "@/data/evaluationData";
import type { UploadedFile, IndicatorNavItem } from "@/components/evaluation/CategoryCard";
import { CategoryCard, IndicatorDialog, getCategoryColor } from "@/components/evaluation/CategoryCard";
import { ScoreSummary } from "@/components/evaluation/ScoreSummary";
import { ClipboardCheck, Loader2, ArrowLeft, RotateCcw, CheckCircle2, Clock, FileText, AlertCircle, XCircle } from "lucide-react";
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";

const EvaluationByProgramPage = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const evaluationIdParam = new URLSearchParams(location.search).get("evaluationId");
  const [evaluateeId, setEvaluateeId] = useState<string | null>(null);
  const { isAdmin, role, accessibleProgramIds, loading: roleLoading } = useUserRole();

  const [programName, setProgramName] = useState("");
  const scoreView = role !== "user" ? "committee" : "self";
  const [categories, setCategories] = useState<Category[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile[]>>({});
  const [implementationDetails, setImplementationDetails] = useState<Record<string, string>>({});
  const [committeeScores, setCommitteeScores] = useState<Record<string, number>>({});
  const [committeeComments, setCommitteeComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState<string | null>(null);

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
      try {
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

        // Load evaluation by id
        const { data: evalData } = await apiClient.get(`evaluation/${evaluationIdParam}`);
        if (evalData?.userId) setEvaluateeId(evalData.userId);

        if (evalData) {
          setEvaluationId(evalData.id);
          setEvaluationStatus(evalData.status);
          const scoresData = evalData.evaluationScores || [];

          const loaded: Record<string, number> = {};
          const loadedDetails: Record<string, string> = {};
          const loadedCommittee: Record<string, number> = {};
          const loadedComments: Record<string, string> = {};

          scoresData.forEach((s: any) => {
            loaded[s.indicatorId] = Number(s.score);
            if (s.notes) loadedDetails[s.indicatorId] = s.notes;
            if (s.committeeScore !== null && s.committeeScore !== undefined) loadedCommittee[s.indicatorId] = Number(s.committeeScore);
            if (s.evidenceUrl) loadedComments[s.indicatorId] = s.evidenceUrl;
          });

          setScores(loaded);
          setImplementationDetails(loadedDetails);
          setCommitteeScores(loadedCommittee);
          setCommitteeComments(loadedComments);
        }
      }
      } catch (err) {
        console.error("fetchData error:", err);
        toast.error("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [programId, roleLoading, evaluationIdParam]);

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
    const cScore = committeeScores[indicatorId] ?? 0;
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

  const committeeSummaryData = useMemo(() => {
    if (role === "user") return undefined;
    return categories.map((cat) => {
      let totalScore = 0;
      let totalMax = 0;
      cat.topics.forEach((topic) => {
        topic.indicators.forEach((ind) => {
          totalScore += committeeScores[ind.id] ?? 0;
          totalMax += ind.maxScore;
        });
      });
      return { id: cat.id, name: cat.name, score: totalScore, maxScore: cat.maxScore, totalPossible: totalMax };
    });
  }, [committeeScores, categories]);

  const grandSelfTotal = summaryData.reduce((s, c) => s + c.score, 0);
  const grandCommitteeTotal = committeeSummaryData?.reduce((s, c) => s + c.score, 0) ?? 0;
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
      score: (scores[indicator.id] ?? 0) || (committeeScores[indicator.id] ?? 0),
      maxScore: indicator.maxScore,
      color: getCategoryColor(colorIndex),
      isScored: role !== "user"
        ? committeeScores[indicator.id] !== undefined
        : (scores[indicator.id] ?? 0) > 0,
    })),
  [flatIndicators, scores, committeeScores, role]);

  const isCompleted = evaluationStatus === "completed" || evaluationStatus === "complete";
  const isSubmitted = evaluationStatus === "submitted" || evaluationStatus === "submit";

  const statusConfig: Record<string, { label: string; icon: React.ReactNode; badge: string; banner?: string }> = {
    draft:     { label: "ร่าง",             icon: <FileText className="h-3.5 w-3.5" />,    badge: "bg-gray-100 text-gray-600 border-gray-300" },
    submit:    { label: "รอผู้ประเมิน",     icon: <Clock className="h-3.5 w-3.5" />,        badge: "bg-blue-100 text-blue-700 border-blue-300" },
    submitted: { label: "รอผู้ประเมิน",     icon: <Clock className="h-3.5 w-3.5" />,        badge: "bg-blue-100 text-blue-700 border-blue-300" },
    complete:  { label: "ประเมินเสร็จสิ้น", icon: <CheckCircle2 className="h-3.5 w-3.5" />, badge: "bg-green-100 text-green-700 border-green-300" },
    completed: { label: "ประเมินเสร็จสิ้น", icon: <CheckCircle2 className="h-3.5 w-3.5" />, badge: "bg-green-100 text-green-700 border-green-300" },
    revision:  { label: "ส่งกลับแก้ไข",    icon: <AlertCircle className="h-3.5 w-3.5" />,  badge: "bg-amber-100 text-amber-700 border-amber-300", banner: "bg-amber-50 border-amber-300 text-amber-800" },
    cancel:    { label: "ยกเลิก",           icon: <XCircle className="h-3.5 w-3.5" />,      badge: "bg-red-100 text-red-700 border-red-300",    banner: "bg-red-50 border-red-300 text-red-800" },
  };
  const currentStatus = evaluationStatus ? statusConfig[evaluationStatus] : null;

  const allCommitteeScored = useMemo(() => {
    if (role === "user") return true;
    return flatIndicators.every(({ indicator }) => committeeScores[indicator.id] !== undefined);
  }, [flatIndicators, committeeScores, role]);

  const handleFillRandom = async () => {
    const newScores: Record<string, number> = {};
    for (const { indicator } of flatIndicators) {
      const criteria = indicator.scoringCriteria;
      if (criteria && criteria.length > 0) {
        newScores[indicator.id] = criteria[Math.floor(Math.random() * criteria.length)].score;
      } else {
        newScores[indicator.id] = Math.floor(Math.random() * (indicator.maxScore + 1));
      }
    }
    setCommitteeScores((prev) => ({ ...prev, ...newScores }));

    await Promise.all(
      flatIndicators.map(({ indicator }) =>
        apiClient.post("evaluation/score", {
          evaluationId,
          indicatorId: indicator.id,
          score: scores[indicator.id] ?? 0,
          notes: implementationDetails[indicator.id] ?? "",
          committeeScore: newScores[indicator.id],
          committeeComment: committeeComments[indicator.id] ?? "",
          programId,
          programName,
          evaluateeId,
        }).then((res) => {
          if (res.data.evaluationId && !evaluationId) setEvaluationId(res.data.evaluationId);
        })
      )
    );
    toast.success(`กรอกสุ่มครบ ${flatIndicators.length} ข้อแล้ว`);
  };

  const handleComplete = async () => {
    if (!evaluationId) return;
    await apiClient.post(`evaluation/${evaluationId}/complete`);
    await apiClient.post(`evaluation/${evaluationId}/calculate`);
    toast.success("ยืนยันผลการประเมินเรียบร้อย");
    navigate(`/evaluation/${programId}/summary?evaluationId=${evaluationId}`);
  };

  const handleReturn = async () => {
    if (!evaluationId) return;
    await apiClient.post(`evaluation/${evaluationId}/return`);
    toast.success("ส่งกลับให้ผู้ถูกประเมินเรียบร้อย");
    navigate("/evaluation");
  };

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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">ประเมิน {programName}</h2>
              {currentStatus && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStatus.badge}`}>
                  {currentStatus.icon}
                  {currentStatus.label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {categories.length} หมวด · {totalTopics} ประเด็น · {totalIndicators} ตัวชี้วัด · คะแนนเต็ม {grandMax}
            </p>
          </div>
          {role !== "user" ? (
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ประเมินตนเอง</p>
                <p className="text-xl font-bold text-muted-foreground">
                  {grandSelfTotal}<span className="text-sm font-normal text-muted-foreground">/{grandMax}</span>
                </p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">กรรมการ</p>
                <p className="text-xl font-bold text-primary">
                  {grandCommitteeTotal}<span className="text-sm font-normal text-muted-foreground">/{grandMax}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">คะแนนรวม</p>
              <p className="text-2xl font-bold text-primary">
                {grandSelfTotal}<span className="text-sm font-normal text-muted-foreground">/{grandMax}</span>
              </p>
            </div>
          )}
          {role !== "user" && import.meta.env.DEV && !isCompleted && (
            <Button variant="outline" size="sm" onClick={handleFillRandom} className="gap-1.5 text-purple-600 border-purple-300 hover:bg-purple-50 text-xs">
              🎲 สุ่ม
            </Button>
          )}
          {isCompleted ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/evaluation/${programId}/summary?evaluationId=${evaluationId || ""}`)}
              className="ml-2 gap-1.5 text-green-700 border-green-300 bg-green-50 hover:bg-green-100"
            >
              <CheckCircle2 className="h-4 w-4" />
              ดูสรุปผลการประเมิน
            </Button>
          ) : (
            role !== "user" && isSubmitted && (
              <div className="flex items-center gap-2 ml-2">
                <Button variant="outline" size="sm" onClick={handleReturn} className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50">
                  <RotateCcw className="h-4 w-4" />
                  ส่งกลับ
                </Button>
                <Button size="sm" onClick={handleComplete} disabled={!allCommitteeScored} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">
                  <CheckCircle2 className="h-4 w-4" />
                  ยืนยันผลการประเมิน
                </Button>
              </div>
            )
          )}
        </div>
      </div>

      {currentStatus?.banner && (
        <div className={`flex items-center gap-2 px-6 py-2.5 border-b text-sm font-medium ${currentStatus.banner}`}>
          {currentStatus.icon}
          {evaluationStatus === "revision" && "เอกสารนี้ถูกส่งกลับเพื่อแก้ไข กรุณารอการแก้ไขจากผู้ถูกประเมิน"}
          {evaluationStatus === "cancel" && "เอกสารนี้ถูกยกเลิกแล้ว"}
        </div>
      )}

      <div className="px-6 py-6 space-y-6">
        <ScoreSummary data={summaryData} committeeData={committeeSummaryData} />
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
          committeeScore={committeeScores[wizardItem.indicator.id]}
          onCommitteeScoreChange={(v) => handleCommitteeScoreChange(wizardItem.indicator.id, v)}
          committeeComment={committeeComments[wizardItem.indicator.id] ?? ""}
          onCommitteeCommentChange={(v) => handleCommitteeCommentChange(wizardItem.indicator.id, v)}
          userRole={role}
          viewOnly={isCompleted || (role !== "user" && (!isSubmitted || scoreView === "self"))}
          readOnly={isCompleted}
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
