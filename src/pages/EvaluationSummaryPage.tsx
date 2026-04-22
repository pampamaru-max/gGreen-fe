import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, Medal } from "lucide-react";
import { PageLoading } from "@/components/ui/page-loading";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/axios";
import { ScoringLevelType } from "./SettingsScoringCriteria";
import { ScoringLevel } from "./ProjectRegistration";

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

interface EvaluationResult {
  id: string;
  evaluationId: string;
  programId: string;
  userId: string;
  totalScore: number;
  totalMaxScore: number;
  normalLevelId: number | null;
  specialLevelId: number | null;
  categoryResults: CategoryResult[];
  calculatedAt: string;
  normalLevel: ScoringLevel | null;
  specialLevel: ScoringLevel | null;
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

        // ถ้า scoringLevel เป็น null → ดึง scoring-levels มา match เอง
        if (!data.normalLevel) {
          const isYesNoProgram = data.totalScore === 0 && data.totalMaxScore === 0;
          const [evalRes, levelsRes] = await Promise.all([
            isYesNoProgram ? apiClient.get(`evaluation/${evaluationId}`) : Promise.resolve(null),
            apiClient.get<{ id: number; name: string; minScore: number; maxScore: number; color: string; type: ScoringLevelType; programId: string | null }[]>("scoring-levels"),
          ]);
          const programLevels = levelsRes.data.filter(
            (l) => l.programId === (data.programId ?? programId)
          );

          if (isYesNoProgram && evalRes) {
            const scores: any[] = evalRes.data?.evaluationScores ?? [];
            const passCount = scores.filter(s => Number(s.committeeScore) === 1).length;
            const totalIndicators = scores.length;
            const passPct = totalIndicators > 0 ? Math.round((passCount / totalIndicators) * 100) : 0;
            const matched = programLevels.find(l => passPct >= l.minScore && passPct <= l.maxScore);
            setYesNoStats({
              passCount,
              totalIndicators,
              passPct,
              levelName: matched?.name ?? null,
              levelColor: matched?.color ?? "#6b7280",
            });
          } else if (!isYesNoProgram && data.totalMaxScore > 0) {
            // score-based: คำนวณ % จาก totalScore แล้ว match level
            const pct = Math.round((data.totalScore / data.totalMaxScore) * 100);
            const matched = programLevels.find(l => pct >= l.minScore && pct <= l.maxScore);
            if (matched) {
              setResult(prev => prev ? {
                ...prev,
                scoringLevel: {
                  id: matched.id,
                  name: matched.name,
                  color: matched.color,
                  icon: "",
                  minScore: matched.minScore,
                  maxScore: matched.maxScore,
                  type: matched.type,
                },
              } : prev);
            }
          }
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
    return <PageLoading />;
  }

  if (error || !result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <p className="text-muted-foreground">{error || "ไม่พบข้อมูล"}</p>
        <Button variant="outline" onClick={() => navigate("/evaluation")}>กลับหน้ารายการ</Button>
      </div>
    );
  }

  const { normalLevel, totalScore, totalMaxScore, categoryResults } = result;
  const isYesNo = !!yesNoStats;
  const pct = isYesNo
    ? yesNoStats!.passPct
    : (totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0);
  const levelColor = isYesNo ? yesNoStats!.levelColor : (normalLevel?.color ?? "#6b7280");
  const levelName = isYesNo ? (yesNoStats!.levelName ?? "ไม่ระบุ") : (normalLevel?.name ?? "ไม่ระบุ");

  const glass = {
    background: "var(--glass-bg)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    boxShadow: "var(--glass-shadow)",
    border: "1px solid var(--glass-border)",
  } as React.CSSProperties;

  return (
    <div className="h-full flex flex-col gap-3 p-3 sm:p-4">

      {/* Header */}
      <div className="px-4 py-3 rounded-2xl shrink-0" style={glass}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/evaluation")} className="shrink-0 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ background: "#3a7d2c" }}>
            <ClipboardCheck className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold leading-tight" style={{ color: "var(--green-heading)" }}>สรุปผลการประเมิน</h2>
            <p className="text-xs" style={{ color: "var(--green-muted)" }}>{result.programId}</p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={glass}>
        <div className="h-full overflow-y-auto px-4 py-4">
          <div className="max-w-2xl mx-auto space-y-4">

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
                    <span style={{ color: levelColor }}>{Number.isInteger(totalScore) ? totalScore : totalScore.toFixed(2)}</span>
                    <span className="text-xl font-normal text-muted-foreground">/{totalMaxScore}</span>
                  </p>
                  <p className="text-2xl font-semibold mb-2" style={{ color: levelColor }}>{pct}%</p>
                </>
              )}
              <div className="score-active-wrap">
                <div className="score-sparkles">
                  <div className="score-sparkle" />
                  <div className="score-sparkle" />
                  <div className="score-sparkle" />
                  <div className="score-sparkle" />
                  <div className="score-sparkle" />
                </div>
                <span
                  className="score-active-badge inline-block rounded-full px-4 py-1 text-sm font-bold border"
                  style={{ color: levelColor, borderColor: levelColor, backgroundColor: `${levelColor}22` }}
                >
                  {levelName}
                </span>
              </div>
              {normalLevel && (
                <p className="mt-3 text-xs text-muted-foreground">
                  เกณฑ์: {normalLevel.minScore} – {normalLevel.maxScore}%
                </p>
              )}
            </div>

            {/* Category breakdown */}
            {!isYesNo && categoryResults?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide px-1" style={{ color: "var(--green-muted)" }}>รายละเอียดตามหมวด</h3>
                {categoryResults.map((cat) => {
                  const catPct = cat.categoryMaxScore > 0 ? (cat.scaledScore / cat.categoryMaxScore) * 100 : 0;
                  return (
                    <div key={cat.categoryId} className="rounded-xl p-4" style={glass}>
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <p className="text-sm font-semibold flex-1">{cat.categoryName}</p>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold" style={{ color: "var(--green-heading)" }}>
                            {cat.scaledScore.toFixed(4)}
                            <span className="text-xs font-normal text-muted-foreground">/{cat.categoryMaxScore}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">คะแนนดิบ: {cat.rawScore}/{cat.indicatorMaxTotal}</p>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(catPct, 100)}%`, background: "var(--green-heading)" }}
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
      </div>
    </div>
  );
};

export default EvaluationSummaryPage;
