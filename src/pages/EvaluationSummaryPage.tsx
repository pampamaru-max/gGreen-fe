import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, Loader2, ArrowLeft, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/axios";

interface CategoryResult {
  id: string;
  name: string;
  selfScore: number;
  committeeScore: number;
  maxScore: number;
}

function getLevel(pct: number) {
  if (pct >= 90) return { label: "ดีเยี่ยม", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
  if (pct >= 80) return { label: "ดีมาก", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" };
  if (pct >= 60) return { label: "ดี", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
  return { label: "ไม่ผ่านเกณฑ์", color: "text-red-600", bg: "bg-red-50 border-red-200" };
}

const EvaluationSummaryPage = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const evaluateeId = new URLSearchParams(location.search).get("evaluateeId");

  const [loading, setLoading] = useState(true);
  const [programName, setProgramName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [categories, setCategories] = useState<CategoryResult[]>([]);
  const [totalMax, setTotalMax] = useState(0);

  useEffect(() => {
    if (!programId) return;
    const fetchData = async () => {
      setLoading(true);
      const [progRes, catRes, topicRes, indRes, evalRes] = await Promise.all([
        apiClient.get(`programs/${programId}`),
        apiClient.get(`categories?programId=${programId}`),
        apiClient.get(`topics`),
        apiClient.get(`indicators`),
        apiClient.get(`evaluation/program/${programId}${evaluateeId ? `?evaluateeId=${evaluateeId}` : ""}`),
      ]);

      setProgramName(progRes.data?.name || "");

      const catData = catRes.data || [];
      const topicData = topicRes.data || [];
      const indData = indRes.data || [];
      const evalData = evalRes.data;

      if (evalData?.user) {
        setOrgName(evalData.user.organizationName || evalData.user.email || "");
      }

      const scoresMap: Record<string, { self: number; committee: number }> = {};
      (evalData?.evaluationScores || []).forEach((s: any) => {
        scoresMap[s.indicatorId] = {
          self: Number(s.score) || 0,
          committee: Number(s.committeeScore) || 0,
        };
      });

      let maxTotal = 0;
      const cats: CategoryResult[] = catData.map((c: any) => {
        const topics = topicData.filter((t: any) => t.categoryId === c.id);
        const indicators = topics.flatMap((t: any) => indData.filter((i: any) => i.topicId === t.id));
        let selfScore = 0;
        let committeeScore = 0;
        let maxScore = 0;
        indicators.forEach((i: any) => {
          selfScore += scoresMap[i.id]?.self || 0;
          committeeScore += scoresMap[i.id]?.committee || 0;
          maxScore += i.maxScore || 0;
        });
        maxTotal += maxScore;
        return { id: c.id, name: c.name, selfScore, committeeScore, maxScore };
      });

      setCategories(cats);
      setTotalMax(maxTotal);
      setLoading(false);
    };
    fetchData();
  }, [programId, evaluateeId]);

  const selfTotal = useMemo(() => categories.reduce((s, c) => s + c.selfScore, 0), [categories]);
  const committeeTotal = useMemo(() => categories.reduce((s, c) => s + c.committeeScore, 0), [categories]);
  const committeePct = totalMax > 0 ? Math.round((committeeTotal / totalMax) * 100) : 0;
  const level = getLevel(committeePct);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <p className="text-xs text-muted-foreground">{programName}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
        {/* Result card */}
        <div className={`rounded-2xl border p-6 text-center ${level.bg}`}>
          <CheckCircle2 className={`h-12 w-12 mx-auto mb-3 ${level.color}`} />
          {orgName && <p className="text-sm text-muted-foreground mb-1">{orgName}</p>}
          <p className="text-4xl font-bold mb-1" style={{}}>
            <span className={level.color}>{committeeTotal}</span>
            <span className="text-xl font-normal text-muted-foreground">/{totalMax}</span>
          </p>
          <p className={`text-2xl font-semibold ${level.color}`}>{committeePct}%</p>
          <span className={`mt-2 inline-block rounded-full px-4 py-1 text-sm font-bold border ${level.bg} ${level.color}`}>
            {level.label}
          </span>
          <p className="mt-3 text-xs text-muted-foreground">
            คะแนนตนเอง: {selfTotal}/{totalMax}
          </p>
        </div>

        {/* Category breakdown */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">รายละเอียดตามหมวด</h3>
          {categories.map((cat, idx) => {
            const catCommitteePct = cat.maxScore > 0 ? Math.round((cat.committeeScore / cat.maxScore) * 100) : 0;
            const catLevel = getLevel(catCommitteePct);
            return (
              <div key={cat.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground">หมวดที่ {idx + 1}</p>
                    <p className="text-sm font-semibold">{cat.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {cat.committeeScore}
                      <span className="text-xs font-normal text-muted-foreground">/{cat.maxScore}</span>
                    </p>
                    <span className={`text-xs font-medium ${catLevel.color}`}>{catLevel.label}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-primary"
                    style={{ width: `${catCommitteePct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">คะแนนตนเอง: {cat.selfScore}/{cat.maxScore}</p>
              </div>
            );
          })}
        </div>

        <Button className="w-full" onClick={() => navigate("/evaluation")}>
          กลับหน้ารายการประเมิน
        </Button>
      </div>
    </div>
  );
};

export default EvaluationSummaryPage;
