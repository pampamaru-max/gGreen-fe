import { Trophy, Medal, Award, Star } from "lucide-react";
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
    <div className="flex flex-wrap items-center gap-2">
      {levels.map((level) => {
        const IconComp = iconMap[level.icon] ?? Trophy;
        const isActive = currentLevel?.id === level.id;
        return (
          <div
            key={level.id}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-all select-none"
            style={{
              borderColor: isActive ? level.color : `${level.color}40`,
              backgroundColor: isActive ? `${level.color}18` : "transparent",
              color: isActive ? level.color : `${level.color}80`,
            }}
          >
            <IconComp className="h-3.5 w-3.5 shrink-0" />
            {level.name}
            <span className="opacity-70">({level.minScore}–{level.maxScore}%)</span>
          </div>
        );
      })}
    </div>
  );
}
