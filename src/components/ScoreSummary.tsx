import { useState, useEffect } from "react";

interface SummaryItem {
  id: number | string;
  name: string;
  score: number;
  maxScore: number;
  totalPossible: number;
}

interface Props {
  data: SummaryItem[];
  committeeData?: SummaryItem[];
  view?: "self" | "committee";
  onViewChange?: (v: "self" | "committee") => void;
}

export function ScoreSummary({ data, committeeData, view: controlledView, onViewChange }: Props) {
  const hasCommittee = committeeData && committeeData.length > 0;
  const [internalView, setInternalView] = useState<"self" | "committee">(hasCommittee ? "committee" : "self");

  const view = controlledView ?? internalView;
  const setView = (v: "self" | "committee") => {
    setInternalView(v);
    onViewChange?.(v);
  };

  useEffect(() => {
    if (hasCommittee && !controlledView) setInternalView("committee");
  }, [hasCommittee, controlledView]);

  const activeData = view === "committee" && hasCommittee ? committeeData : data;

  const selfTotal = data.reduce((s, c) => s + c.score, 0);
  const selfMax = data.reduce((s, c) => s + c.totalPossible, 0);
  const committeeTotal = committeeData?.reduce((s, c) => s + c.score, 0) ?? 0;
  const selfPct = selfMax > 0 ? Math.round((selfTotal / selfMax) * 100) : 0;
  const committeePct = selfMax > 0 ? Math.round((committeeTotal / selfMax) * 100) : 0;

  return (
    <div className="space-y-3">
      {hasCommittee && (
        <div className="flex gap-3">
          {(
            [
              { key: "self" as const, label: "ผู้ถูกประเมิน", total: selfTotal, pct: selfPct },
              { key: "committee" as const, label: "ผู้ประเมิน", total: committeeTotal, pct: committeePct },
            ] as const
          ).map(({ key, label, total, pct }) => {
            const isActive = view === key;
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex items-center gap-4 rounded-xl border px-5 py-3 transition-all text-left ${
                  isActive
                    ? "bg-primary/5 border-primary/30 shadow-sm"
                    : "bg-card border-border hover:bg-muted/40"
                }`}
              >
                <div>
                  <p className={`text-xs font-semibold mb-0.5 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </p>
                  <p className={`text-2xl font-bold leading-none ${isActive ? "text-primary" : "text-foreground"}`}>
                    {total}
                    <span className="text-sm font-normal text-muted-foreground">/{selfMax}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 min-w-[48px]">
                  <span className={`text-lg font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {pct}%
                  </span>
                  <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)",
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {activeData.map((item, idx) => {
          const pct = item.totalPossible > 0 ? Math.round((item.score / item.totalPossible) * 100) : 0;
          return (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div
                className="absolute inset-x-0 top-0 h-1 rounded-full"
                style={{ backgroundColor: `hsl(${getColorValue(idx)})` }}
              />
              <p className="text-xs font-medium text-muted-foreground mb-1">หมวดที่ {idx + 1}</p>
              <p className="text-sm font-semibold text-foreground leading-tight mb-2 line-clamp-2">{item.name}</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold" style={{ color: `hsl(${getColorValue(idx)})` }}>
                  {item.score}
                  <span className="text-xs font-normal text-muted-foreground">/{item.totalPossible}</span>
                </p>
                <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: `hsl(${getColorValue(idx)})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getColorValue(idx: number): string {
  const colors = [
    "210 70% 45%",
    "165 60% 40%",
    "40 90% 50%",
    "340 65% 50%",
    "270 60% 50%",
    "30 80% 50%",
    "190 70% 40%",
    "0 65% 50%",
  ];
  return colors[idx % colors.length];
}
