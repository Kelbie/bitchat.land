import { PROJECTIONS } from "../constants/projections";
import { CornerOverlay } from "./CornerOverlay";

interface ProjectionSelectorProps {
  projection: string;
  onSelect: (projection: string) => void;
  theme?: "matrix" | "material";
}

const styles = {
  matrix: {
    label: "text-[#00aa00] text-xs mb-1",
    buttonBase:
      "min-w-[80px] text-left px-2 py-1 text-xs font-mono uppercase border transition-colors",
    buttonActive: "bg-[#003300] text-[#00ff00] border-[#00ff00]",
    buttonInactive:
      "bg-black/80 text-[#00aa00] border-[#00aa00] hover:bg-[#003300]/60 hover:border-[#00ff00]",
  },
  material: {
    label: "text-blue-600 text-xs mb-1",
    buttonBase:
      "min-w-[80px] text-left px-2 py-1 text-xs uppercase border font-sans transition-colors",
    buttonActive: "bg-blue-600 text-white border-blue-600",
    buttonInactive:
      "bg-white/80 text-blue-600 border-blue-600 hover:bg-blue-50",
  },
} as const;

export function ProjectionSelector({
  projection,
  onSelect,
  theme = "matrix",
}: ProjectionSelectorProps) {
  const t = styles[theme];
  return (
    <CornerOverlay position="bottom-left" theme={theme}>
      <div className="flex flex-col gap-1">
        <div className={t.label}>PROJECTION:</div>
        {Object.keys(PROJECTIONS).map((name) => (
          <button
            key={name}
            onClick={() => onSelect(name)}
            className={`${t.buttonBase} ${
              projection === name ? t.buttonActive : t.buttonInactive
            }`}
          >
            {name.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </CornerOverlay>
  );
}

