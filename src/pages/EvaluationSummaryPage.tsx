import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Loader2, ArrowLeft, ClipboardCheck, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/axios";

interface YesNoStats {
  passCount: number;
  totalIndicators: number;
  passPct: number;
  levelName: string | null;
  levelColor: string;
}

interface CategoryResult {
  categoryId: number;
  categoryName: string;
  rawScore: number;
  scaledScore: number;
  categoryMaxScore: number;
  indicatorMaxTotal: number;
}

interface ScoringLevel {
  id: number;
  name: string;
  color: string;
  icon: string;
  minScore: number;
  maxScore: number;
}

interface EvaluationResult {
  id: string;
  evaluationId: string;
  programId: string;
  userId: string;
  totalScore: number;
  totalMaxScore: number;
  scoringLevelId: number | null;
  categoryResults: CategoryResult[];
  calculatedAt: string;
  scoringLevel: ScoringLevel | null;
  // yes/no fields
  passCount?: number;
  totalIndicators?: number;
  passPct?: number;
  scoringLevelName?: string | null;
}

const EvaluationSummaryPage = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const evaluationId = new URLSearchParams(location.search).get("evaluationId");

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [yesNoStats, setYesNoStats] = useState<YesNoStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evaluationId) {
      setError("ไม่พบ evaluationId");
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      try {
        let res = await apiClient.get(`evaluation/result?evaluationId=${evaluationId}`);
        if (!res.data) {
          res = await apiClient.post(`evaluation/${evaluationId}/calculate`);
        }
        const data: EvaluationResult = res.data;
        setResult(data);

        // ถ้า scoringLevel เป็น null และ totalScore/totalMaxScore เป็น 0 → น่าจะเป็น yes/no program
        // ให้ดึง evaluation scores มาคำนวณ pass count เอง
        if (!data.scoringLevel && data.totalScore === 0 && data.totalMaxScore === 0) {
          const [evalRes, levelsRes] = await Promise.all([
            apiClient.get(`evaluation/${evaluationId}`),
            apiClient.get<{ id: number; name: string; minScore: number; maxScore: number; color: string; programId: string | null }[]>("scoring-levels"),
          ]);
          const scores: any[] = evalRes.data?.evaluationScores ?? [];
          const passCount = scores.filter(s => Number(s.committeeScore) === 1).length;
          const totalIndicators = scores.length;
          const passPct = totalIndicators > 0 ? Math.round((passCount / totalIndicators) * 100) : 0;
          const programLevels = levelsRes.data.filter(l => l.programId === (data.programId ?? programId));
          const matched = programLevels.find(l => passPct >= l.minScore && passPct <= l.maxScore);
          setYesNoStats({
            passCount,
            totalIndicators,
            passPct,
            levelName: matched?.name ?? null,
            levelColor: matched?.color ?? "#6b7280",
          });
        }
      } catch {
        setError("ไม่สามารถโหลดผลการประเมินได้");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [evaluationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <p className="text-muted-foreground">{error || "ไม่พบข้อมูล"}</p>
        <Button variant="outline" onClick={() => navigate("/evaluation")}>กลับหน้ารายการ</Button>
      </div>
    );
  }

  const { scoringLevel, totalScore, totalMaxScore, categoryResults } = result;
  const isYesNo = !!yesNoStats;
  const pct = isYesNo
    ? yesNoStats!.passPct
    : (totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0);
  const levelColor = isYesNo ? yesNoStats!.levelColor : (scoringLevel?.color ?? "#6b7280");
  const levelName = isYesNo ? (yesNoStats!.levelName ?? "ไม่ระบุ") : (scoringLevel?.name ?? "ไม่ระบุ");

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/evaluation")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">สรุปผลการประเมิน</h2>
            <p className="text-xs text-muted-foreground">{result.programId}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
        {/* Result card */}
        <div
          className="rounded-2xl border p-6 text-center"
          style={{ borderColor: levelColor, backgroundColor: `${levelColor}18` }}
        >
          <Medal className="h-12 w-12 mx-auto mb-3" style={{ color: levelColor }} />
          {isYesNo ? (
            <>
              <p className="text-4xl font-bold mb-1">
                <span style={{ color: levelColor }}>{yesNoStats!.passCount}</span>
                <span className="text-xl font-normal text-muted-foreground">/{yesNoStats!.totalIndicators} ผ่าน</span>
              </p>
              <p className="text-2xl font-semibold mb-2" style={{ color: levelColor }}>{pct}%</p>
            </>
          ) : (
            <>
              <p className="text-4xl font-bold mb-1">
                <span style={{ color: levelColor }}>{totalScore.toFixed(3)}</span>
                <span className="text-xl font-normal text-muted-foreground">/{totalMaxScore}</span>
              </p>
              <p className="text-2xl font-semibold mb-2" style={{ color: levelColor }}>{pct}%</p>
            </>
          )}
          <span
            className="inline-block rounded-full px-4 py-1 text-sm font-bold border"
            style={{ color: levelColor, borderColor: levelColor, backgroundColor: `${levelColor}22` }}
          >
            {levelName}
          </span>
          {scoringLevel && (
            <p className="mt-3 text-xs text-muted-foreground">
              เกณฑ์: {scoringLevel.minScore} – {scoringLevel.maxScore}%
            </p>
          )}
        </div>

        {/* Category breakdown — only for score-based */}
        {!isYesNo && categoryResults?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">รายละเอียดตามหมวด</h3>
            {categoryResults.map((cat) => {
              const catPct = cat.categoryMaxScore > 0 ? (cat.scaledScore / cat.categoryMaxScore) * 100 : 0;
              return (
                <div key={cat.categoryId} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <p className="text-sm font-semibold flex-1">{cat.categoryName}</p>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-primary">
                        {cat.scaledScore.toFixed(4)}
                        <span className="text-xs font-normal text-muted-foreground">/{cat.categoryMaxScore}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">คะแนนดิบ: {cat.rawScore}/{cat.indicatorMaxTotal}</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-primary"
                      style={{ width: `${Math.min(catPct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button className="w-full" onClick={() => navigate("/evaluation")}>
          กลับหน้ารายการประเมิน
        </Button>
      </div>
    </div>
  );
};

export default EvaluationSummaryPage;
