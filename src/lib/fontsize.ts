export const FONT_SIZE_KEY = "app-font-size";
export const FONT_SIZE_DEFAULT = 16;
export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 36;

export function applyFontSize(size: number) {
  document.documentElement.style.fontSize = `${size}px`;
}
