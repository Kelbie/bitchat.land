import React, { useState } from "react";
import { Button } from "@/components/ui/base";
import { GeneratedProfile } from "@/types";
import { globalStyles } from "@/styles";
import { capitalizeFirst } from "@/utils/stringUtils";

interface ProfilePreviewPageProps {
  theme: "matrix" | "material";
  generatedProfile: GeneratedProfile;
  onSaveProfile: () => void;
  onChangeColor: () => void;
}

const styles = globalStyles["ProfilePreviewPage"];

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
            {capitalizeFirst(generatedProfile.username)}
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
        <Button
          onClick={onChangeColor}
          theme={theme}
          className="flex-1 py-3 text-sm"
        >
          Change Color
        </Button>
        <Button
          onClick={onSaveProfile}
          theme={theme}
          className="flex-1 py-3 text-sm"
        >
          Save Profile
        </Button>
      </div>
    </>
  );
}
