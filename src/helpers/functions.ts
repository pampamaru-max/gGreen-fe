export const formatNumber = (score: number | string) => {
  if (score === "") return "";
  return score.toString().replace(/^0+(?!$)/, "");
};
