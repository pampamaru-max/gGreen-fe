import { EvalCategory, ScoringLevel } from "@/pages/ProjectRegistration";
import { ScoringLevelType } from "@/pages/SettingsScoringCriteria";

export const formatNumber = (score: number | string) => {
  if (score === "") return "";
  return score.toString().replace(/^0+(?!$)/, "");
};

export const mergeUniqueById = <T extends { id: any }>(
  prev: T[],
  next: T[],
) => {
  const map = new Map(prev.map((item) => [item.id, item]));
  next.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
};

export const ellipsisText = (text: string, limit: number = 10) => {
  if (typeof text !== "string") {
    return "";
  }
  return text.length <= limit ? text : text.substring(0, limit).concat("...");
};

export const queryArray = (query: string, values: string[]) => {
  return values.map((e) => `${query}=${e}`).join('&');
}

export const isNewType    = (t?: string) => !t || t === "score" || t === "yes_no" || t === "score_new" || t === "yes_no_new";
export const isUpgradType = (t?: string) => t === "score_upgrad" || t === "yes_no_upgrad" || t === "upgrade";
export const isRenewType  = (t?: string) => t === "score_renew" || t === "yes_no_renew";

export const labelScoreType = (categories: EvalCategory[], type: string): string => {
  const selectType = (val: string) => {
    return type === 'new' ? isNewType(val) : type === 'upgrade' ? isUpgradType(val) : isRenewType(val);
  }
  const filteredIndexes = categories
    .map((cat, index) => (selectType(cat.scoreType) ? index + 1 : null))
    .filter((i) => i !== null) as number[];
  if (filteredIndexes.length === 0) return '';
  const idxStart = filteredIndexes[0];
  const idxEnd = filteredIndexes[filteredIndexes.length - 1];
  return idxStart === idxEnd
    ? `หมวด ${idxStart}`
    : `หมวด ${idxStart} - ${idxEnd}`;
};

const getScoringLevel = (levels: ScoringLevel[], type: ScoringLevelType | string, pct: number) => {
  return [...levels].reverse().find(l => l.type === type && pct >= l.minScore && pct <= l.maxScore);
}

export const findScoringLevelMatch = (
  scoringLevels: ScoringLevel[],
  type: ScoringLevelType | string,
  normalPct: number,
  specialPct: number
) => {
  if (scoringLevels.length === 0) return null;
  const normalLevels = scoringLevels.filter((l) => l.type === ScoringLevelType.new);
  const specialLevels = scoringLevels.filter((l) => type !== ScoringLevelType.new && l.type === type);
  
  const normalLevel = getScoringLevel(normalLevels, ScoringLevelType.new, normalPct);
  if (!specialLevels.length) return normalLevel;

  const specialLevel = getScoringLevel(scoringLevels, type, specialPct);
  if (!specialLevel) return normalLevel;
  return { ...specialLevel, name: `${normalLevel.name} ${specialLevel.name}` };
}