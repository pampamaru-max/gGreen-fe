interface SummaryItem {
  id: number | string;
  name: string;
  score: number;
  maxScore: number;
  totalPossible: number;
  index?: number;
}

export function ScoreSummary({ data }: { data: SummaryItem[] }) {
  const grandTotal = data.reduce((s, c) => s + c.score, 0);
  const grandMax = data.reduce((s, c) => s + c.totalPossible, 0);
  const percentage = grandMax > 0 ? Math.round((grandTotal / grandMax) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {data.map((item, idx) => {
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
