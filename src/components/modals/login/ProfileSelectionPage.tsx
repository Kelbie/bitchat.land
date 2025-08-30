import React from "react";
import { ThemedButton } from "../../common/ThemedButton";
import { ThemedProgressBar } from "../../chat/ThemedProgressBar";
import { GeneratedProfile } from "./types";

interface ProfileSelectionPageProps {
  theme: "matrix" | "material";
  generatedProfiles: GeneratedProfile[];
  isGenerating: boolean;
  progress: number;
  onProfileSelect: (profile: GeneratedProfile) => void;
  onChangeName: () => void;
}

const styles = {
  matrix: {
    progressText: "text-center text-xs text-[#888]",
    profileOption: "border-[#00ff00]",
  },
  material: {
    progressText: "text-center text-xs text-gray-500",
    profileOption: "border-blue-600",
  },
} as const;

export function ProfileSelectionPage({
  theme,
  generatedProfiles,
  isGenerating,
  progress,
  onProfileSelect,
  onChangeName,
}: ProfileSelectionPageProps) {
  const t = styles[theme];

  return (
    <>
      {isGenerating && generatedProfiles.length < 64 && (
        <div className="mb-5">
          <ThemedProgressBar progress={progress} theme={theme} />
          <div className={t.progressText}>
            Found {generatedProfiles.length} profile
            {generatedProfiles.length !== 1 ? "s" : ""}... searching
            for more
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-8 auto-rows-fr gap-3 mb-5">
        {generatedProfiles.map((profile, idx) => (
          <button
            key={idx}
            onClick={() => onProfileSelect(profile)}
            className={`w-10 h-10 rounded-full border ${t.profileOption}`}
            style={{ backgroundColor: profile.color }}
            title={profile.publicKeyHex.slice(-4)}
            type="button"
          />
        ))}
      </div>
      
      <ThemedButton
        onClick={onChangeName}
        theme={theme}
        className="w-full py-3 text-sm mt-2"
      >
        Change Name
      </ThemedButton>
    </>
  );
}
