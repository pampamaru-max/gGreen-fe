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