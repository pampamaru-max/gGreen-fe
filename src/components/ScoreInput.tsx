interface Props {
  value: number;
  max: number;
  onChange: (value: number) => void;
  color: string;
}

export function ScoreInput({ value, max, onChange, color }: Props) {
  const options = Array.from({ length: max + 1 }, (_, i) => i);

  return (
    <div className="flex items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt === value ? 0 : opt)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold transition-all duration-150"
          style={
            opt === value && opt > 0
              ? { backgroundColor: `hsl(${color})`, color: "white" }
              : opt === value && opt === 0
              ? { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
              : { backgroundColor: "transparent", color: "hsl(var(--muted-foreground))" }
          }
          onMouseEnter={(e) => {
            if (opt !== value) {
              (e.target as HTMLElement).style.backgroundColor = `hsl(${color} / 0.1)`;
            }
          }}
          onMouseLeave={(e) => {
            if (opt !== value) {
              (e.target as HTMLElement).style.backgroundColor = "transparent";
            }
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
