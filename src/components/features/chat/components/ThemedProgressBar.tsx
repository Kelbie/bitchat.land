import React from "react";
import { globalStyles } from "@/styles";

interface ThemedProgressBarProps {
  progress: number;
  theme: "matrix" | "material";
}

const styles = globalStyles["ThemedProgressBar"];

export function ThemedProgressBar({ progress, theme }: ThemedProgressBarProps) {
  const t = styles[theme];
  return (
    <div className={t.outer}>
      <div className={t.inner} style={{ width: `${progress}%` }} />
    </div>
  );
}

