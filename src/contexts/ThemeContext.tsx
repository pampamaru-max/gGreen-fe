import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeId = "default" | "rose" | "purple";

interface ThemeOption {
  id: ThemeId;
  label: string;
  color: string; // สีสำหรับ swatch
}

export const THEMES: ThemeOption[] = [
  { id: "default", label: "น้ำเงิน", color: "#2d7dd2" },
  { id: "rose",    label: "โรส",    color: "#d42b55" },
  { id: "purple",  label: "ม่วง",   color: "#7c3aed" },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "default",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem("app_theme") as ThemeId | null;
    return stored && THEMES.some((t) => t.id === stored) ? stored : "default";
  });

  useEffect(() => {
    const root = document.documentElement;
    // ลบ class theme เก่าออกก่อน
    THEMES.forEach((t) => root.classList.remove(`theme-${t.id}`));
    if (theme !== "default") {
      root.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  const setTheme = (id: ThemeId) => {
    localStorage.setItem("app_theme", id);
    setThemeState(id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
