import { THEMES, useTheme } from "@/contexts/ThemeContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeSwatches() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1.5">
      {THEMES.map((t) => (
        <Tooltip key={t.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setTheme(t.id)}
              className="h-5 w-5 rounded-full ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{
                backgroundColor: t.color,
                boxShadow: theme === t.id ? `0 0 0 2px white, 0 0 0 3.5px ${t.color}` : undefined,
                transform: theme === t.id ? "scale(1.15)" : undefined,
              }}
              aria-label={`ธีม ${t.label}`}
              aria-pressed={theme === t.id}
            />
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">{t.label}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
