import { Trophy, Medal, Award, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoringLevel } from "@/pages/ProjectRegistration";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy, Medal, Award, Star,
};

interface Props {
  levels: ScoringLevel[];
  grandMax: number;
  currentScore: number;
}

export function ScoringLevelBadges({ levels, grandMax, currentScore }: Props) {
  const pct = grandMax > 0 ? Math.round((currentScore / grandMax) * 100) : 0;

  const currentLevel = [...levels]
    .reverse()
    .find((l) => pct >= l.minScore && pct <= l.maxScore);

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          เกณฑ์การตัดสินผล
          {currentLevel && (
            <span
              className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${currentLevel.color}20`, color: currentLevel.color }}
            >
              ระดับปัจจุบัน: {currentLevel.name}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Score bar */}
        <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden flex">
          {levels.map((level) => {
            const width = level.maxScore - level.minScore;
            return (
              <div
                key={level.id}
                className="h-full transition-all"
                style={{ width: `${width}%`, backgroundColor: level.color, opacity: 0.7 }}
                title={`${level.name}: ${level.minScore}–${level.maxScore}%`}
              />
            );
          })}
          {/* Current position indicator */}
          {grandMax > 0 && (
            <div
              className="absolute top-0 h-full w-0.5 bg-foreground/60 rounded-full"
              style={{ left: `${pct}%` }}
            />
          )}
        </div>

        {/* Level badges */}
        <div className="flex flex-wrap gap-2">
          {levels.map((level) => {
            const IconComp = iconMap[level.icon] ?? Trophy;
            const isActive = currentLevel?.id === level.id;
            return (
              <div
                key={level.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all"
                style={{
                  borderColor: isActive ? level.color : `${level.color}30`,
                  backgroundColor: isActive ? `${level.color}18` : `${level.color}08`,
                  boxShadow: isActive ? `0 0 0 1.5px ${level.color}` : "none",
                }}
              >
                <IconComp className="h-4 w-4 shrink-0" style={{ color: level.color }} />
                <div>
                  <p className="font-semibold leading-tight" style={{ color: level.color }}>
                    {level.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {level.minScore}–{level.maxScore}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
