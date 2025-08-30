import React from "react";
import { ThemedInput } from "../../common/ThemedInput";
import { ThemedButton } from "../../common/ThemedButton";
import { ThemedProgressBar } from "../../chat/ThemedProgressBar";

interface ProfileInputPageProps {
  theme: "matrix" | "material";
  input: string;
  setInput: (input: string) => void;
  isGenerating: boolean;
  progress: number;
  error: string;
  recentIdentities: string[];
  onGenerateKeys: (identityInput?: string) => void;
}

const styles = {
  matrix: {
    historyButton: "px-2 py-1 bg-black text-[#00ff00] border border-[#00ff00] rounded text-xs font-mono",
    error: "bg-[#330000] border border-[#ff0000] text-[#ff6666] p-2 rounded mb-5 text-sm",
    progressText: "text-center text-xs text-[#888]",
  },
  material: {
    historyButton: "px-2 py-1 bg-white text-blue-600 border border-blue-600 rounded text-xs",
    error: "bg-red-50 border border-red-400 text-red-600 p-2 rounded mb-5 text-sm",
    progressText: "text-center text-xs text-gray-500",
  },
} as const;

export function ProfileInputPage({
  theme,
  input,
  setInput,
  isGenerating,
  progress,
  error,
  recentIdentities,
  onGenerateKeys,
}: ProfileInputPageProps) {
  const t = styles[theme];

  return (
    <>
      <p className="mb-5 text-sm leading-snug">
        Enter your desired username. Optionally add{" "}
        <strong>#XXXX</strong> to generate a public key ending with
        those 4 hex characters. We'll generate 64 profiles for you to
        choose from.
      </p>

      {recentIdentities.length > 0 && (
        <div className="mb-5">
          <div className="text-xs mb-2">Previous identities:</div>
          <div className="flex flex-wrap gap-2">
            {recentIdentities.map((id) => (
              <button
                key={id}
                onClick={() => onGenerateKeys(id)}
                className={t.historyButton}
                type="button"
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5">
        <ThemedInput
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="username#1999"
          disabled={isGenerating}
          theme={theme}
          className={`w-full p-3 text-base ${
            theme === "matrix"
              ? "focus:shadow-[0_0_5px_rgba(0,255,0,0.5)]"
              : "focus:ring-2 focus:ring-blue-600"
          }`}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !isGenerating) {
              onGenerateKeys();
            }
          }}
        />
      </div>

      {error && <div className={t.error}>{error}</div>}

      {isGenerating && (
        <div className="mb-5">
          <ThemedProgressBar progress={progress} theme={theme} />
          <div className={t.progressText}>
            Generating keys... {Math.round(progress)}%
            {input.includes("#") && (
              <div className="mt-1">
                This may take a while for longer suffixes
              </div>
            )}
          </div>
        </div>
      )}

      <ThemedButton
        onClick={() => onGenerateKeys()}
        disabled={isGenerating || !input.trim()}
        theme={theme}
        className="w-full py-3 text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? "GENERATING..." : "GENERATE PROFILES"}
      </ThemedButton>
    </>
  );
}
