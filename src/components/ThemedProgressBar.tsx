import React from "react";

interface ThemedProgressBarProps {
  progress: number;
  theme: "matrix" | "material";
}

const styles = {
  matrix: {
    outer: "bg-[#333] h-2 rounded overflow-hidden mb-2",
    inner: "bg-[#00ff00] h-full transition-[width] duration-300",
  },
  material: {
    outer: "bg-gray-200 h-2 rounded overflow-hidden mb-2",
    inner: "bg-blue-600 h-full transition-[width] duration-300",
  },
} as const;

export function ThemedProgressBar({ progress, theme }: ThemedProgressBarProps) {
  const t = styles[theme];
  return (
    <div className={t.outer}>
      <div className={t.inner} style={{ width: `${progress}%` }} />
    </div>
  );
}

