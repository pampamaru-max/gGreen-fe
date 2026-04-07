const CAT_COLORS = ["#2563EB", "#7C3AED", "#059669"];

interface SummaryItem {
  id: number | string;
  name: string;
  score: number;
  maxScore: number;
  totalPossible: number;
  index?: number;
  scoreType?: string;
  passCount?: number;
  totalIndicators?: number;
}

interface Props {
  data: SummaryItem[];
  committeeData?: SummaryItem[];
  onCategoryClick?: (categoryId: string | number) => void;
}

export function ScoreSummary({ data, committeeData, onCategoryClick }: Props) {
  const isCommittee = !!committeeData;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {data.map((item, idx) => {
        const isYesNo = item.scoreType?.includes('yes_no');
        const committee = committeeData?.[idx];
        const accentColor = CAT_COLORS[idx % CAT_COLORS.length];

        if (isYesNo) {
          const total = item.totalIndicators ?? 0;
          const pass = item.passCount ?? 0;
          const selfPct = total > 0 ? Math.round((pass / total) * 100) : 0;
          const committeePass = committee?.passCount;
          const committeePct = committeePass !== undefined && total > 0
            ? Math.round((committeePass / total) * 100) : 0;

          return (
            <div
              key={item.id}
              onClick={() => onCategoryClick?.(item.id)}
              className={`overflow-hidden rounded-xl bg-white border border-l-4 p-4 transition-shadow hover:shadow-md ${onCategoryClick ? "cursor-pointer" : ""}`}
              style={{ borderLeftColor: accentColor }}
            >
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">หมวดที่ {idx + 1}</p>
              <p className="text-sm font-bold text-foreground mt-0.5 mb-4 leading-tight">{item.name}</p>

              <div className="space-y-1.5">
                {isCommittee && <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">ประเมินตนเอง</p>}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground leading-none">{pass}</span>
                  <span className="text-sm font-medium text-muted-foreground">/{total} ผ่าน</span>
                  <span className="ml-auto text-sm font-bold text-blue-600">{selfPct}%</span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden bg-blue-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${selfPct}%`, background: "linear-gradient(to right, #60A5FA, #1D4ED8)" }}
                  />
                </div>
              </div>

              {isCommittee && committee && (
                <>
                  <div className="my-3 border-t border-dashed" />
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#0F766E" }}>กรรมการ</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground leading-none">{committeePass ?? 0}</span>
                      <span className="text-sm font-medium text-muted-foreground">/{total} ผ่าน</span>
                      <span className="ml-auto text-sm font-bold" style={{ color: "#0F766E" }}>{committeePct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#CCFBF1" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${committeePct}%`, background: "linear-gradient(to right, #2DD4BF, #0F766E)" }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        }

        // score type
        const selfPct = item.totalPossible > 0 ? Math.round((item.score / item.totalPossible) * 100) : 0;
        const committeePct = committee && item.totalPossible > 0
          ? Math.round((committee.score / item.totalPossible) * 100) : 0;

        return (
          <div
            key={item.id}
            onClick={() => onCategoryClick?.(item.id)}
            className={`overflow-hidden rounded-xl bg-white border border-l-4 p-4 transition-shadow hover:shadow-md ${onCategoryClick ? "cursor-pointer" : ""}`}
            style={{ borderLeftColor: accentColor }}
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">หมวดที่ {idx + 1}</p>
            <p className="text-sm font-bold text-foreground mt-0.5 mb-4 leading-tight">{item.name}</p>

            <div className="space-y-1.5">
              {isCommittee && <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">ประเมินตนเอง</p>}
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground leading-none">{item.score}</span>
                <span className="text-sm font-medium text-muted-foreground">/{item.totalPossible}</span>
                <span className="ml-auto text-sm font-bold text-blue-600">{selfPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden bg-blue-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${selfPct}%`, background: "linear-gradient(to right, #60A5FA, #1D4ED8)" }}
                />
              </div>
            </div>

            {isCommittee && committee && (
              <>
                <div className="my-3 border-t border-dashed" />
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#0F766E" }}>กรรมการ</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground leading-none">{committee.score}</span>
                    <span className="text-sm font-medium text-muted-foreground">/{item.totalPossible}</span>
                    <span className="ml-auto text-sm font-bold" style={{ color: "#0F766E" }}>{committeePct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#CCFBF1" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${committeePct}%`, background: "linear-gradient(to right, #2DD4BF, #0F766E)" }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
