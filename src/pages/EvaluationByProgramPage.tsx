import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Category } from "@/data/evaluationData";
import type { UploadedFile, IndicatorNavItem } from "@/components/evaluation/CategoryCard";
import { CategoryCard, IndicatorDialog, getCategoryColor } from "@/components/evaluation/CategoryCard";
import { ScoreSummary } from "@/components/evaluation/ScoreSummary";
import { ClipboardCheck, Loader2, ArrowLeft, RotateCcw, CheckCircle2, Clock, FileText, AlertCircle, XCircle, FilePlus, RefreshCw, TrendingUp, ChevronDown, Trophy, Medal, Award, Star } from "lucide-react";
import { ScoringLevelBadges } from "@/components/self-eval/ScoringLevelBadges";
import type { ScoringLevel } from "@/pages/ProjectRegistration";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";

const EVAL_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  new:     { label: "ประเมินใหม่",             icon: <FilePlus   className="h-3 w-3" />, className: "bg-blue-50 text-blue-700 border-blue-200"     },
  renew:   { label: "ต่ออายุใบประกาศนียบัตร", icon: <RefreshCw  className="h-3 w-3" />, className: "bg-amber-50 text-amber-700 border-amber-200"   },
  upgrade: { label: "ยกระดับคะแนน",           icon: <TrendingUp className="h-3 w-3" />, className: "bg-purple-50 text-purple-700 border-purple-200" },
};

interface EvalCategory extends Category {
  scoreType?: string;
  upgradeMode?: string | null;
  renewMode?: string | null;
}

const isNewType    = (t?: string) => !t || t === "score" || t === "yes_no" || t === "score_new" || t === "yes_no_new";
const isUpgradType = (t?: string) => t === "score_upgrad" || t === "yes_no_upgrad" || t === "upgrade";
const isRenewType  = (t?: string) => t === "score_renew" || t === "yes_no_renew";

const EvaluationByProgramPage = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const evaluationIdParam = new URLSearchParams(location.search).get("evaluationId");
  const [evaluateeId, setEvaluateeId] = useState<string | null>(null);
  const { isAdmin, role, accessibleProgramIds, loading: roleLoading } = useUserRole();

  const [programName, setProgramName] = useState("");
  const [programScoringType, setProgramScoringType] = useState<'score' | 'yes_no'>('score');
  const scoreView = role !== "user" ? "committee" : "self";
  const [categories, setCategories] = useState<EvalCategory[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile[]>>({});
  const [implementationDetails, setImplementationDetails] = useState<Record<string, string>>({});
  const [committeeScores, setCommitteeScores] = useState<Record<string, number>>({});
  const [committeeComments, setCommitteeComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState<string | null>(null);
  const [evaluationType, setEvaluationType] = useState<string | null>(null);
  const [scoringLevels, setScoringLevels] = useState<ScoringLevel[]>([]);
  const [year, setYear] = useState<number | null>(null);
  // notification IDs ของ indicator ที่ผู้ถูกประเมินแก้ไขใหม่ (เฉพาะฝั่งกรรมการ)
  const [newEvaluateeIndicatorIds, setNewEvaluateeIndicatorIds] = useState<Map<string, { prevScore: number | null; newScore: number | null }>>(new Map());
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | number | null>(null);

  const handleCategoryClick = useCallback((categoryId: string | number) => {
    setExpandedCategoryId(categoryId);
    setTimeout(() => {
      document.getElementById(`cat-${categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

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
      if (prog?.scoringType) setProgramScoringType(prog.scoringType);

      // Scoring levels
      try {
        const { data: levData } = await apiClient.get(`scoring-levels?programId=${programId}`);
        setScoringLevels((levData ?? []).sort((a: ScoringLevel, b: ScoringLevel) => a.sortOrder - b.sortOrder));
      } catch { /* no scoring levels */ }

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
                  scoreType: c.scoreType || 'score',
                  description: i.description || "",
                  detail: i.detail || "",
                  notes: i.notes || "",
                  evidenceDescription: i.evidenceDescription || "",
                  scoringCriteria: Array.isArray(i.scoringCriteria)
                    ? (i.scoringCriteria as { score: number; label: string }[])
                    : [],
                })),
            }));
          return { id: c.id, name: c.name, maxScore: c.maxScore, scoreType: c.scoreType ?? "score", upgradeMode: c.upgradeMode ?? null, renewMode: c.renewMode ?? null, topics };
        });
        setCategories(cats);

        // Load evaluation by id
        const { data: evalData } = await apiClient.get(`evaluation/${evaluationIdParam}`);
        if (evalData?.userId) setEvaluateeId(evalData.userId);

        if (evalData) {
          setEvaluationId(evalData.id);
          setEvaluationStatus(evalData.status);
          if (evalData.evaluationType) setEvaluationType(evalData.evaluationType);
          if (evalData.year) setYear(evalData.year);
          const scoresData = evalData.evaluationScores || [];

          const loaded: Record<string, number> = {};
          const loadedDetails: Record<string, string> = {};
          const loadedCommittee: Record<string, number> = {};
          const loadedComments: Record<string, string> = {};
          const loadedFiles: Record<string, any[]> = {};

          scoresData.forEach((s: any) => {
            loaded[s.indicatorId] = Number(s.score);
            if (s.notes) loadedDetails[s.indicatorId] = s.notes;
            if (s.committeeScore !== null && s.committeeScore !== undefined) loadedCommittee[s.indicatorId] = Number(s.committeeScore);
            if (s.evidenceUrl) loadedComments[s.indicatorId] = s.evidenceUrl;
            if (Array.isArray(s.fileUrls) && s.fileUrls.length > 0) loadedFiles[s.indicatorId] = s.fileUrls;
          });

          setScores(loaded);
          setImplementationDetails(loadedDetails);
          setCommitteeScores(loadedCommittee);
          setCommitteeComments(loadedComments);
          setUploadedFiles(loadedFiles);

          // โหลด notification จากผู้ถูกประเมิน (สำหรับกรรมการ)
          if (role !== "user" && evalData.id) {
            try {
              const { data: notifs } = await apiClient.get(
                `evaluation/${evalData.id}/notifications?direction=evaluatee_to_committee`
              );
              const notifMap = new Map<string, { prevScore: number | null; newScore: number | null }>();
              (notifs as { indicatorId: string; isRead: boolean; evaluateeScore: number | null; prevEvaluateeScore: number | null }[])
                .filter((n) => !n.isRead)
                .forEach((n) => notifMap.set(n.indicatorId, {
                  prevScore: n.prevEvaluateeScore,
                  newScore: n.evaluateeScore,
                }));
              setNewEvaluateeIndicatorIds(notifMap);
            } catch { /* ไม่มี notification */ }
          }
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
    if (role === "user" && (evaluationStatus === "submitted" || evaluationStatus === "submit" || evaluationStatus === "completed" || evaluationStatus === "complete")) {
      toast.error("ไม่สามารถแก้ไขได้ เอกสารถูกส่งแล้ว");
      return;
    }
    if (role !== "user" && (evaluationStatus === "completed" || evaluationStatus === "complete")) {
      toast.error("ไม่สามารถแก้ไขได้ การประเมินเสร็จสิ้นแล้ว");
      return;
    }
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
      fileUrls: uploadedFiles[indicatorId] ?? [],
      programId,
      programName,
      evaluateeId,
    });

    if (data.evaluationId && !evaluationId) {
      setEvaluationId(data.evaluationId);
    }

    toast.success("บันทึกเรียบร้อยแล้ว");
  }, [evaluationId, evaluationStatus, role, scores, uploadedFiles, implementationDetails, committeeScores, committeeComments, programId, programName]);

  const visibleCategories = useMemo(() => {
    if (evaluationType === "upgrade") {
      const upgradCat = categories.find((c) => isUpgradType(c.scoreType));
      const mode = upgradCat?.upgradeMode ?? "full";
      return mode === "partial"
        ? categories.filter((c) => isUpgradType(c.scoreType))
        : categories.filter((c) => isNewType(c.scoreType) || isUpgradType(c.scoreType));
    }
    if (evaluationType === "renew") {
      const renewCat = categories.find((c) => isRenewType(c.scoreType));
      const mode = renewCat?.renewMode ?? "full";
      return mode === "partial"
        ? categories.filter((c) => isRenewType(c.scoreType))
        : categories.filter((c) => isNewType(c.scoreType) || isRenewType(c.scoreType));
    }
    return categories.filter((c) => isNewType(c.scoreType));
  }, [categories, evaluationType]);

  const totalTopics = visibleCategories.reduce((s, c) => s + c.topics.length, 0);
  const totalIndicators = visibleCategories.reduce(
    (s, c) => s + c.topics.reduce((ts, t) => ts + t.indicators.length, 0), 0
  );

  const summaryData = useMemo(() => {
    return visibleCategories.map((cat, idx) => {
      const isYesNo = cat.scoreType?.includes('yes_no');
      let totalScore = 0, totalMax = 0, passCount = 0, totalIndicators = 0;
      cat.topics.forEach((topic) => {
        topic.indicators.forEach((ind) => {
          if (isYesNo) {
            totalIndicators++;
            if ((scores[ind.id] ?? -1) === 1) passCount++;
          } else {
            totalScore += scores[ind.id] || 0;
            totalMax += ind.maxScore;
          }
        });
      });
      return { id: cat.id, name: cat.name, score: totalScore, maxScore: cat.maxScore, totalPossible: totalMax, index: idx, scoreType: cat.scoreType, ...(isYesNo ? { passCount, totalIndicators } : {}) };
    });
  }, [scores, visibleCategories]);

  const committeeSummaryData = useMemo(() => {
    if (role === "user") return undefined;
    return visibleCategories.map((cat) => {
      const isYesNo = cat.scoreType?.includes('yes_no');
      let totalScore = 0, totalMax = 0, passCount = 0, totalIndicators = 0;
      cat.topics.forEach((topic) => {
        topic.indicators.forEach((ind) => {
          if (isYesNo) {
            totalIndicators++;
            if ((committeeScores[ind.id] ?? -1) === 1) passCount++;
          } else {
            totalScore += committeeScores[ind.id] ?? 0;
            totalMax += ind.maxScore;
          }
        });
      });
      return { id: cat.id, name: cat.name, score: totalScore, maxScore: cat.maxScore, totalPossible: totalMax, scoreType: cat.scoreType, ...(isYesNo ? { passCount, totalIndicators } : {}) };
    });
  }, [committeeScores, visibleCategories]);

  const grandSelfTotal = summaryData.reduce((s, c) => s + c.score, 0);
  const grandCommitteeTotal = committeeSummaryData?.reduce((s, c) => s + c.score, 0) ?? 0;
  const grandMax = summaryData.reduce((s, c) => s + c.totalPossible, 0);

  // yes/no totals — used when grandMax === 0
  const grandSelfPassCount       = summaryData.reduce((s, c: any) => s + (c.passCount ?? 0), 0);
  const grandSelfPassTotal       = summaryData.reduce((s, c: any) => s + (c.totalIndicators ?? 0), 0);
  const grandCommitteePassCount  = (committeeSummaryData ?? []).reduce((s, c: any) => s + (c.passCount ?? 0), 0);
  const isYesNoProgram           = grandMax === 0 && grandSelfPassTotal > 0;
  // unified for committee display
  const displayCommitteeTotal    = isYesNoProgram ? grandCommitteePassCount : grandCommitteeTotal;
  const displaySelfTotal         = isYesNoProgram ? grandSelfPassCount      : grandSelfTotal;
  const displayMax               = isYesNoProgram ? grandSelfPassTotal      : grandMax;
  const displayCommitteePct      = displayMax > 0 ? Math.round((displayCommitteeTotal / displayMax) * 100) : 0;
  const displayUnit               = isYesNoProgram ? "ผ่าน" : "";

  // ── Wizard ──────────────────────────────────────────────────────────────────
  const flatIndicators = useMemo(() => {
    const items: Array<{ indicator: Category["topics"][0]["indicators"][0]; colorIndex: number }> = [];
    visibleCategories.forEach((cat, catIdx) => {
      cat.topics.forEach((topic) => {
        topic.indicators.forEach((indicator) => {
          items.push({ indicator, colorIndex: catIdx });
        });
      });
    });
    return items;
  }, [visibleCategories]);

  const [wizardIndex, setWizardIndex] = useState<number | null>(null);
  const wizardItem = wizardIndex !== null ? flatIndicators[wizardIndex] : null;

  const handleOpenWizard = useCallback((indicator: Category["topics"][0]["indicators"][0]) => {
    const idx = flatIndicators.findIndex((item) => item.indicator.id === indicator.id);
    if (idx !== -1) setWizardIndex(idx);
    // mark evaluatee notification as read when committee opens this indicator
    if (role !== "user" && evaluationId && newEvaluateeIndicatorIds.has(indicator.id)) {
      apiClient.post(`evaluation/${evaluationId}/notifications/read`, {
        direction: "evaluatee_to_committee",
        indicatorIds: [indicator.id],
      }).catch(() => {});
      setNewEvaluateeIndicatorIds((prev) => {
        const next = new Map(prev);
        next.delete(indicator.id);
        return next;
      });
    }
  }, [flatIndicators, role, evaluationId, newEvaluateeIndicatorIds]);

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
    return flatIndicators.every(({ indicator }) => {
      const val = committeeScores[indicator.id];
      if (val === undefined) return false;
      // yes/no: -1 means deselected (not yet scored)
      if (indicator.scoreType?.includes('yes_no') && val === -1) return false;
      return true;
    });
  }, [flatIndicators, committeeScores, role]);

  const handleFillMode = async (mode: "full" | "good" | "mid" | "bad" | "clear") => {
    const pickScore = (maxScore: number, criteria: { score: number; label: string }[]) => {
      const sorted = [...(criteria.length > 0 ? criteria.map(c => c.score) : Array.from({ length: maxScore + 1 }, (_, i) => i))].sort((a, b) => a - b);
      const n = sorted.length;
      if (mode === "full")  return sorted[n - 1];
      if (mode === "good")  return sorted[Math.max(0, n - 1 - Math.floor(Math.random() * Math.ceil(n * 0.25)))];
      if (mode === "mid")   { const mid = Math.floor(n / 2); return sorted[Math.min(n - 1, Math.max(0, mid - 1 + Math.floor(Math.random() * 3)))]; }
      if (mode === "bad")   return sorted[Math.floor(Math.random() * Math.max(1, Math.ceil(n * 0.35)))];
      return 0;
    };
    const newScores: Record<string, number> = {};
    for (const { indicator } of flatIndicators) {
      newScores[indicator.id] = mode === "clear" ? 0 : pickScore(indicator.maxScore, indicator.scoringCriteria ?? []);
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
    const labels: Record<string, string> = { full: "เต็ม", good: "ดีแต่ไม่เต็ม", mid: "กลางๆ", bad: "แย่ๆ", clear: "" };
    toast.success(mode === "clear" ? "ล้างคะแนนแล้ว" : `สุ่มคะแนน${labels[mode]}ครบ ${flatIndicators.length} ข้อแล้ว`);
  };

  const handleComplete = async () => {
    if (!evaluationId) return;
    await apiClient.post(`evaluation/${evaluationId}/complete`);

    // yes/no programs: นับจำนวนที่ผ่าน แล้วเทียบกับ scoring-levels ของ program นั้น
    const allCategories = visibleCategories;
    const hasYesNo = allCategories.some(c => c.scoreType?.includes('yes_no'));
    if (hasYesNo) {
      const levelsRes = await apiClient.get<{ id: number; name: string; minScore: number; maxScore: number; programId: string | null }[]>("scoring-levels");
      const programLevels = levelsRes.data.filter(l => l.programId === programId);
      const totalIndicators = allCategories.reduce((s, c) => s + c.topics.reduce((ts, t) => ts + t.indicators.length, 0), 0);
      const passCount = allCategories.reduce((s, c) =>
        s + c.topics.reduce((ts, t) =>
          ts + t.indicators.reduce((is, i) => is + ((committeeScores[i.id] ?? -1) === 1 ? 1 : 0), 0), 0), 0);
      const passPct = totalIndicators > 0 ? Math.round((passCount / totalIndicators) * 100) : 0;
      const matchedLevel = programLevels.find(l => passPct >= l.minScore && passPct <= l.maxScore);
      await apiClient.post(`evaluation/${evaluationId}/calculate-yesno`, {
        passCount,
        totalIndicators,
        passPct,
        scoringLevelId: matchedLevel?.id ?? null,
        scoringLevelName: matchedLevel?.name ?? null,
      });
    } else {
      await apiClient.post(`evaluation/${evaluationId}/calculate`);
    }

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
      <div className="border-b bg-card/50 px-4 sm:px-6 py-3">
        {/* Row 1: back + icon + [spacer] + scores + actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/evaluation")} className="shrink-0 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
            <ClipboardCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0" />
          {/* Scores + badge + actions */}
          <div className="flex items-center gap-2 shrink-0">
            {role !== "user" ? (
              <>
                <div className="text-right">
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">ตนเอง</p>
                  <p className="text-base font-bold text-muted-foreground leading-tight">
                    {displaySelfTotal}{displayUnit && <span className="text-[10px] font-normal ml-0.5">{displayUnit}</span>}
                    <span className="text-xs font-normal text-muted-foreground">/{displayMax}</span>
                  </p>
                </div>
                <div className="w-px h-7 bg-border" />
                {displayMax > 0 && (programScoringType === 'yes_no' ? (
                  (() => {
                    const allPass = displayCommitteeTotal === displayMax;
                    return (
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${allPass ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-rose-400 bg-rose-50 text-rose-700"}`}>
                        {allPass ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                        <div className="leading-tight">
                          <p className="font-semibold">{allPass ? "สอดคล้อง" : "ไม่สอดคล้อง"}</p>
                          <p className="opacity-70">{displayCommitteePct}%</p>
                        </div>
                      </div>
                    );
                  })()
                ) : scoringLevels.length > 0 && (() => {
                  const lvl = [...scoringLevels].reverse().find(l => displayCommitteePct >= l.minScore && displayCommitteePct <= l.maxScore);
                  if (!lvl) return null;
                  const iconMap = { Trophy, Medal, Award, Star } as Record<string, ({ className }: { className?: string }) => JSX.Element>;
                  const IconComp = iconMap[lvl.icon] ?? Trophy;
                  return (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs shrink-0"
                      style={{ borderColor: `${lvl.color}60`, backgroundColor: `${lvl.color}10`, color: lvl.color }}>
                      <IconComp className="h-3.5 w-3.5 shrink-0" />
                      <div className="leading-tight">
                        <p className="font-semibold">{lvl.name}</p>
                        <p className="opacity-70">{lvl.minScore}–{lvl.maxScore}%</p>
                      </div>
                    </div>
                  );
                })())}
                <div className="text-right">
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">กรรมการ</p>
                  <p className="text-base font-bold text-primary leading-tight">
                    {displayCommitteeTotal}{displayUnit && <span className="text-[10px] font-normal ml-0.5">{displayUnit}</span>}
                    <span className="text-xs font-normal text-muted-foreground">/{displayMax}</span>
                  </p>
                  {displayMax > 0 && <p className="text-[9px] text-muted-foreground">{displayCommitteePct}%</p>}
                </div>
              </>
            ) : (
              <div className="text-right">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">คะแนนรวม</p>
                <p className="text-base font-bold text-primary leading-tight">
                  {displaySelfTotal}{displayUnit && <span className="text-[10px] font-normal ml-0.5">{displayUnit}</span>}
                  <span className="text-xs font-normal text-muted-foreground">/{displayMax}</span>
                </p>
              </div>
            )}
            {role !== "user" && import.meta.env.DEV && !isCompleted && (
              <div className="hidden sm:flex">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 text-purple-600 border-purple-300 hover:bg-purple-50 text-xs h-8 px-2 shrink-0">
                      🎲 <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => handleFillMode("full")}>⭐ สุ่มคะแนนเต็ม</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFillMode("good")}>😊 สุ่มคะแนนดีแต่ไม่เต็ม</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFillMode("mid")}>😐 สุ่มคะแนนกลางๆ</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFillMode("bad")}>😕 สุ่มคะแนนแย่ๆ</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleFillMode("clear")} className="text-destructive">🗑 ล้างคะแนน</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            {isCompleted ? (
              <Button variant="outline" size="sm"
                onClick={() => navigate(`/evaluation/${programId}/summary?evaluationId=${evaluationId || ""}`)}
                className="gap-1 text-green-700 border-green-300 bg-green-50 hover:bg-green-100 h-8 px-2 text-xs shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ดูสรุป</span>
              </Button>
            ) : (
              role !== "user" && isSubmitted && (
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={handleReturn} className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50 h-8 px-2 text-xs shrink-0">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">ส่งกลับ</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleComplete}
                    disabled={!allCommitteeScored}
                    title={!allCommitteeScored ? `ยังมีตัวชี้วัดที่ยังไม่ได้ประเมิน ${flatIndicators.filter(({ indicator }) => { const v = committeeScores[indicator.id]; return v === undefined || (indicator.scoreType?.includes('yes_no') && v === -1); }).length} ข้อ` : ""}
                    className="gap-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 h-8 px-2 text-xs shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">ยืนยันผล</span>
                    {!allCommitteeScored && (
                      <span className="rounded-full bg-white/20 px-1 text-[10px] font-bold">
                        {flatIndicators.filter(({ indicator }) => { const v = committeeScores[indicator.id]; return v === undefined || (indicator.scoreType?.includes('yes_no') && v === -1); }).length}
                      </span>
                    )}
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
        {/* Row 2: program name + badges + subinfo */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5 ml-[40px]">
          <h2 className="text-sm font-bold text-foreground w-full truncate">{programName}</h2>
          {evaluationType && EVAL_TYPE_CONFIG[evaluationType] && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${EVAL_TYPE_CONFIG[evaluationType].className}`}>
              {EVAL_TYPE_CONFIG[evaluationType].icon}
              {EVAL_TYPE_CONFIG[evaluationType].label}
            </span>
          )}
          {currentStatus && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${currentStatus.badge}`}>
              {currentStatus.icon}
              {currentStatus.label}
            </span>
          )}
          {year && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-border bg-muted/60 text-muted-foreground">
              พ.ศ. {year + 543}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {visibleCategories.length} หมวด · {totalTopics} ประเด็น · {totalIndicators} ตัวชี้วัด{isYesNoProgram ? "" : ` · คะแนนเต็ม ${grandMax}`}
          </span>
        </div>
      </div>

      {/* Scoring level strip */}
      {role !== "user" && (scoringLevels.length > 0 || programScoringType === 'yes_no') && (
        <div className="px-4 sm:px-6 py-2 border-b bg-card/30 flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex-1 min-w-0">
            {programScoringType === 'yes_no' ? (
              (() => {
                const allPass = displayMax > 0 && displayCommitteeTotal === displayMax;
                return (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${allPass ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-rose-400 bg-rose-50 text-rose-700"}`}>
                    {allPass ? <><CheckCircle2 className="h-4 w-4" /> สอดคล้อง</> : <><XCircle className="h-4 w-4" /> ไม่สอดคล้อง</>}
                  </div>
                );
              })()
            ) : (
              <ScoringLevelBadges levels={scoringLevels} grandMax={displayMax} currentScore={displayCommitteeTotal} />
            )}
          </div>
          {displayMax > 0 && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {programScoringType === 'yes_no' ? "วิธีคำนวณ (สอดคล้อง)" : isYesNoProgram ? "วิธีคำนวณ (ผ่าน/ไม่ผ่าน)" : "วิธีคำนวณ (คะแนน)"}
              </p>
              {programScoringType === 'yes_no' && <p className="text-[10px] font-bold text-red-600">*ต้องสอดคล้องครบทุกข้อ</p>}
              {programScoringType !== 'yes_no' && !isYesNoProgram && grandMax > 0 && (
                <p className="text-[10px] font-bold text-red-600">{grandMax === 100 ? "*คำนวนแบบคะแนนเต็มหมวด" : "*คำนวนแบบคะแนนไม่เต็มหมวด"}</p>
              )}
            </div>
          )}
        </div>
      )}

      {currentStatus?.banner && (
        <div className={`flex items-center gap-2 px-6 py-2.5 border-b text-sm font-medium ${currentStatus.banner}`}>
          {currentStatus.icon}
          {evaluationStatus === "revision" && "เอกสารนี้ถูกส่งกลับเพื่อแก้ไข กรุณารอการแก้ไขจากผู้ถูกประเมิน"}
          {evaluationStatus === "cancel" && "เอกสารนี้ถูกยกเลิกแล้ว"}
        </div>
      )}

      <div className="px-6 py-6 space-y-6">
        <ScoreSummary data={summaryData} committeeData={committeeSummaryData} onCategoryClick={handleCategoryClick} />
        {visibleCategories.map((category, idx) => (
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
            newIndicatorNotifs={role !== "user" ? newEvaluateeIndicatorIds : undefined}
            forceOpen={expandedCategoryId === category.id}
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
          viewOnly={isCompleted || (role === "user" && isSubmitted) || (role !== "user" && (!isSubmitted || scoreView === "self"))}
          readOnly={isCompleted || (role === "user" && isSubmitted)}
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
