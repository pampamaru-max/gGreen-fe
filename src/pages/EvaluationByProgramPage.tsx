import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Category } from "@/data/evaluationData";
import type { UploadedFile } from "@/components/CategoryCard";
import { CategoryCard } from "@/components/CategoryCard";
import { ScoreSummary } from "@/components/ScoreSummary";
import { ClipboardCheck, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";

const EvaluationByProgramPage = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { isAdmin, role, accessibleProgramIds, loading: roleLoading } = useUserRole();

  const [programName, setProgramName] = useState("");
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
      const { data: prog } = await supabase.from("programs").select("name").eq("id", programId).single();
      setProgramName(prog?.name || "");

      const [catRes, topicRes, indRes] = await Promise.all([
        supabase.from("categories").select("*").eq("program_id", programId).order("sort_order"),
        supabase.from("topics").select("*").order("sort_order"),
        supabase.from("indicators").select("*").order("sort_order"),
      ]);

      if (catRes.data && topicRes.data && indRes.data) {
        const catIds = catRes.data.map((c) => c.id);
        const cats: Category[] = catRes.data.map((c) => {
          const topics = topicRes.data
            .filter((t) => t.category_id === c.id)
            .map((t) => ({
              id: t.id,
              name: t.name,
              indicators: indRes.data
                .filter((i) => i.topic_id === t.id)
                .map((i) => ({
                  id: i.id,
                  name: i.name,
                  maxScore: i.max_score,
                  description: i.description || "",
                  detail: i.detail || "",
                  notes: i.notes || "",
                  evidenceDescription: (i as any).evidence_description || "",
                  scoringCriteria: Array.isArray(i.scoring_criteria)
                    ? (i.scoring_criteria as { score: number; label: string }[])
                    : [],
                })),
            }));
          return { id: c.id, name: c.name, maxScore: c.max_score, topics };
        });
        setCategories(cats);

        // Load latest draft evaluation for this program, scoped to current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const { data: evalData } = await supabase
          .from("evaluations")
          .select("*")
          .eq("status", "draft")
          .eq("program_id", programId)
          .eq("user_id", currentUser?.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (evalData) {
          setEvaluationId(evalData.id);
          const [scoreRes, fileRes] = await Promise.all([
            supabase.from("evaluation_scores").select("*").eq("evaluation_id", evalData.id),
            supabase.from("evaluation_files").select("*").eq("evaluation_id", evalData.id),
          ]);
          if (scoreRes.data) {
            const loaded: Record<string, number> = {};
            const loadedDetails: Record<string, string> = {};
            const loadedCommittee: Record<string, number> = {};
            const loadedComments: Record<string, string> = {};
            scoreRes.data.forEach((s: any) => {
              loaded[s.indicator_id] = s.score;
              if (s.implementation_detail) loadedDetails[s.indicator_id] = s.implementation_detail;
              if (s.committee_score) loadedCommittee[s.indicator_id] = s.committee_score;
              if (s.committee_comment) loadedComments[s.indicator_id] = s.committee_comment;
            });
            setScores(loaded);
            setImplementationDetails(loadedDetails);
            setCommitteeScores(loadedCommittee);
            setCommitteeComments(loadedComments);
          }
          if (fileRes.data) {
            const loaded: Record<string, UploadedFile[]> = {};
            fileRes.data.forEach((f) => {
              if (!loaded[f.indicator_id]) loaded[f.indicator_id] = [];
              loaded[f.indicator_id].push({ name: f.file_name, url: f.file_url, path: f.file_path });
            });
            setUploadedFiles(loaded);
          }
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
    try {
      let evalId = evaluationId;

      if (!evalId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนบันทึก");
        const { data: newEval, error } = await supabase
          .from("evaluations")
          .insert({
            name: `การประเมิน ${programName}`,
            status: "draft",
            total_score: 0,
            total_max: 0,
            user_id: user.id,
            program_id: programId,
          })
          .select()
          .single();
        if (error) throw error;
        evalId = newEval.id;
        setEvaluationId(evalId);
      }

      const score = scores[indicatorId] || 0;
      const detail = implementationDetails[indicatorId] || null;
      const cScore = committeeScores[indicatorId] || 0;
      const cComment = committeeComments[indicatorId] || null;

      await supabase.from("evaluation_scores").delete()
        .eq("evaluation_id", evalId)
        .eq("indicator_id", indicatorId);

      if (score > 0 || cScore > 0 || detail || cComment) {
        const { error: scoreErr } = await supabase.from("evaluation_scores").insert({
          evaluation_id: evalId,
          indicator_id: indicatorId,
          score,
          implementation_detail: detail,
          committee_score: cScore,
          committee_comment: cComment,
        } as any);
        if (scoreErr) throw scoreErr;
      }

      await supabase.from("evaluation_files").delete()
        .eq("evaluation_id", evalId)
        .eq("indicator_id", indicatorId);

      const files = uploadedFiles[indicatorId] || [];
      if (files.length > 0) {
        const fileRows = files.map((f) => ({
          evaluation_id: evalId!,
          indicator_id: indicatorId,
          file_name: f.name,
          file_url: f.url,
          file_path: f.path,
        }));
        const { error: fileErr } = await supabase.from("evaluation_files").insert(fileRows);
        if (fileErr) throw fileErr;
      }

      const { data: allScores } = await supabase
        .from("evaluation_scores")
        .select("score")
        .eq("evaluation_id", evalId);
      const totalScore = allScores?.reduce((s, r) => s + r.score, 0) || 0;

      await supabase.from("evaluations").update({
        total_score: totalScore,
        updated_at: new Date().toISOString(),
      }).eq("id", evalId);

      toast.success("บันทึกเรียบร้อยแล้ว");
    } catch (err: any) {
      console.error(err);
      toast.error("บันทึกไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาด"));
    }
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

  const grandTotal = summaryData.reduce((s, c) => s + c.score, 0);
  const grandMax = summaryData.reduce((s, c) => s + c.totalPossible, 0);

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
        <ScoreSummary data={summaryData} />
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
          />
        ))}
      </div>
    </div>
  );
};

export default EvaluationByProgramPage;
