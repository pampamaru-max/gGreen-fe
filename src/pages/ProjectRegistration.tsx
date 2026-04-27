import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck, Loader2, CheckCircle2, ArrowLeft,
  Clock, FileText, AlertCircle, XCircle, RotateCcw,
  FilePlus, RefreshCw, TrendingUp,
  Trophy, Medal, Award, Star, Save,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryCard, IndicatorDialog, getCategoryColor } from "@/components/CategoryCard";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { UploadedFile, IndicatorNavItem } from "@/components/CategoryCard";
import { ScoreSummary } from "@/components/evaluation/ScoreSummary";
import { AnimatedScore } from "@/components/ui/animated-score";
import { Category } from "@/data/evaluationData";

// Category extended with scoreType / upgrade-renew settings from DB
export interface EvalCategory extends Category {
  scoreType?: string;
  upgradeMode?: string | null;
  renewMode?: string | null;
}
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ScoringLevelType } from "./SettingsScoringCriteria";
import { findScoringLevelMatch, isNewType, isRenewType, isUpgradType, labelScoreType, queryArray } from "@/helpers/functions";

const EVAL_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  new:     { label: "ประเมินใหม่",             icon: <FilePlus   className="h-3 w-3" />, className: "bg-blue-50 text-blue-700 border-blue-200"     },
  renew:   { label: "ต่ออายุใบประกาศนียบัตร", icon: <RefreshCw  className="h-3 w-3" />, className: "bg-amber-50 text-amber-700 border-amber-200"   },
  upgrade: { label: "ยกระดับคะแนน",           icon: <TrendingUp className="h-3 w-3" />, className: "bg-purple-50 text-purple-700 border-purple-200" },
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = { Trophy, Medal, Award, Star };

// ─── Types ────────────────────────────────────────────────────────────────────

interface Registration {
  id: string;
  programId: string;
  programName?: string;
  organizationName: string;
  organizationType: string;
  address: string;
  province: string;
  provinceName?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: string;
  createdAt: string;
}

export interface ScoringLevel {
  id: number;
  name: string;
  minScore: number;
  maxScore: number;
  color: string;
  icon: string;
  sortOrder: number;
  type: ScoringLevelType;
  attempt: number | null;
  isActive: boolean;
  isPass: boolean;
  programId: string | null;
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectRegistration() {
  const { user } = useAuth();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [regLoading, setRegLoading] = useState(true);

  // Fetch user's registration — fallback to programAccess[0] if no record
  useEffect(() => {
    apiClient.get("project-registrations/my")
      .then(({ data }) => { if (data) setRegistration(data); })
      .catch(() => {/* no registration record — use programAccess fallback */})
      .finally(() => setRegLoading(false));
  }, []);

  // programId: จาก registration record หรือ fallback จาก user.programAccess[0]
  const programId = registration?.programId ?? user?.programAccess?.[0] ?? null;

  // Evaluation form state
  const [evalLoading, setEvalLoading]       = useState(true);
  const [programName, setProgramName]       = useState("");
  const [programScoringType, setProgramScoringType] = useState<'score' | 'yes_no'>('score');
  const [categories, setCategories]         = useState<EvalCategory[]>([]);
  const [scoringLevels, setScoringLevels]   = useState<ScoringLevel[]>([]);
  const [scores, setScores]                 = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles]   = useState<Record<string, UploadedFile[]>>({});
  const [implDetails, setImplDetails]       = useState<Record<string, string>>({});
  const [evaluationId, setEvaluationId]     = useState<string | null>(null);
  const [evaluationType, setEvaluationType] = useState<string>("new");
  const [year, setYear]                     = useState<number>(new Date().getFullYear());
  const [attemptTypeCount, setAttemptTypeCount] = useState<number | null>(null);
  const [committeeScores, setCommitteeScores] = useState<Record<string, number>>({});
  const [committeeComments, setCommitteeComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting]         = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState<string | null>(null);
  const [wizardIndex, setWizardIndex]       = useState<number | null>(null);
  // notification ของ indicator ที่กรรมการ comment/ให้คะแนนใหม่
  const [newCommitteeIndicatorIds, setNewCommitteeIndicatorIds] = useState<Map<string, { prevScore: number | null; newScore: number | null }>>(new Map());
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | number | null>(null);
  const [lastSavedAt, setLastSavedAt]               = useState<Date | null>(null);
  const [dirtyIndicatorIds, setDirtyIndicatorIds]   = useState<Set<string>>(new Set());
  // copy score
  const [copyHistoryEvals, setCopyHistoryEvals] = useState<Array<{ evaluationId: string; year: number; status: string; evaluationType: string }>>([]);
  const [copyHistoryLoaded, setCopyHistoryLoaded] = useState(false);
  const [copyDropdownOpen, setCopyDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleCategoryClick = useCallback((categoryId: string | number) => {
    setExpandedCategoryId(categoryId);
    setTimeout(() => {
      document.getElementById(`cat-${categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  // ── Copy score handlers ────────────────────────────────────────────────────
  const handleCopyDropdownOpen = useCallback(async (open: boolean) => {
    setCopyDropdownOpen(open);
    if (open && programId) {
      // always re-fetch to exclude current evaluationId correctly
      try {
        const { data } = await apiClient.get(`evaluation/my-history?programId=${programId}`);
        const filtered = (data ?? []).filter((e: any) => e.evaluationId !== evaluationId);
        setCopyHistoryEvals(filtered);
      } catch { /* ไม่มีประวัติ */ }
      setCopyHistoryLoaded(true);
    }
  }, [programId, evaluationId]);

  const handleCopyScoreFromEval = useCallback(async (histEvaluationId: string) => {
    setCopyDropdownOpen(false);
    try {
      const { data: evalData } = await apiClient.get(`evaluation/${histEvaluationId}`);
      const newScores: Record<string, number> = {};
      (evalData.evaluationScores ?? []).forEach((s: any) => {
        if (s.score !== null && s.score !== undefined) {
          newScores[s.indicatorId] = Number(s.score);
        }
      });
      setScores(prev => ({ ...prev, ...newScores }));
      toast.success("คัดลอกคะแนนเรียบร้อยแล้ว");
    } catch {
      toast.error("ไม่สามารถคัดลอกคะแนนได้");
    }
  }, []);

  // ── Fetch evaluation form + existing answers ───────────────────────────────
  useEffect(() => {
    if (!programId) return;

    const load = async () => {
      setEvalLoading(true);
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlEvalId = searchParams.get("id");
        const urlEvalType = searchParams.get("type") || "new"; // new | renew | upgrade
        const urlYear = searchParams.get("year");
        setEvaluationType(urlEvalType);
        const selectedYear = urlYear ? parseInt(urlYear) : new Date().getFullYear();
        setYear(selectedYear);

        // กรณีไม่มี urlEvalId — ต้องสร้างใหม่ก่อน (sequential ตามเดิม)
        if (!urlEvalId) {
          const { data: formData } = await apiClient.get(`programs/${programId}/evaluation-form`);
          const prog = formData?.program;
          const cats: EvalCategory[] = (formData?.categories ?? []).map((c: any) => ({
            id: c.id, name: c.name, maxScore: c.maxScore,
            scoreType: c.scoreType ?? "score", upgradeMode: c.upgradeMode ?? null, renewMode: c.renewMode ?? null,
            topics: (c.topics ?? []).map((t: any) => ({
              id: t.id, name: t.name,
              indicators: (t.indicators ?? []).map((i: any) => ({
                id: i.id, name: i.name, maxScore: i.maxScore, scoreType: c.scoreType || 'score',
                description: i.description || i.description || "", 
                detail: i.detail || i.detail || "", 
                notes: i.notes || i.notes || "",
                evidenceDescription: i.evidenceDescription || i.evidence_description || "",
                scoringCriteria: Array.isArray(i.scoringCriteria) ? i.scoringCriteria : (Array.isArray(i.scoring_criteria) ? i.scoring_criteria : []),
                isHeader: i.isHeader || i.is_header,
                parentId: i.parentId || i.parent_id,
                sortOrder: i.sortOrder || i.sort_order || 0,
              })),
            })),
          }));
          setProgramName(prog?.name ?? "");
          if (prog?.scoringType) setProgramScoringType(prog.scoringType);
          setCategories(cats);

          try {
            const { data: levData } = await apiClient.get(`scoring-levels?programId=${programId}&${queryArray('type', Array.from(new Set([urlEvalType, ScoringLevelType.new])))}`);
            setScoringLevels((levData ?? []));
          } catch { /* no scoring levels */ }

          const { data: newEval } = await apiClient.post("evaluation", {
            programId, userId: user?.id, evaluationType: urlEvalType, year: selectedYear,
          });
          if (newEval?.id) {
            setEvaluationId(newEval.id);
            setEvaluationStatus("draft");
            navigate(`/register/evaluate?type=${urlEvalType}&year=${selectedYear}&id=${newEval.id}`, { replace: true });
          }
          return;
        }

        // กรณีมี urlEvalId — โหลด form + evaluation พร้อมกัน
        const evalFetchUrl = `evaluation/${urlEvalId}`;
        const [formRes, evalRes] = await Promise.all([
          apiClient.get(`programs/${programId}/evaluation-form`),
          apiClient.get(evalFetchUrl).catch(() => ({ data: null })),
        ]);

        const evalData = evalRes.data;
        setYear(evalData.year);
        setAttemptTypeCount(evalData.attempt);
        const levRes = await apiClient.get(`scoring-levels?programId=${programId}&${queryArray('type', Array.from(new Set([evalData.evaluationType, ScoringLevelType.new])))}`).catch(() => ({ data: [] }));

        // ประมวลผล form structure
        const formData = formRes.data;
        const prog = formData?.program;
        const cats: EvalCategory[] = (formData?.categories ?? []).map((c: any) => ({
          id: c.id, name: c.name, maxScore: c.maxScore, maxScorePct: c.maxScorePct,
          scoreType: c.scoreType ?? "score", upgradeMode: c.upgradeMode ?? null, renewMode: c.renewMode ?? null,
          topics: (c.topics ?? []).map((t: any) => ({
            id: t.id, name: t.name,
            indicators: (t.indicators ?? []).map((i: any) => ({
              id: i.id, name: i.name, maxScore: i.maxScore, scoreType: c.scoreType || 'score',
              description: i.description || i.description || "", 
              detail: i.detail || i.detail || "", 
              notes: i.notes || i.notes || "",
              evidenceDescription: i.evidenceDescription || i.evidence_description || "",
              scoringCriteria: Array.isArray(i.scoringCriteria) ? i.scoringCriteria : (Array.isArray(i.scoring_criteria) ? i.scoring_criteria : []),
              isHeader: i.isHeader || i.is_header,
              parentId: i.parentId || i.parent_id,
              sortOrder: i.sortOrder || i.sort_order || 0,
            })),
          })),
        }));
        setProgramName(prog?.name ?? "");
        if (prog?.scoringType) setProgramScoringType(prog.scoringType);
        setCategories(cats);

        // ประมวลผล scoring levels
        setScoringLevels((levRes.data ?? []));

        // ประมวลผล existing evaluation
        if (evalData) {
          setEvaluationId(evalData.id);
          setEvaluationStatus(evalData.status);
          if (evalData.evaluationType) setEvaluationType(evalData.evaluationType);
          const loadedScores: Record<string, number> = {};
          const loadedDetails: Record<string, string> = {};
          const loadedCommittee: Record<string, number> = {};
          const loadedCommitteeComments: Record<string, string> = {};
          const loadedFiles: Record<string, any[]> = {};
          (evalData.evaluationScores ?? []).forEach((s: any) => {
            loadedScores[s.indicatorId] = Number(s.score);
            if (s.notes) loadedDetails[s.indicatorId] = s.notes;
            if (s.committeeScore !== null && s.committeeScore !== undefined) {
              loadedCommittee[s.indicatorId] = Number(s.committeeScore);
            }
            if (s.evidenceUrl) loadedCommitteeComments[s.indicatorId] = s.evidenceUrl;
            if (Array.isArray(s.fileUrls) && s.fileUrls.length > 0) loadedFiles[s.indicatorId] = s.fileUrls;
          });
          setScores(loadedScores);
          setImplDetails(loadedDetails);
          setCommitteeScores(loadedCommittee);
          setCommitteeComments(loadedCommitteeComments);
          setUploadedFiles(loadedFiles);

          // โหลด notification แบบ non-blocking (ไม่ delay การแสดง UI หลัก)
          if (evalData.id) {
            apiClient.get(`evaluation/${evalData.id}/notifications?direction=committee_to_evaluatee`)
              .then(({ data: notifs }) => {
                const notifMap = new Map<string, { prevScore: number | null; newScore: number | null }>();
                (notifs as { indicatorId: string; isRead: boolean; committeeScore: number | null; prevCommitteeScore: number | null }[])
                  .filter((n) => !n.isRead)
                  .forEach((n) => notifMap.set(n.indicatorId, { prevScore: n.prevCommitteeScore, newScore: n.committeeScore }));
                setNewCommitteeIndicatorIds(notifMap);
              })
              .catch(() => { /* ไม่มี notification ยังไม่เป็นไร */ });
          }
        }
      } catch (err) {
        toast.error("ไม่สามารถโหลดข้อมูลแบบประเมินได้");
      } finally {
        setEvalLoading(false);
      }
    };

    load();
  }, [programId]);

  // ── Score handlers ─────────────────────────────────────────────────────────
  const handleScoreChange     = (id: string, v: number)  => { setScores(p => ({ ...p, [id]: v })); setDirtyIndicatorIds(p => new Set(p).add(id)); };
  const handleFilesChange     = (id: string, f: UploadedFile[]) => { setUploadedFiles(p => ({ ...p, [id]: f })); setDirtyIndicatorIds(p => new Set(p).add(id)); };
  const handleDetailChange    = (id: string, v: string)  => { setImplDetails(p => ({ ...p, [id]: v })); setDirtyIndicatorIds(p => new Set(p).add(id)); };

  // POST /evaluation/score — save per indicator
  const handleSaveIndicator = useCallback(async (indicatorId: string) => {
    if (!programId) return;
    const { data } = await apiClient.post("evaluation/score", {
      programId,
      indicatorId,
      score: scores[indicatorId] ?? 0,
      notes: implDetails[indicatorId] ?? "",
      fileUrls: uploadedFiles[indicatorId] ?? [],
      ...(evaluationId ? { evaluationId } : { evaluationType, year }),
    });
    if (data?.evaluationId && !evaluationId) setEvaluationId(data.evaluationId);
    setDirtyIndicatorIds(p => { const n = new Set(p); n.delete(indicatorId); return n; });
    setLastSavedAt(new Date());
    toast.success("บันทึกเรียบร้อยแล้ว");
  }, [evaluationId, evaluationType, scores, implDetails, uploadedFiles, programId]);

  // ── Autosave dirty indicators every 30s ───────────────────────────────────
  useEffect(() => {
    const readOnly = evaluationStatus === "submitted" || evaluationStatus === "completed";
    if (readOnly || !evaluationId || !programId) return;
    const interval = setInterval(async () => {
      const dirty = Array.from(dirtyIndicatorIds);
      if (dirty.length === 0) return;
      try {
        await Promise.all(dirty.map(id =>
          apiClient.post("evaluation/score", {
            programId, indicatorId: id, evaluationId,
            score: scores[id] ?? 0,
            notes: implDetails[id] ?? "",
            fileUrls: uploadedFiles[id] ?? [],
          })
        ));
        setDirtyIndicatorIds(new Set());
        setLastSavedAt(new Date());
      } catch { /* silent — จะลองใหม่รอบถัดไป */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [evaluationId, evaluationStatus, programId, dirtyIndicatorIds, scores, implDetails, uploadedFiles]);

  // POST /evaluation/:id/submit — final submit
  const handleSubmitAll = async () => {
    if (!evaluationId) return;
    setSubmitting(true);
    try {
      await apiClient.post(`evaluation/${evaluationId}/submit`);
      toast.success("ส่งแบบประเมินตนเองเรียบร้อยแล้ว", {
        description: "ทีมงานจะตรวจสอบและแจ้งผลให้ทราบในภายหลัง",
        duration: 5000,
      });
      setEvaluationStatus("submitted");
      navigate("/register");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "เกิดข้อผิดพลาดในการส่งแบบประเมิน");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Visible categories — filtered by evaluationType + program settings ─────

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
    // type=new (default): only normal categories
    return categories.filter((c) => isNewType(c.scoreType));
  }, [categories, evaluationType]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const summaryData = useMemo(() =>
    visibleCategories.map((cat, idx) => {
      const isYesNo = cat.scoreType?.includes('yes_no');
      let totalScore = 0, totalMax = 0;
      let passCount = 0, totalIndicators = 0;
      cat.topics.forEach((t) => t.indicators.forEach((i) => {
        const hasChildren = t.indicators.some(other => other.parentId === i.id);
        if (i.isHeader || hasChildren) return;

        if (isYesNo) {
          totalIndicators++;
          if ((scores[i.id] ?? -1) === 1) passCount++;
        } else {
          totalScore += scores[i.id] ?? 0;
          totalMax   += i.maxScore;
        }
      }));
      return {
        id: cat.id, name: cat.name, score: totalScore,
        maxScore: cat.maxScore, maxScorePct: cat.maxScorePct, totalPossible: totalMax, index: idx,
        scoreType: cat.scoreType,
        ...(isYesNo ? { passCount, totalIndicators } : {}),
      };
    }),
  [scores, visibleCategories]);

  const committeeSummaryData = useMemo(() => {
    if (Object.keys(committeeScores).length === 0) return undefined;
    return visibleCategories.map((cat) => {
      const isYesNo = cat.scoreType?.includes('yes_no');
      let totalScore = 0, totalMax = 0;
      let passCount = 0, totalIndicators = 0;
      cat.topics.forEach((t) => t.indicators.forEach((i) => {
        const hasChildren = t.indicators.some(other => other.parentId === i.id);
        if (i.isHeader || hasChildren) return;

        if (isYesNo) {
          totalIndicators++;
          if ((committeeScores[i.id] ?? -1) === 1) passCount++;
        } else {
          totalScore += committeeScores[i.id] ?? 0;
          totalMax   += i.maxScore;
        }
      }));
      return {
        id: cat.id, name: cat.name, score: totalScore,
        maxScore: cat.maxScore, maxScorePct: cat.maxScorePct, totalPossible: totalMax,
        scoreType: cat.scoreType,
        ...(isYesNo ? { passCount, totalIndicators } : {}),
      };
    });
  }, [committeeScores, visibleCategories]);

  const allScored = useMemo(() => {
    if (visibleCategories.length === 0) return false;
    return visibleCategories.every(cat =>
      cat.topics.every(topic =>
        topic.indicators.every(ind => {
          const hasChildren = topic.indicators.some(other => other.parentId === ind.id);
          if (ind.isHeader || hasChildren) return true;
          return scores[ind.id] !== undefined;
        })
      )
    );
  }, [visibleCategories, scores]);

  const grandTotal    = summaryData.reduce((s, c) => c.scoreType === 'score_new' ? (s + c.score) : s, 0);
  const grandMax      = summaryData.reduce((s, c) => c.scoreType === 'score_new' ? (s + c.totalPossible) : s, 0);
  // yes/no totals — used when grandMax === 0
  const grandPassCount  = summaryData.reduce((s, c: any) => s + (c.passCount ?? 0), 0);
  const grandPassTotal  = summaryData.reduce((s, c: any) => s + (c.totalIndicators ?? 0), 0);
  const isYesNoProgram  = grandMax === 0 && grandPassTotal > 0;
  // unified values for display
  const displayTotal    = isYesNoProgram ? grandPassCount  : grandTotal;
  const displayMax      = isYesNoProgram ? grandPassTotal  : grandMax;
  const displayPct      = displayMax > 0 
    ? (isYesNoProgram 
        ? (displayTotal === displayMax ? 100 : Math.floor((displayTotal / displayMax) * 100))
        : summaryData?.some((c)=> c.scoreType === 'score_new' && c.maxScorePct)
          ? summaryData.reduce((s, c) => c.scoreType === 'score_new' ? s + Math.round((c.score * c.maxScorePct) / c.maxScore) : s, 0)
          : Math.round((displayTotal / displayMax) * 100)
    )
    : 0;
  const displayUnit     = isYesNoProgram ? "ผ่าน" : "";
  const grandCommitteeTotal = committeeSummaryData
    ? committeeSummaryData.reduce((s, c) => c.scoreType === 'score_new' ? (s + c.score) : s, 0)
    : undefined;

  const grandCommitteePassCount = committeeSummaryData
    ? committeeSummaryData.reduce((s, c: any) => s + (c.passCount ?? 0), 0)
    : undefined;

  const displayCommitteeTotal = isYesNoProgram ? grandCommitteePassCount : grandCommitteeTotal;
  const displayCommitteeMax   = isYesNoProgram ? grandPassTotal : grandMax;

  const grandTotalSp = summaryData.reduce((s, c) => c.scoreType !== 'score_new' ? (s + c.score) : s, 0);
  const grandCommitteeTotalSp = committeeSummaryData ? committeeSummaryData.reduce((s, c) => c.scoreType !== 'score_new' ? (s + c.score) : s, 0) : undefined;
  const grandMaxSp = summaryData.reduce((s, c) => c.scoreType !== 'score_new' ? (s + c.totalPossible) : s, 0);
  const displayPctSp =
    grandMaxSp > 0
      ? summaryData?.some((c)=> c.scoreType !== 'score_new' && c.maxScorePct)
        ? summaryData.reduce((s, c) => c.scoreType !== 'score_new' ? (s + Math.round((c.score * c.maxScorePct) / c.maxScore)) : s, 0)
        : Math.round((grandTotalSp / grandMaxSp) * 100)
      : 0;

  const activeLevel = useMemo(() => {
    return findScoringLevelMatch(attemptTypeCount, scoringLevels, evaluationType, displayPct, displayPctSp, isYesNoProgram);
  }, [scoringLevels, evaluationType, displayPct, displayPctSp, isYesNoProgram]);

  const committeePct = useMemo(() => {
    if (displayCommitteeTotal === undefined || displayCommitteeMax === 0) return 0;
    if (isYesNoProgram) return displayCommitteeTotal === displayCommitteeMax ? 100 : Math.floor((displayCommitteeTotal / displayCommitteeMax) * 100);
    return committeeSummaryData?.some((c)=> c.scoreType === 'score_new' && c.maxScorePct)
            ? committeeSummaryData.reduce((s, c) => c.scoreType === 'score_new' ? (s + Math.round((c.score * c.maxScorePct) / c.maxScore)) : s, 0)
            : Math.round((displayCommitteeTotal / displayCommitteeMax) * 100);
  }, [displayCommitteeTotal, displayCommitteeMax, isYesNoProgram]);

  const committeePctSp = useMemo(() => {
    if (grandCommitteeTotalSp === undefined || grandMaxSp === 0) return 0;
    return committeeSummaryData?.some((c)=> c.scoreType !== 'score_new' && c.maxScorePct)
            ? committeeSummaryData.reduce((s, c) => c.scoreType !== 'score_new' ? (s + Math.round((c.score * c.maxScorePct) / c.maxScore)): s, 0)
            : Math.round((grandCommitteeTotalSp / grandMaxSp) * 100);
  }, [grandCommitteeTotalSp, grandMaxSp])

  const committeeActiveLevel = useMemo(() => {
    if (displayCommitteeTotal === undefined) return null;
    return findScoringLevelMatch(attemptTypeCount, scoringLevels, evaluationType, committeePct, committeePctSp, isYesNoProgram);
  }, [scoringLevels, evaluationType, committeePct, committeePctSp, isYesNoProgram, displayCommitteeTotal]);

  // ── Wizard flat list ───────────────────────────────────────────────────────
  const flatIndicators = useMemo(() => {
    const items: Array<{
      indicator: Category["topics"][0]["indicators"][0];
      colorIndex: number;
    }> = [];
    visibleCategories.forEach((cat, catIdx) => {
      cat.topics.forEach((topic) => {
        topic.indicators.forEach((indicator) => {
          const hasChildren = topic.indicators.some(i => i.parentId === indicator.id);
          if (!indicator.isHeader && !hasChildren) {
            items.push({ indicator, colorIndex: catIdx });
          }
        });
      });
    });
    return items;
  }, [visibleCategories]);

  // สุ่มคะแนนทุกตัวชี้วัดแล้วบันทึก
  const handleFillMode = async (mode: "full" | "good" | "mid" | "bad" | "clear") => {
    if (!programId) return;
    const pickYesNo = (): number => {
      if (mode === "full") return 1;
      if (mode === "good") return Math.random() < 0.85 ? 1 : 0;
      if (mode === "mid")  return Math.random() < 0.5  ? 1 : 0;
      if (mode === "bad")  return Math.random() < 0.2  ? 1 : 0;
      return -1; // clear
    };
    const pickScore = (maxScore: number, criteria: { score: number; label: string }[]) => {
      const sorted = [...(criteria.length > 0 ? criteria.map(c => c.score) : Array.from({ length: maxScore + 1 }, (_, i) => i))].sort((a, b) => a - b);
      const n = sorted.length;
      if (mode === "full")  return sorted[n - 1];
      if (mode === "good")  return sorted[Math.max(0, n - 1 - Math.floor(Math.random() * Math.ceil(n * 0.25)))];
      if (mode === "mid")   { const mid = Math.floor(n / 2); return sorted[mid - 1 + Math.floor(Math.random() * 3) - 1 < 0 ? mid : mid - 1 + Math.floor(Math.random() * 3)]; }
      if (mode === "bad")   return sorted[Math.floor(Math.random() * Math.max(1, Math.ceil(n * 0.35)))];
      return 0;
    };
    const newScores: Record<string, number> = {};
    for (const { indicator } of flatIndicators) {
      const isYesNo = indicator.scoreType?.includes('yes_no');
      newScores[indicator.id] = isYesNo ? pickYesNo() : (mode === "clear" ? 0 : pickScore(indicator.maxScore, indicator.scoringCriteria ?? []));
    }
    setScores((prev) => ({ ...prev, ...newScores }));
    let currentEvalId = evaluationId;
    for (const { indicator } of flatIndicators) {
      const { data } = await apiClient.post("evaluation/score", {
        programId,
        indicatorId: indicator.id,
        score: newScores[indicator.id],
        notes: implDetails[indicator.id] ?? "",
        ...(currentEvalId ? { evaluationId: currentEvalId } : { evaluationType, year }),
      });
      if (data?.evaluationId && !currentEvalId) {
        currentEvalId = data.evaluationId;
        setEvaluationId(currentEvalId);
      }
    }
    const labels: Record<string, string> = { full: "เต็ม", good: "ดีแต่ไม่เต็ม", mid: "กลางๆ", bad: "แย่ๆ", clear: "ล้างคะแนน" };
    toast.success(mode === "clear" ? "ล้างคะแนนแล้ว" : `สุ่มคะแนน${labels[mode]}ครบ ${flatIndicators.length} ตัวชี้วัดแล้ว`);
  };

  const handleOpenWizard = useCallback((indicator: Category["topics"][0]["indicators"][0]) => {
    const idx = flatIndicators.findIndex((item) => item.indicator.id === indicator.id);
    if (idx !== -1) setWizardIndex(idx);
    // mark notification as read
    if (evaluationId && newCommitteeIndicatorIds.has(indicator.id)) {
      apiClient.post(`evaluation/${evaluationId}/notifications/read`, {
        direction: "committee_to_evaluatee",
        indicatorIds: [indicator.id],
      }).catch(() => {});
      setNewCommitteeIndicatorIds((prev) => {
        const next = new Map(prev);
        next.delete(indicator.id);
        return next;
      });
    }
  }, [flatIndicators, evaluationId, newCommitteeIndicatorIds]);

  const wizardItem = wizardIndex !== null ? flatIndicators[wizardIndex] : null;

  const navItems: IndicatorNavItem[] = useMemo(() =>
    flatIndicators.map(({ indicator, colorIndex }) => ({
      id: indicator.id,
      name: indicator.name,
      score: scores[indicator.id] ?? 0,
      maxScore: indicator.maxScore,
      color: getCategoryColor(colorIndex),
    })),
  [flatIndicators, scores]);
  const totalTopics   = visibleCategories.reduce((s, c) => s + c.topics.length, 0);
  const totalIndicators = visibleCategories.reduce((s, c) => s + c.topics.reduce((ts, t) => ts + t.indicators.length, 0), 0);

  // Derived from evaluationStatus
  const isEvalReadOnly = evaluationStatus === "submitted" || evaluationStatus === "completed";
  const isEvalCompleted = evaluationStatus === "completed";

  const evalStatusConfig: Record<string, { label: string; icon: React.ReactNode; badge: string; banner?: string }> = {
    draft:     { label: "ร่าง",             icon: <FileText className="h-3.5 w-3.5" />,    badge: "bg-gray-100 text-gray-600 border-gray-300" },
    submit:    { label: "รอผู้ประเมิน",     icon: <Clock className="h-3.5 w-3.5" />,        badge: "bg-blue-100 text-blue-700 border-blue-300" },
    submitted: { label: "รอผู้ประเมิน",     icon: <Clock className="h-3.5 w-3.5" />,        badge: "bg-blue-100 text-blue-700 border-blue-300" },
    complete:  { label: "ประเมินเสร็จสิ้น", icon: <CheckCircle2 className="h-3.5 w-3.5" />, badge: "bg-green-100 text-green-700 border-green-300" },
    completed: { label: "ประเมินเสร็จสิ้น", icon: <CheckCircle2 className="h-3.5 w-3.5" />, badge: "bg-green-100 text-green-700 border-green-300" },
    revision:  { label: "ส่งกลับแก้ไข",    icon: <AlertCircle className="h-3.5 w-3.5" />,  badge: "bg-amber-100 text-amber-700 border-amber-300", banner: "bg-amber-50 border-amber-300 text-amber-800" },
    cancel:    { label: "ยกเลิก",           icon: <XCircle className="h-3.5 w-3.5" />,      badge: "bg-red-100 text-red-700 border-red-300",    banner: "bg-red-50 border-red-300 text-red-800" },
  };
  const currentEvalStatus = evaluationStatus ? evalStatusConfig[evaluationStatus] : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (regLoading || !programId) {
    return (
      <div className="flex items-center justify-center min-h-full py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (evalLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  const glassCard = {
    background: "var(--glass-bg)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    boxShadow: "var(--glass-shadow)",
    border: "1px solid var(--glass-border)",
  } as React.CSSProperties;

  const hasScoreSp = evaluationType !== ScoringLevelType.new && scoringLevels.some((sl) => sl.type === evaluationType);

  return (
    <div className="h-full flex flex-col gap-3 p-4">

      {/* ════ Header glass card ════ */}
      <div className="px-4 py-3 rounded-2xl shrink-0" style={glassCard}>
        {/* Row 1: back + icon + title + right actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/register")} className="shrink-0 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
            <ClipboardCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 data-testid="evaluation-form-title" className="text-sm font-bold leading-tight truncate" style={{ color: "var(--green-heading)" }}>ประเมิน {programName}</h2>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {evaluationType && EVAL_TYPE_CONFIG[evaluationType] && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-semibold border ${EVAL_TYPE_CONFIG[evaluationType].className}`}>
                  {EVAL_TYPE_CONFIG[evaluationType].icon}{EVAL_TYPE_CONFIG[evaluationType].label}
                </span>
              )}
              {currentEvalStatus && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-semibold border ${currentEvalStatus.badge}`}>
                  {currentEvalStatus.icon}{currentEvalStatus.label}
                </span>
              )}
              {year && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-medium border border-border bg-muted/60 text-muted-foreground">
                  พ.ศ. {year + 543}
                </span>
              )}
              <span className="text-[0.625rem]" style={{ color: "var(--green-muted)" }}>
                {visibleCategories.length} หมวด · {totalTopics} ประเด็น · {totalIndicators} ตัวชี้วัด{!isYesNoProgram ? ` · เต็ม ${grandMax}` : ""}
              </span>
            </div>
            {!isEvalReadOnly && (
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-medium border ${dirtyIndicatorIds.size > 0 ? "border-amber-300 bg-amber-50 text-amber-600" : "border-green-200 bg-green-50 text-green-600"}`}>
                  <Save className="h-2.5 w-2.5" />
                  {dirtyIndicatorIds.size > 0
                    ? `ยังไม่บันทึก ${dirtyIndicatorIds.size} รายการ`
                    : lastSavedAt
                      ? `บันทึกล่าสุด ${lastSavedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`
                      : "autosave เปิดอยู่"}
                </span>
              </div>
            )}
          </div>
          {/* Scores and Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex flex-col sm:flex-row flex-1 items-end gap-2">
              <div className="inline-flex flex-col gap-1 items-end">
                <p className="text-[0.5625rem] font-semibold text-muted-foreground uppercase tracking-wider">คะแนนรวม</p>
                <div className="flex flex-col w-full">
                  <p className={`flex w-full ${hasScoreSp ? 'justify-between' : 'justify-end'} items-center text-base font-bold text-primary leading-tight`}>
                    {hasScoreSp &&
                      <span className="mr-2 text-start text-xs font-normal text-amber-700">
                        {labelScoreType(visibleCategories, ScoringLevelType.new)}
                      </span>
                    }
                    {displayMax > 0 && <span className="text-end">{displayPct}%</span>}
                  </p>
                  <span className="text-end text-[0.6rem] text-primary font-semibold">
                    <AnimatedScore value={displayTotal}>
                        {displayTotal}{displayUnit && <span className="text-end font-normal ml-0.5">{displayUnit}</span>}
                    </AnimatedScore>
                    <span className="text-end font-normal text-muted-foreground">/{displayMax}</span>
                  </span>
                </div>
                {hasScoreSp &&
                  <div className="flex flex-col w-full">
                    <p className="flex w-full justify-between items-center text-base font-bold text-primary leading-tight">
                      <span className="mr-2 text-start text-xs font-normal text-amber-700">{labelScoreType(visibleCategories, evaluationType)}</span>
                      {grandMaxSp > 0 && <span className="text-end">{displayPctSp}%</span>}
                    </p>
                    <span className="text-end text-[0.6rem] text-primary font-semibold">
                      <AnimatedScore value={grandTotalSp}>
                        {grandTotalSp}{displayUnit && <span className="text-end font-normal ml-0.5">{displayUnit}</span>}
                      </AnimatedScore>
                      <span className="text-end font-normal text-muted-foreground">/{grandMaxSp}</span>
                    </span>
                  </div>
                }
                
                {activeLevel && (
                  <div className="flex w-full justify-end">
                    <div className="score-active-wrap origin-right">
                      <div className="score-sparkles">
                        <div className="score-sparkle" />
                        <div className="score-sparkle" />
                        <div className="score-sparkle" />
                        <div className="score-sparkle" />
                        <div className="score-sparkle" />
                      </div>
                      {(() => {
                        const IconComp = ICON_MAP[activeLevel.icon] ?? Trophy;
                        return (
                          <div className="score-active-badge inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-white font-bold shrink-0"
                            style={{ background: `linear-gradient(135deg, ${activeLevel.color}cc 0%, ${activeLevel.color} 100%)`, boxShadow: `0 2px 10px ${activeLevel.color}40` }}>
                            <IconComp className="score-active-icon h-3.5 w-3.5 shrink-0" />
                            <span className="text-xs">{activeLevel.name}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {!isEvalReadOnly && !evalLoading && (
                  <DropdownMenu open={copyDropdownOpen} onOpenChange={handleCopyDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <button className="mt-0.5 text-[0.5625rem] text-blue-500 hover:text-blue-700 underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0 leading-tight">
                        คัดลอกคะแนน
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[180px]">
                      {!copyHistoryLoaded ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">กำลังโหลด...</div>
                      ) : copyHistoryEvals.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">ไม่พบประวัติการประเมิน</div>
                      ) : (
                        <>
                          <div className="px-3 py-1.5 text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-wider border-b">
                            เลือกปีที่ต้องการคัดลอก
                          </div>
                          {copyHistoryEvals.map((e) => (
                            <DropdownMenuItem
                              key={e.evaluationId}
                              onClick={() => handleCopyScoreFromEval(e.evaluationId)}
                              className="gap-2 text-sm"
                            >
                              <span className="font-semibold">พ.ศ. {e.year + 543}</span>
                              {e.evaluationType && EVAL_TYPE_CONFIG[e.evaluationType] && (
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[0.625rem] font-medium border ${EVAL_TYPE_CONFIG[e.evaluationType].className}`}>
                                  {EVAL_TYPE_CONFIG[e.evaluationType].label}
                                </span>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {displayCommitteeTotal !== undefined && (
                <>
                  <div className="w-px self-stretch bg-border mx-1" />
                  <div className="inline-flex flex-col gap-1 items-end">
                    <p className="text-[0.5625rem] font-semibold text-muted-foreground uppercase tracking-wider">กรรมการ</p>
                    <div className="flex flex-col w-full">
                      <p className={`flex w-full ${hasScoreSp ? 'justify-between' : 'justify-end'} items-center text-base font-bold text-muted-foreground leading-tight`}>
                        {hasScoreSp &&
                          <span className="mr-2 text-start text-xs font-normal text-amber-700">
                            {labelScoreType(visibleCategories, ScoringLevelType.new)}
                          </span>
                        }
                        {displayCommitteeMax > 0 && <span className="text-end">{committeePct}%</span>}
                      </p>
                      <span className="text-end text-[0.6rem] text-muted-foreground font-semibold">
                        <AnimatedScore value={displayCommitteeTotal ?? 0}>
                          {displayCommitteeTotal}{displayUnit && <span className="text-end font-normal ml-0.5">{displayUnit}</span>}
                        </AnimatedScore>
                        <span className="text-end font-normal">/{displayCommitteeMax}</span>
                      </span>
                    </div>
                    {hasScoreSp &&
                      <div className="flex flex-col w-full">
                        <p className="flex w-full justify-between items-center text-base font-bold text-muted-foreground leading-tight">
                          <span className="mr-2 text-start text-xs font-normal text-amber-700">{labelScoreType(visibleCategories, evaluationType)}</span>
                          {grandMaxSp > 0 && <span className="text-end">{committeePctSp}%</span>}
                        </p>
                        <span className="text-end text-[0.6rem] text-muted-foreground font-semibold">
                          <AnimatedScore value={grandCommitteeTotalSp}>
                            {grandCommitteeTotalSp}{displayUnit && <span className="text-end font-normal ml-0.5">{displayUnit}</span>}
                          </AnimatedScore>
                          <span className="text-end font-normal">/{grandMaxSp}</span>
                        </span>
                      </div>
                    }
                    
                    {committeeActiveLevel && (
                      <div className="flex w-full justify-end">
                        <div className="score-active-wrap origin-right">
                          <div className="score-sparkles">
                            <div className="score-sparkle" />
                            <div className="score-sparkle" />
                            <div className="score-sparkle" />
                            <div className="score-sparkle" />
                            <div className="score-sparkle" />
                          </div>
                          {(() => {
                            const IconComp = ICON_MAP[committeeActiveLevel.icon] ?? Trophy;
                            return (
                              <div className="score-active-badge inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-white font-bold shrink-0"
                                style={{ background: `linear-gradient(135deg, ${committeeActiveLevel.color}cc 0%, ${committeeActiveLevel.color} 100%)`, boxShadow: `0 2px 10px ${committeeActiveLevel.color}40` }}>
                                <IconComp className="score-active-icon h-3.5 w-3.5 shrink-0" />
                                <span className="text-xs">{committeeActiveLevel.name}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex flex-1 items-center gap-1.5">
              {!isEvalReadOnly && !evalLoading && categories.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 text-purple-600 border-purple-300 hover:bg-purple-50 text-[10px] h-7 px-2 shrink-0">
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
              )}
            </div>
          </div>
        </div>

        {/* Banner */}
        {currentEvalStatus?.banner && (
          <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-xs font-medium ${currentEvalStatus.banner}`}>
            {currentEvalStatus.icon}
            {evaluationStatus === "revision" && "เอกสารนี้ถูกส่งกลับเพื่อแก้ไข กรุณาตรวจสอบและส่งใหม่อีกครั้ง"}
            {evaluationStatus === "cancel" && "เอกสารนี้ถูกยกเลิกแล้ว"}
          </div>
        )}
      </div>

      {/* ════ Scrollable content glass card ════ */}
      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={glassCard}>
        <div className="h-full overflow-y-auto px-4 py-4 space-y-4">

        {evalLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Score summary grid */}
            {summaryData.length > 0 && <ScoreSummary data={summaryData} committeeData={committeeSummaryData} onCategoryClick={handleCategoryClick} />}

            {/* Category cards */}
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
                implementationDetails={implDetails}
                onImplementationDetailChange={handleDetailChange}
                userRole="user"
                onIndicatorClick={handleOpenWizard}
                newIndicatorNotifs={newCommitteeIndicatorIds}
                forceOpen={expandedCategoryId === category.id}
              />
            ))}

            {/* No categories */}
            {visibleCategories.length === 0 && (
              <Card>
                <CardContent className="py-16 flex flex-col items-center gap-2 text-center">
                  <ClipboardCheck className="h-10 w-10 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">ยังไม่มีแบบประเมินสำหรับโครงการนี้</p>
                </CardContent>
              </Card>
            )}

            {/* Submit / Success / Completed */}
            {visibleCategories.length > 0 && (
              isEvalCompleted ? (
                <div className="flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/40 p-5">
                  <CheckCircle2 className="h-7 w-7 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-300">ผลการประเมินเสร็จสมบูรณ์แล้ว</p>
                    <p className="text-sm text-blue-700/70 dark:text-blue-400/70">คณะกรรมการได้ยืนยันผลการประเมินเรียบร้อยแล้ว</p>
                  </div>
                </div>
              ) : isEvalReadOnly ? (
                <div className="flex items-center gap-4 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/40 p-5">
                  <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300">ส่งแบบประเมินตนเองเรียบร้อยแล้ว</p>
                    <p className="text-sm text-green-700/70 dark:text-green-400/70">ทีมงานจะตรวจสอบและแจ้งผลให้ทราบในภายหลัง</p>
                  </div>
                </div>
              ) : (
                <Button
                  data-testid="submit-evaluation-btn"
                  aria-label="ส่งแบบประเมินตนเอง"
                  onClick={handleSubmitAll}
                  disabled={submitting || !allScored}
                  size="lg"
                  className="w-full h-12 text-base font-bold gap-2"
                >
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" />กำลังส่งแบบประเมิน...</>
                    : !allScored
                      ? <><ClipboardCheck className="h-4 w-4" />กรุณาประเมินให้ครบทุกตัวชี้วัด</>
                      : evaluationStatus === "revision"
                        ? <><RotateCcw className="h-4 w-4" />ส่งแบบประเมินใหม่อีกครั้ง</>
                        : <><ClipboardCheck className="h-4 w-4" />ส่งแบบประเมินตนเอง</>}
                </Button>
              )
            )}
          </>
        )}
        </div>
      </div>

      {/* ════ Global Wizard Dialog ════ */}
      {wizardItem && (
        <IndicatorDialog
          indicator={wizardItem.indicator}
          score={scores[wizardItem.indicator.id] ?? 0}
          onScoreChange={(v) => handleScoreChange(wizardItem.indicator.id, v)}
          committeeScore={committeeScores[wizardItem.indicator.id]}
          committeeComment={committeeComments[wizardItem.indicator.id]}
          color={getCategoryColor(wizardItem.colorIndex)}
          files={uploadedFiles[wizardItem.indicator.id] ?? []}
          onFilesChange={(f) => handleFilesChange(wizardItem.indicator.id, f)}
          open={wizardIndex !== null}
          onOpenChange={(open) => { if (!open) setWizardIndex(null); }}
          onSave={isEvalReadOnly ? undefined : () => handleSaveIndicator(wizardItem.indicator.id)}
          implementationDetail={implDetails[wizardItem.indicator.id] ?? ""}
          onImplementationDetailChange={(v) => handleDetailChange(wizardItem.indicator.id, v)}
          readOnly={isEvalReadOnly}
          userRole="user"
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
}
