import { useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface Firefly {
  id: number;
  x: number;       // % จาก left
  y: number;       // % จาก top
  size: number;    // px
  dur: number;     // animation duration (s)
  delay: number;   // animation delay (s)
  path: number;    // เลือก path 1-6
  opacity: number; // max opacity
}

const NUM_FIREFLIES = 22;

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateFireflies(): Firefly[] {
  return Array.from({ length: NUM_FIREFLIES }, (_, i) => ({
    id: i,
    x: rand(2, 98),
    y: rand(2, 95),
    size: rand(3, 9),
    dur: rand(6, 18),
    delay: rand(0, 12),
    path: Math.floor(rand(1, 7)),
    opacity: rand(0.55, 1),
  }));
}

export function FirefliesLayer() {
  const { isDark } = useTheme();
  const firefliesRef = useRef<Firefly[]>(generateFireflies());

  if (!isDark) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1 }}
      aria-hidden
    >
      {firefliesRef.current.map((f) => (
        <span
          key={f.id}
          className={`absolute rounded-full firefly-path-${f.path}`}
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            animationDuration: `${f.dur}s`,
            animationDelay: `${f.delay}s`,
            opacity: 0,
            background: `radial-gradient(circle, #e8ffb0 0%, #a8e060 45%, #5abf20 100%)`,
            boxShadow: `0 0 ${f.size * 1.5}px ${f.size * 0.8}px rgba(168,224,96,0.7),
                        0 0 ${f.size * 4}px ${f.size * 1.5}px rgba(130,200,60,0.3)`,
          }}
        />
      ))}
    </div>
  );
}
