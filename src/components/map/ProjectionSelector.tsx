import { PROJECTIONS } from "../../constants/projections";
import { globalStyles } from "../../styles";
import { CornerOverlay } from "../common/CornerOverlay";
import { ThemedButton } from "../common/ThemedButton";

interface ProjectionSelectorProps {
  projection: string;
  onSelect: (projection: string) => void;
  theme?: "matrix" | "material";
}

const styles = globalStyles["ProjectionSelector"];

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
          <ThemedButton
            key={name}
            onClick={() => onSelect(name)}
            active={projection === name}
            theme={theme}
            className="min-w-[80px] text-left px-2 py-1 text-xs"
          >
            {name.replace(/_/g, " ")}
          </ThemedButton>
        ))}
      </div>
    </CornerOverlay>
  );
}

