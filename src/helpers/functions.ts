import { EvalCategory, ScoringLevel } from "@/pages/ProjectRegistration";
import { ScoringLevelType } from "@/pages/SettingsScoringCriteria";
import { number } from "zod";

export const formatNumber = (val: number | string) => {
  if (val === "" || !val) return "";
  return val.toString().replace(/^0+(?!$)/, "");
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

const getScoringLevel = (levels: ScoringLevel[], type: ScoringLevelType | string, pct: number, attempt?: number | null) => {
  let selectedLevels;
  if (type !== ScoringLevelType.new && levels.some((sl) => sl.type === type && sl.attempt)) {
    const spLevels = levels.filter((sl) => sl.type === type);
    const exact = spLevels.filter((sl) => sl.attempt === attempt);
    if (exact.length > 0) {
      selectedLevels = exact;
    } else {
      const lower = spLevels.filter((sl) => sl.attempt && sl.attempt < attempt).sort((a, b) => b.attempt! - a.attempt!);
      if (lower.length > 0) {
        const max = lower[0].attempt;
        selectedLevels = lower.filter((sl) => sl.attempt === max);
      } else {
        selectedLevels = [];
      }
    }
    return [...selectedLevels].reverse().find((l) => pct >= l.minScore && pct <= l.maxScore);
  }
  return [...levels].reverse().find(l => l.type === type && pct >= l.minScore && pct <= l.maxScore);
}

export const findScoringLevelMatch = (
  attempt: number,
  scoringLevels: ScoringLevel[],
  type: ScoringLevelType | string,
  normalPct: number,
  specialPct: number,
  isYesNo?: boolean
) => {
  if (scoringLevels.length === 0) {
    if (isYesNo) {
      const isPass = normalPct === 100;
      return {
        id: 0,
        name: isPass ? "สอดคล้อง" : "ไม่สอดคล้อง",
        minScore: isPass ? 100 : 0,
        maxScore: isPass ? 100 : 99,
        color: isPass ? "#10b981" : "#e11d48",
        icon: isPass ? "trophy" : "x-circle",
        type: ScoringLevelType.new,
        sortOrder: 1,
        attempt: null,
        isActive: true,
        isPass: isPass,
        programId: null,
      } as ScoringLevel;
    }
    return null;
  }
  const normalLevels = scoringLevels.filter((l) => l.type === ScoringLevelType.new);
  const specialLevels = scoringLevels.filter((l) => type !== ScoringLevelType.new && l.type === type);
  
  const normalLevel = getScoringLevel(normalLevels, ScoringLevelType.new, normalPct);
  if (normalLevel.maxScore != 100 || !specialLevels.length) return normalLevel;
  const specialLevel = getScoringLevel(scoringLevels, type, specialPct, attempt);
  return specialLevel ?? normalLevel;
}