import React, { useState } from "react";
import { ThemedButton } from "../../common/ThemedButton";
import { GeneratedProfile } from "./types";

interface ProfilePreviewPageProps {
  theme: "matrix" | "material";
  generatedProfile: GeneratedProfile;
  onSaveProfile: () => void;
  onChangeColor: () => void;
}

const styles = {
  matrix: {
    previewCard: "bg-[#001100] border-2 border-[#00ff00] rounded-[15px] p-6 mb-5 shadow-[0_0_20px_rgba(0,255,0,0.2)]",
    previewUsername: "text-[#00ff00] text-[20px] font-bold",
    previewHighlight: "bg-yellow-300 text-black px-1 rounded",
    privateContainer: "bg-[#110000] border border-[#ff3300] rounded mb-5",
    privateToggle: "p-3 cursor-pointer flex items-center justify-between hover:bg-[#220000]",
    privateToggleOpen: "border-b border-[#ff3300]",
    privateToggleText: "text-[12px] text-[#ff6666] uppercase font-bold flex items-center gap-2",
    privateToggleIcon: "text-[#ff6666] transition-transform",
    privateContent: "p-4",
    privateItem: "mb-4",
    privateLabel: "text-[11px] text-[#ff9999] mb-1",
    privateValue: "bg-black p-2 rounded text-[11px] break-all flex justify-between items-center gap-2 border border-[#330000]",
    privateValueText: "text-[#ff9999]",
    copyButton: "bg-[#330000] text-[#ff6666] border border-[#ff3300] px-2 py-1 text-[10px] rounded cursor-pointer flex-shrink-0",
  },
  material: {
    previewCard: "bg-white border-2 border-blue-600 rounded-[15px] p-6 mb-5 shadow-md",
    previewUsername: "text-blue-600 text-[20px] font-bold",
    previewHighlight: "bg-yellow-200 text-black px-1 rounded",
    privateContainer: "bg-red-50 border border-red-400 rounded mb-5",
    privateToggle: "p-3 cursor-pointer flex items-center justify-between hover:bg-red-100",
    privateToggleOpen: "border-b border-red-400",
    privateToggleText: "text-[12px] text-red-600 uppercase font-bold flex items-center gap-2",
    privateToggleIcon: "text-red-600 transition-transform",
    privateContent: "p-4",
    privateItem: "mb-4",
    privateLabel: "text-[11px] text-red-500 mb-1",
    privateValue: "bg-white p-2 rounded text-[11px] break-all flex justify-between items-center gap-2 border border-red-200",
    privateValueText: "text-red-500",
    copyButton: "bg-red-200 text-red-700 border border-red-400 px-2 py-1 text-[10px] rounded cursor-pointer flex-shrink-0",
  },
} as const;

export function ProfilePreviewPage({
  theme,
  generatedProfile,
  onSaveProfile,
  onChangeColor,
}: ProfilePreviewPageProps) {
  const [showPrivateKeys, setShowPrivateKeys] = useState(false);
  const t = styles[theme];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      console.error("Failed to copy to clipboard");
    });
  };

  return (
    <>
      {/* Profile Card Preview */}
      <div className={t.previewCard}>
        <div className="flex items-center gap-4 mb-5">
          {/* Avatar */}
          <div
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-2xl font-bold text-black"
            style={{
              backgroundColor: generatedProfile.color,
              border: `2px solid ${generatedProfile.color}`,
            }}
          >
            {generatedProfile.username.charAt(0).toUpperCase()}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h3 className={t.previewUsername}>
              @{generatedProfile.username}#
              <span className={t.previewHighlight}>
                {generatedProfile.publicKeyHex.slice(-4)}
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* Private Keys Section - Collapsible */}
      <div className={t.privateContainer}>
        <div
          onClick={() => setShowPrivateKeys(!showPrivateKeys)}
          className={`${t.privateToggle} ${
            showPrivateKeys ? t.privateToggleOpen : ""
          }`}
        >
          <div className={t.privateToggleText}>
            🔐 Private Keys (Keep Secret!)
          </div>
          <div
            className={`${t.privateToggleIcon} ${
              showPrivateKeys ? "rotate-180" : ""
            }`}
          >
            ▼
          </div>
        </div>

        {showPrivateKeys && (
          <div className={t.privateContent}>
            <div className={t.privateItem}>
              <div className={t.privateLabel}>Private Key (nsec):</div>
              <div className={t.privateValue}>
                <span className={t.privateValueText}>
                  {generatedProfile.nsec}
                </span>
                <button
                  onClick={() => copyToClipboard(generatedProfile.nsec)}
                  className={t.copyButton}
                  type="button"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <ThemedButton
          onClick={onChangeColor}
          theme={theme}
          className="flex-1 py-3 text-sm"
        >
          Change Color
        </ThemedButton>
        <ThemedButton
          onClick={onSaveProfile}
          theme={theme}
          className="flex-1 py-3 text-sm"
        >
          Save Profile
        </ThemedButton>
      </div>
    </>
  );
}
