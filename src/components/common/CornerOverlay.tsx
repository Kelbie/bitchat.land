import type { ReactNode } from "react";
import { globalStyles } from "../../styles";

interface CornerOverlayProps {
  position: "bottom-left" | "bottom-right" | "top-left";
  theme?: "matrix" | "material";
  children: ReactNode;
}

  const styles = globalStyles["CornerOverlay"];

export function CornerOverlay({
  position,
  theme = "matrix",
  children,
}: CornerOverlayProps) {
  const posClass = 
    position === "bottom-left" ? "bottom-2 left-2" : 
    position === "bottom-right" ? "bottom-2 right-2" : 
    "top-2 left-2";
  return <div className={`${styles[theme].base} ${posClass}`}>{children}</div>;
}

