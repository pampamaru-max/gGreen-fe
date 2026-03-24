import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, MapPin, Phone, Mail, User, ClipboardCheck,
  Loader2, CheckCircle2, CalendarDays, Hash, ArrowLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryCard, IndicatorDialog, getCategoryColor } from "@/components/CategoryCard";
import type { UploadedFile, IndicatorNavItem } from "@/components/CategoryCard";
import { ScoreSummary } from "@/components/ScoreSummary";
import { SelfEvalHeader } from "@/components/self-eval/SelfEvalHeader";
import { ScoringLevelBadges } from "@/components/self-eval/ScoringLevelBadges";
import { Category } from "@/data/evaluationData";
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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
  const [categories, setCategories]         = useState<Category[]>([]);
  const [scoringLevels, setScoringLevels]   = useState<ScoringLevel[]>([]);
  const [scores, setScores]                 = useState<Record<string, number>>({});
  const [uploadedFiles, setUploadedFiles]   = useState<Record<string, UploadedFile[]>>({});
  const [implDetails, setImplDetails]       = useState<Record<string, string>>({});
  const [evaluationId, setEvaluationId]     = useState<string | null>(null);
  const [submitting, setSubmitting]         = useState(false);
  const [submitted, setSubmitted]           = useState(false);
  const [wizardIndex, setWizardIndex]       = useState<number | null>(null);
  const navigate = useNavigate();

  // ── Fetch evaluation form + existing answers ───────────────────────────────
  useEffect(() => {
    if (!programId) return;

    const load = async () => {
      setEvalLoading(true);
      try {
        // 1. Form structure — GET /programs/:id/evaluation-form
        const { data: formData } = await apiClient.get(`programs/${programId}/evaluation-form`);
        const prog = formData?.program;
        const cats: Category[] = (formData?.categories ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          maxScore: c.maxScore,
          topics: (c.topics ?? []).map((t: any) => ({
            id: t.id,
            name: t.name,
            indicators: (t.indicators ?? []).map((i: any) => ({
              id: i.id,
              name: i.name,
              maxScore: i.maxScore,
              description: i.description ?? "",
              detail: i.detail ?? "",
              notes: i.notes ?? "",
              evidenceDescription: i.evidenceDescription ?? "",
              scoringCriteria: Array.isArray(i.scoringCriteria) ? i.scoringCriteria : [],
            })),
          })),
        }));
        setProgramName(prog?.name ?? "");
        setCategories(cats);

        // 2. Scoring levels (optional — ignore if not available)
        try {
          const { data: levData } = await apiClient.get(`scoring-levels?programId=${programId}`);
          setScoringLevels(
            (levData ?? []).sort((a: ScoringLevel, b: ScoringLevel) => a.sortOrder - b.sortOrder)
          );
        } catch { /* no scoring levels configured */ }

        // 3. Existing self-evaluation — GET /evaluation/program/:programId
        const { data: evalData } = await apiClient.get(`evaluation/program/${programId}`);
        if (evalData) {
          setEvaluationId(evalData.id);
          if (evalData.status === "submitted") setSubmitted(true);
          const loadedScores: Record<string, number> = {};
          const loadedDetails: Record<string, string> = {};
          (evalData.evaluationScores ?? []).forEach((s: any) => {
            loadedScores[s.indicatorId] = Number(s.score);
            if (s.notes) loadedDetails[s.indicatorId] = s.notes;
          });
          setScores(loadedScores);
          setImplDetails(loadedDetails);
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
      ...(evaluationId ? { evaluationId } : {}),
    });
    if (data?.evaluationId && !evaluationId) setEvaluationId(data.evaluationId);
    toast.success("บันทึกเรียบร้อยแล้ว");
  }, [evaluationId, scores, implDetails, programId]);

  // POST /evaluation/:id/submit — final submit
  const handleSubmitAll = async () => {
    if (!programId) return;
    setSubmitting(true);
    try {
      // Save any unsaved scores first
      let currentEvalId = evaluationId;
      for (const cat of categories) {
        for (const topic of cat.topics) {
          for (const ind of topic.indicators) {
            const { data } = await apiClient.post("evaluation/score", {
              programId,
              indicatorId: ind.id,
              score: scores[ind.id] ?? 0,
              notes: implDetails[ind.id] ?? "",
              ...(currentEvalId ? { evaluationId: currentEvalId } : {}),
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
      setSubmitted(true);
      navigate("/register");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "เกิดข้อผิดพลาดในการส่งแบบประเมิน");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const summaryData = useMemo(() =>
    categories.map((cat) => {
      let totalScore = 0, totalMax = 0;
      cat.topics.forEach((t) => t.indicators.forEach((i) => {
        totalScore += scores[i.id] ?? 0;
        totalMax   += i.maxScore;
      }));
      return { id: cat.id, name: cat.name, score: totalScore, maxScore: cat.maxScore, totalPossible: totalMax };
    }),
  [scores, categories]);

  const grandTotal    = summaryData.reduce((s, c) => s + c.score, 0);
  const grandMax      = summaryData.reduce((s, c) => s + c.totalPossible, 0);

  // ── Wizard flat list ───────────────────────────────────────────────────────
  const flatIndicators = useMemo(() => {
    const items: Array<{
      indicator: Category["topics"][0]["indicators"][0];
      colorIndex: number;
    }> = [];
    categories.forEach((cat, catIdx) => {
      cat.topics.forEach((topic) => {
        topic.indicators.forEach((indicator) => {
          items.push({ indicator, colorIndex: catIdx });
        });
      });
    });
    return items;
  }, [categories]);

  const handleOpenWizard = useCallback((indicator: Category["topics"][0]["indicators"][0]) => {
    const idx = flatIndicators.findIndex((item) => item.indicator.id === indicator.id);
    if (idx !== -1) setWizardIndex(idx);
  }, [flatIndicators]);

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
  const totalTopics   = categories.reduce((s, c) => s + c.topics.length, 0);
  const totalIndicators = categories.reduce((s, c) => s + c.topics.reduce((ts, t) => ts + t.indicators.length, 0), 0);
  const status = registration
    ? (statusMap[registration.status] ?? { label: registration.status, variant: "outline" as const })
    : { label: "ผ่านการคัดเลือก", variant: "default" as const };

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

      {/* ════ TOP — ข้อมูลผู้สมัคร ════ */}
      <div className="border-b bg-card/50 px-4 sm:px-6 py-5 space-y-4">

        {/* Back button */}
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground" onClick={() => navigate("/register")}>
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Button>

        {/* หัว: ชื่อองค์กร + สถานะ */}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 shrink-0">
            <Building2 className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-foreground">
                {registration?.organizationName ?? user?.name ?? "-"}
              </h2>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{registration?.organizationType ?? ""}</p>
          </div>
        </div>

        {/* รายละเอียด */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-sm">
          <InfoTile icon={<ClipboardCheck className="h-4 w-4 text-primary" />} label="โครงการ">
            <span className="font-semibold text-foreground">{registration?.programName ?? programId}</span>
          </InfoTile>
          <InfoTile icon={<MapPin className="h-4 w-4 text-muted-foreground" />} label="ที่อยู่">
            <span>{registration?.address ?? ""}</span>
            <span className="text-muted-foreground">
              {registration?.provinceName ?? registration?.province ?? user?.province ?? ""}
            </span>
          </InfoTile>
          <InfoTile icon={<User className="h-4 w-4 text-muted-foreground" />} label="ผู้ติดต่อ">
            <span className="font-medium">{registration?.contactName ?? user?.name ?? "-"}</span>
            {registration?.contactPhone && (
              <span className="flex items-center gap-1 text-muted-foreground text-xs">
                <Phone className="h-3 w-3" />{registration.contactPhone}
              </span>
            )}
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <Mail className="h-3 w-3" />{registration?.contactEmail ?? user?.email ?? "-"}
            </span>
          </InfoTile>
          <InfoTile icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />} label="วันที่เข้าร่วม">
            <span>
              {new Date(registration?.createdAt ?? user?.createdAt ?? Date.now())
                .toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            {registration && (
              <span className="flex items-center gap-1 text-muted-foreground text-xs">
                <Hash className="h-3 w-3" />เลขที่ {registration.id.slice(0, 8).toUpperCase()}
              </span>
            )}
          </InfoTile>
        </div>
      </div>

      {/* ════ EVALUATION FORM ════ */}
      <div className="px-4 sm:px-6 py-6 space-y-6">

        {evalLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Form header */}
            <SelfEvalHeader
              programName={programName}
              categoryCount={categories.length}
              topicCount={totalTopics}
              indicatorCount={totalIndicators}
              grandTotal={grandTotal}
              grandMax={grandMax}
              submitted={submitted}
            />

            {/* Scoring levels */}
            {scoringLevels.length > 0 && (
              <ScoringLevelBadges levels={scoringLevels} grandMax={grandMax} currentScore={grandTotal} />
            )}

            {/* Score summary grid */}
            {summaryData.length > 0 && <ScoreSummary data={summaryData} />}

            {/* Category cards */}
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
                implementationDetails={implDetails}
                onImplementationDetailChange={handleDetailChange}
                userRole="user"
                onIndicatorClick={handleOpenWizard}
              />
            ))}

            {/* No categories */}
            {categories.length === 0 && (
              <Card>
                <CardContent className="py-16 flex flex-col items-center gap-2 text-center">
                  <ClipboardCheck className="h-10 w-10 text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">ยังไม่มีแบบประเมินสำหรับโครงการนี้</p>
                </CardContent>
              </Card>
            )}

            {/* Submit / Success */}
            {categories.length > 0 && (
              submitted ? (
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
                  disabled={submitting}
                  size="lg"
                  className="w-full h-12 text-base font-bold gap-2"
                >
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" />กำลังส่งแบบประเมิน...</>
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
          color={getCategoryColor(wizardItem.colorIndex)}
          files={uploadedFiles[wizardItem.indicator.id] ?? []}
          onFilesChange={(f) => handleFilesChange(wizardItem.indicator.id, f)}
          open={wizardIndex !== null}
          onOpenChange={(open) => { if (!open) setWizardIndex(null); }}
          onSave={() => handleSaveIndicator(wizardItem.indicator.id)}
          implementationDetail={implDetails[wizardItem.indicator.id] ?? ""}
          onImplementationDetailChange={(v) => handleDetailChange(wizardItem.indicator.id, v)}
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
