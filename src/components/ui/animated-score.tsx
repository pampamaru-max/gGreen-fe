import { useEffect, useRef, useState } from "react";

/**
 * AnimatedScore — wraps a score value and plays a "pop" animation
 * whenever the value changes. No animation on the initial render.
 */
export function AnimatedScore({
  value,
  children,
  className = "",
}: {
  value: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const prevRef = useRef<number>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prevRef.current === value) return;
    prevRef.current = value;

    // Reset animation so it can re-trigger if value changes rapidly
    setPlaying(false);
    const rafId = requestAnimationFrame(() => {
      setPlaying(true);
      timerRef.current = setTimeout(() => setPlaying(false), 520);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  return (
    <span className={`inline-block ${playing ? "score-pop" : ""} ${className}`}>
      {children}
    </span>
  );
}
