interface SummaryItem {
  id: number | string;
  name: string;
  score: number;
  maxScore: number;
  totalPossible: number;
  index?: number;
  committeeScore?: number;
  scoreType?: string;
  passCount?: number;
  totalIndicators?: number;
  committeePassCount?: number;
}

export function ScoreSummary({ data, showOnlyWithScore }: { data: SummaryItem[]; showOnlyWithScore?: boolean }) {
  const filtered = showOnlyWithScore ? data.filter(item => item.score > 0 || (item.passCount ?? 0) > 0) : data;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {filtered.map((item, idx) => {
        const isYesNo = item.scoreType?.includes('yes_no');
        const color = getColorValue(idx);

        if (isYesNo) {
          const total = item.totalIndicators ?? 0;
          const pass = item.passCount ?? 0;
          const selfPct = total > 0 ? Math.round((pass / total) * 100) : 0;
          const committeePass = item.committeePassCount;
          const committeePct = committeePass !== undefined && total > 0 ? Math.round((committeePass / total) * 100) : null;
          return (
            <div key={item.id} className="relative overflow-hidden rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
              <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: `hsl(${color})` }} />
              <p className="text-xs font-medium text-muted-foreground mb-1">หมวดที่ {idx + 1}</p>
              <p className="text-sm font-semibold text-foreground leading-tight mb-3 line-clamp-2">{item.name}</p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">ประเมินตนเอง</p>
              <div className="flex items-end justify-between mb-1">
                <p className="text-2xl font-bold" style={{ color: `hsl(${color})` }}>
                  {pass}<span className="text-xs font-normal text-muted-foreground">/{total} ผ่าน</span>
                </p>
                <span className="text-xs font-medium text-muted-foreground">{selfPct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${selfPct}%`, backgroundColor: `hsl(${color})` }} />
              </div>
              {committeePass !== undefined && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">กรรมการ</p>
                  <div className="flex items-end justify-between mb-1">
                    <p className="text-2xl font-bold text-foreground">
                      {committeePass}<span className="text-xs font-normal text-muted-foreground">/{total} ผ่าน</span>
                    </p>
                    <span className="text-xs font-medium text-muted-foreground">{committeePct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500 bg-muted-foreground/50" style={{ width: `${committeePct ?? 0}%` }} />
                  </div>
                </>
              )}
            </div>
          );
        }

        const selfPct = item.totalPossible > 0 ? Math.round((item.score / item.totalPossible) * 100) : 0;
        const committeePct = item.committeeScore !== undefined && item.totalPossible > 0
          ? Math.round((item.committeeScore / item.totalPossible) * 100)
          : null;
        return (
          <div key={item.id} className="relative overflow-hidden rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 rounded-full" style={{ backgroundColor: `hsl(${color})` }} />
            <p className="text-xs font-medium text-muted-foreground mb-1">หมวดที่ {idx + 1}</p>
            <p className="text-sm font-semibold text-foreground leading-tight mb-3 line-clamp-2">{item.name}</p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">ประเมินตนเอง</p>
            <div className="flex items-end justify-between mb-1">
              <p className="text-2xl font-bold" style={{ color: `hsl(${color})` }}>
                {item.score}<span className="text-xs font-normal text-muted-foreground">/{item.totalPossible}</span>
              </p>
              <span className="text-xs font-medium text-muted-foreground">{selfPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${selfPct}%`, backgroundColor: `hsl(${color})` }} />
            </div>
            {item.committeeScore !== undefined && (
              <>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">กรรมการ</p>
                <div className="flex items-end justify-between mb-1">
                  <p className="text-2xl font-bold text-foreground">
                    {item.committeeScore}<span className="text-xs font-normal text-muted-foreground">/{item.totalPossible}</span>
                  </p>
                  <span className="text-xs font-medium text-muted-foreground">{committeePct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 bg-muted-foreground/50" style={{ width: `${committeePct ?? 0}%` }} />
                </div>
              </>
            )}
          </div>
        );
      })}
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
