import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, MapPin, Phone, Mail, User, ClipboardCheck,
  Loader2, CheckCircle2, CalendarDays, Hash, ArrowLeft,
  Clock, FileText, AlertCircle, XCircle, RotateCcw,
  FilePlus, RefreshCw, TrendingUp,
  Trophy, Medal, Award, Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryCard, IndicatorDialog, getCategoryColor } from "@/components/CategoryCard";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { UploadedFile, IndicatorNavItem } from "@/components/CategoryCard";
import { ScoreSummary } from "@/components/ScoreSummary";
import { SelfEvalHeader } from "@/components/self-eval/SelfEvalHeader";
import { ScoringLevelBadges } from "@/components/self-eval/ScoringLevelBadges";
import { Category } from "@/data/evaluationData";

// Category extended with scoreType / upgrade-renew settings from DB
interface EvalCategory extends Category {
  scoreType?: string;
  upgradeMode?: string | null;
  renewMode?: string | null;
}
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const EVAL_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  new:     { label: "ประเมินใหม่",             icon: <FilePlus   className="h-3 w-3" />, className: "bg-blue-50 text-blue-700 border-blue-200"     },
  renew:   { label: "ต่ออายุใบประกาศนียบัตร", icon: <RefreshCw  className="h-3 w-3" />, className: "bg-amber-50 text-amber-700 border-amber-200"   },
  upgrade: { label: "ยกระดับคะแนน",           icon: <TrendingUp className="h-3 w-3" />, className: "bg-purple-50 text-purple-700 border-purple-200" },
};

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
}


const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:  { label: "รอดำเนินการ",         variant: "secondary" },
  selected: { label: "ผ่านการคัดเลือก",      variant: "default" },
  rejected: { label: "ไม่ผ่านการคัดเลือก",   variant: "destructive" },
};

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
  const [committeeScores, setCommitteeScores] = useState<Record<string, number>>({});
  const [committeeComments, setCommitteeComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting]         = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState<string | null>(null);
  const [wizardIndex, setWizardIndex]       = useState<number | null>(null);
  // notification ของ indicator ที่กรรมการ comment/ให้คะแนนใหม่
  const [newCommitteeIndicatorIds, setNewCommitteeIndicatorIds] = useState<Map<string, { prevScore: number | null; newScore: number | null }>>(new Map());
  const navigate = useNavigate();
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

        // 1. Form structure — GET /programs/:id/evaluation-form
        const { data: formData } = await apiClient.get(`programs/${programId}/evaluation-form`);
        const prog = formData?.program;
        const cats: EvalCategory[] = (formData?.categories ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          maxScore: c.maxScore,
          scoreType: c.scoreType ?? "score",
          upgradeMode: c.upgradeMode ?? null,
          renewMode: c.renewMode ?? null,
          topics: (c.topics ?? []).map((t: any) => ({
            id: t.id,
            name: t.name,
            indicators: (t.indicators ?? []).map((i: any) => ({
              id: i.id,
              name: i.name,
              maxScore: i.maxScore,
              scoreType: c.scoreType || 'score',
              description: i.description ?? "",
              detail: i.detail ?? "",
              notes: i.notes ?? "",
              evidenceDescription: i.evidenceDescription ?? "",
              scoringCriteria: Array.isArray(i.scoringCriteria) ? i.scoringCriteria : [],
            })),
          })),
        }));
        setProgramName(prog?.name ?? "");
        if (prog?.scoringType) setProgramScoringType(prog.scoringType);
        setCategories(cats);

        // 2. Scoring levels (optional — ignore if not available)
        try {
          const { data: levData } = await apiClient.get(`scoring-levels?programId=${programId}`);
          setScoringLevels(
            (levData ?? []).sort((a: ScoringLevel, b: ScoringLevel) => a.sortOrder - b.sortOrder)
          );
        } catch { /* no scoring levels configured */ }

        // 3. Check latest evaluation status — if completed, create a new draft explicitly
        let isLastCompleted = false;
        if (!urlEvalId) {
          try {
            const { data: statusData } = await apiClient.get(
              `evaluation/status?userId=${user?.id}&programId=${programId}`
            );
            if (statusData?.self_status === "completed") {
              isLastCompleted = true;
            }
          } catch { /* no status record yet — treat as new */ }
        }

        if (isLastCompleted && !urlEvalId) {
          // POST /evaluation to create a brand-new draft (backend findFirst would reuse old otherwise)
          const { data: newEval } = await apiClient.post("evaluation", {
            programId,
            userId: user?.id,
            evaluationType: urlEvalType,
            year: selectedYear,
          });
          if (newEval?.id) {
            setEvaluationId(newEval.id);
            setEvaluationStatus("draft");
          }
        } else {
          // 4. Load existing evaluation
          const fetchUrl = urlEvalId ? `evaluation/${urlEvalId}` : `evaluation/program/${programId}`;
          const { data: evalData } = await apiClient.get(fetchUrl);
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

            // โหลด notification จากกรรมการ
            if (evalData.id) {
              try {
                const { data: notifs } = await apiClient.get(
                  `evaluation/${evalData.id}/notifications?direction=committee_to_evaluatee`
                );
                const notifMap = new Map<string, { prevScore: number | null; newScore: number | null }>();
                (notifs as { indicatorId: string; isRead: boolean; committeeScore: number | null; prevCommitteeScore: number | null }[])
                  .filter((n) => !n.isRead)
                  .forEach((n) => notifMap.set(n.indicatorId, {
                    prevScore: n.prevCommitteeScore,
                    newScore: n.committeeScore,
                  }));
                setNewCommitteeIndicatorIds(notifMap);
              } catch { /* ไม่มี notification ยังไม่เป็นไร */ }
            }
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
  const handleScoreChange     = (id: string, v: number)  => setScores(p => ({ ...p, [id]: v }));
  const handleFilesChange     = (id: string, f: UploadedFile[]) => setUploadedFiles(p => ({ ...p, [id]: f }));
  const handleDetailChange    = (id: string, v: string)  => setImplDetails(p => ({ ...p, [id]: v }));

  // POST /evaluation/score — auto-save per indicator
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
    toast.success("บันทึกเรียบร้อยแล้ว");
  }, [evaluationId, evaluationType, scores, implDetails, uploadedFiles, programId]);

  // POST /evaluation/:id/submit — final submit
  const handleSubmitAll = async () => {
    if (!programId) return;
    setSubmitting(true);
    try {
      // Save any unsaved scores first
      let currentEvalId = evaluationId;
      for (const cat of visibleCategories) {
        for (const topic of cat.topics) {
          for (const ind of topic.indicators) {
            const { data } = await apiClient.post("evaluation/score", {
              programId,
              indicatorId: ind.id,
              score: scores[ind.id] ?? 0,
              notes: implDetails[ind.id] ?? "",
              ...(currentEvalId ? { evaluationId: currentEvalId } : { evaluationType, year }),
            });
            if (data?.evaluationId && !currentEvalId) {
              currentEvalId = data.evaluationId;
              setEvaluationId(currentEvalId);
            }
          }
        }
      }

      // Submit
      if (!currentEvalId) throw new Error("ไม่พบข้อมูลการประเมิน");
      await apiClient.post(`evaluation/${currentEvalId}/submit`);
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
  const isNewType    = (t?: string) => !t || t === "score" || t === "yes_no" || t === "score_new" || t === "yes_no_new";
  const isUpgradType = (t?: string) => t === "score_upgrad" || t === "yes_no_upgrad" || t === "upgrade";
  const isRenewType  = (t?: string) => t === "score_renew" || t === "yes_no_renew";

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
      let totalScore = 0, totalMax = 0, totalCommittee = 0;
      let passCount = 0, committeePassCount = 0, totalIndicators = 0;
      cat.topics.forEach((t) => t.indicators.forEach((i) => {
        if (isYesNo) {
          totalIndicators++;
          if ((scores[i.id] ?? -1) === 1) passCount++;
          if ((committeeScores[i.id] ?? -1) === 1) committeePassCount++;
        } else {
          totalScore     += scores[i.id] ?? 0;
          totalMax       += i.maxScore;
          totalCommittee += committeeScores[i.id] ?? 0;
        }
      }));
      const hasCommittee = Object.keys(committeeScores).length > 0;
      const res: any = {
        id: cat.id, name: cat.name, score: totalScore,
        maxScore: cat.maxScore, totalPossible: totalMax, index: idx,
        scoreType: cat.scoreType,
      };
      if (isYesNo) {
        res.passCount = passCount;
        res.totalIndicators = totalIndicators;
        res.committeePassCount = hasCommittee ? committeePassCount : undefined;
      } else {
        res.committeeScore = hasCommittee ? totalCommittee : undefined;
      }
      return res;
    }),
  [scores, categories, committeeScores]);

  const allScored = useMemo(() => {
    if (visibleCategories.length === 0) return false;
    return visibleCategories.every(cat =>
      cat.topics.every(topic =>
        topic.indicators.every(ind => scores[ind.id] !== undefined)
      )
    );
  }, [visibleCategories, scores]);

  const grandTotal    = summaryData.reduce((s, c) => s + c.score, 0);
  const grandMax      = summaryData.reduce((s, c) => s + c.totalPossible, 0);
  const grandCommitteeTotal = summaryData.every((s: any) => s.committeeScore === undefined)
    ? undefined
    : summaryData.reduce((s, c: any) => s + (c.committeeScore || 0), 0);

  // yes/no totals — used when grandMax === 0
  const grandPassCount  = summaryData.reduce((s, c: any) => s + (c.passCount ?? 0), 0);
  const grandPassTotal  = summaryData.reduce((s, c: any) => s + (c.totalIndicators ?? 0), 0);
  const isYesNoProgram  = grandMax === 0 && grandPassTotal > 0;
  // unified values for display
  const displayTotal    = isYesNoProgram ? grandPassCount  : grandTotal;
  const displayMax      = isYesNoProgram ? grandPassTotal  : grandMax;
  const displayPct      = displayMax > 0 ? Math.round((displayTotal / displayMax) * 100) : 0;
  const displayUnit     = isYesNoProgram ? "ผ่าน" : "";

  // ── Wizard flat list ───────────────────────────────────────────────────────
  const flatIndicators = useMemo(() => {
    const items: Array<{
      indicator: Category["topics"][0]["indicators"][0];
      colorIndex: number;
    }> = [];
    visibleCategories.forEach((cat, catIdx) => {
      cat.topics.forEach((topic) => {
        topic.indicators.forEach((indicator) => {
          items.push({ indicator, colorIndex: catIdx });
        });
      });
    });
    return items;
  }, [visibleCategories]);

  // สุ่มคะแนนทุกตัวชี้วัดแล้วบันทึก
  const handleFillMode = async (mode: "full" | "good" | "mid" | "bad" | "clear") => {
    if (!programId) return;
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
      newScores[indicator.id] = mode === "clear" ? 0 : pickScore(indicator.maxScore, indicator.scoringCriteria ?? []);
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
  const status = registration
    ? (statusMap[registration.status] ?? { label: registration.status, variant: "outline" as const })
    : { label: "ผ่านการคัดเลือก", variant: "default" as const };

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

  return (
    <div className="min-h-full bg-background">

      {/* ════ TOP ════ */}
      <div className="border-b bg-card/50 px-4 sm:px-6 py-3">
        {/* Row 1: back + icon + title + right actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/register")} className="shrink-0 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
            <ClipboardCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <h2 className="flex-1 min-w-0 text-sm font-bold text-foreground truncate">ประเมิน {programName}</h2>
          {/* Score + level badge — right side */}
          <div className="flex items-center gap-2 shrink-0">
            {displayMax > 0 && (programScoringType === 'yes_no' ? (
              (() => {
                const allPass = displayTotal === displayMax;
                return (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${allPass ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-rose-400 bg-rose-50 text-rose-700"}`}>
                    {allPass ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                    <div className="leading-tight">
                      <p className="font-semibold">{allPass ? "สอดคล้อง" : "ไม่สอดคล้อง"}</p>
                      <p className="opacity-70">{displayPct}%</p>
                    </div>
                  </div>
                );
              })()
            ) : scoringLevels.length > 0 && (() => {
              const lvl = [...scoringLevels].reverse().find(l => displayPct >= l.minScore && displayPct <= l.maxScore);
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
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">คะแนนรวม</p>
              <p className="text-base font-bold text-primary leading-tight">
                {displayTotal}{displayUnit && <span className="text-[10px] font-normal ml-0.5">{displayUnit}</span>}
                <span className="text-xs font-normal text-muted-foreground">/{displayMax}</span>
              </p>
              {displayMax > 0 && <p className="text-[9px] text-muted-foreground">{displayPct}%</p>}
            </div>
            {grandCommitteeTotal !== undefined && (
              <>
                <div className="w-px h-7 bg-border shrink-0" />
                <div className="text-right">
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">กรรมการ</p>
                  <p className="text-base font-bold text-muted-foreground leading-tight">
                    {grandCommitteeTotal}<span className="text-xs font-normal text-muted-foreground">/{grandMax}</span>
                  </p>
                </div>
              </>
            )}
            {!isEvalReadOnly && !evalLoading && categories.length > 0 && (
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
            )}
          </div>
        </div>
        {/* Row 2: badges + subinfo */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5 ml-[40px]">
          {evaluationType && EVAL_TYPE_CONFIG[evaluationType] && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${EVAL_TYPE_CONFIG[evaluationType].className}`}>
              {EVAL_TYPE_CONFIG[evaluationType].icon}
              {EVAL_TYPE_CONFIG[evaluationType].label}
            </span>
          )}
          {currentEvalStatus && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${currentEvalStatus.badge}`}>
              {currentEvalStatus.icon}
              {currentEvalStatus.label}
            </span>
          )}
          {year && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-border bg-muted/60 text-muted-foreground">
              พ.ศ. {year + 543}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {visibleCategories.length} หมวด · {totalTopics} ประเด็น · {totalIndicators} ตัวชี้วัด · คะแนนเต็ม {grandMax}
          </span>
        </div>
      </div>

      {/* ════ SCORING LEVEL STRIP ════ */}
      {!evalLoading && (scoringLevels.length > 0 || programScoringType === 'yes_no') && (
        <div className="px-4 sm:px-6 py-2 border-b bg-card/30 flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex-1 min-w-0">
            {programScoringType === 'yes_no' ? (
              (() => {
                const allPass = displayMax > 0 && displayTotal === displayMax;
                return (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${allPass ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-rose-400 bg-rose-50 text-rose-700"}`}>
                    {allPass ? <><CheckCircle2 className="h-4 w-4" /> สอดคล้อง</> : <><XCircle className="h-4 w-4" /> ไม่สอดคล้อง</>}
                  </div>
                );
              })()
            ) : (
              <ScoringLevelBadges levels={scoringLevels} grandMax={displayMax} currentScore={displayTotal} />
            )}
          </div>
          {displayMax > 0 && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {programScoringType === 'yes_no' ? "วิธีคำนวณ (สอดคล้อง)" : isYesNoProgram ? "วิธีคำนวณ (ผ่าน/ไม่ผ่าน)" : "วิธีคำนวณ (คะแนน)"}
              </p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {displayTotal}/{displayMax}{(programScoringType === 'yes_no' || isYesNoProgram) ? " ข้อ" : ""} = {displayPct}%
              </p>
              {programScoringType === 'yes_no' && <p className="text-[10px] font-bold text-red-600">*ต้องสอดคล้องครบทุกข้อ</p>}
              {programScoringType !== 'yes_no' && !isYesNoProgram && grandMax > 0 && (
                <>
                  <p className="text-[10px] text-muted-foreground">คะแนนดิบ {grandTotal} ÷ {grandMax}</p>
                  <p className="text-[10px] font-bold text-red-600">{grandMax === 100 ? "*คำนวนแบบคะแนนเต็มหมวด" : "*คำนวนแบบคะแนนไม่เต็มหมวด"}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════ EVALUATION STATUS BANNER ════ */}
      {currentEvalStatus?.banner && (
        <div className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 border-b text-sm font-medium ${currentEvalStatus.banner}`}>
          {currentEvalStatus.icon}
          {evaluationStatus === "revision" && "เอกสารนี้ถูกส่งกลับเพื่อแก้ไข กรุณาตรวจสอบและส่งใหม่อีกครั้ง"}
          {evaluationStatus === "cancel" && "เอกสารนี้ถูกยกเลิกแล้ว"}
        </div>
      )}

      {/* ════ EVALUATION FORM ════ */}
      <div className="px-4 sm:px-6 py-6 space-y-6">

        {evalLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Score summary grid */}
            {summaryData.length > 0 && <ScoreSummary data={summaryData} />}

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

// ─── Helper: InfoTile ─────────────────────────────────────────────────────────
function InfoTile({
  icon, label, children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 bg-muted/40 rounded-xl p-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        {children}
      </div>
    </div>
  );
}
