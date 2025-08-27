import type { ReactNode } from "react";

interface CornerOverlayProps {
  position: "bottom-left" | "bottom-right";
  theme?: "matrix" | "material";
  children: ReactNode;
}

const styles = {
  matrix: {
    base:
      "fixed z-[9999] opacity-70 hover:opacity-100 transition-opacity duration-200 font-mono text-[#00aa00] drop-shadow-[0_0_3px_rgba(0,255,0,0.3)]",
  },
  material: {
    base:
      "fixed z-[9999] opacity-70 hover:opacity-100 transition-opacity duration-200 font-sans text-blue-600",
  },
} as const;

export function CornerOverlay({
  position,
  theme = "matrix",
  children,
}: CornerOverlayProps) {
  const posClass = position === "bottom-left" ? "bottom-2 left-2" : "bottom-2 right-2";
  return <div className={`${styles[theme].base} ${posClass}`}>{children}</div>;
}

