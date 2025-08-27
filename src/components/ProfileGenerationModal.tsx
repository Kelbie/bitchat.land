import React, { useState, useEffect, useRef } from "react";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { colorForPeerSeed } from "../utils/userColor";
import { ThemedInput } from "./ThemedInput";
import { ThemedButton } from "./ThemedButton";
import { ThemedProgressBar } from "./ThemedProgressBar";

interface SavedProfile {
  username: string;
  privateKey: string;
  publicKey: string;
  npub: string;
  nsec: string;
  color: string;
  createdAt: number;
}

interface ProfileGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileSaved?: (profile: SavedProfile) => void;
  theme?: "matrix" | "material";
}

interface GeneratedProfile {
  username: string;
  privateKeyHex: string;
  publicKeyHex: string;
  npub: string;
  nsec: string;
  color: string;
  hue: number;
}

const styles = {
  matrix: {
    overlay:
      "fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-5",
    container:
      "bg-[#111] border-2 border-[#00ff00] rounded-lg p-6 max-w-[500px] w-full max-h-[90vh] overflow-y-auto font-mono text-[#00ff00] shadow-[0_0_20px_rgba(0,255,0,0.3)]",
    historyButton:
      "px-2 py-1 bg-black text-[#00ff00] border border-[#00ff00] rounded text-xs font-mono",
    error:
      "bg-[#330000] border border-[#ff0000] text-[#ff6666] p-2 rounded mb-5 text-sm",
    progressText: "text-center text-xs text-[#888]",
    profileOption: "border-[#00ff00]",
    previewCard:
      "bg-[#001100] border-2 border-[#00ff00] rounded-[15px] p-6 mb-5 shadow-[0_0_20px_rgba(0,255,0,0.2)]",
    previewUsername: "text-[#00ff00] text-[20px] font-bold",
    previewHighlight: "bg-yellow-300 text-black px-1 rounded",
    privateContainer: "bg-[#110000] border border-[#ff3300] rounded mb-5",
    privateToggle:
      "p-3 cursor-pointer flex items-center justify-between hover:bg-[#220000]",
    privateToggleOpen: "border-b border-[#ff3300]",
    privateToggleText:
      "text-[12px] text-[#ff6666] uppercase font-bold flex items-center gap-2",
    privateToggleIcon: "text-[#ff6666] transition-transform",
    privateContent: "p-4",
    privateItem: "mb-4",
    privateLabel: "text-[11px] text-[#ff9999] mb-1",
    privateValue:
      "bg-black p-2 rounded text-[11px] break-all flex justify-between items-center gap-2 border border-[#330000]",
    privateValueText: "text-[#ff9999]",
    copyButton:
      "bg-[#330000] text-[#ff6666] border border-[#ff3300] px-2 py-1 text-[10px] rounded cursor-pointer flex-shrink-0",
  },
  material: {
    overlay:
      "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-5",
    container:
      "bg-white border-2 border-blue-600 rounded-lg p-6 max-w-[500px] w-full max-h-[90vh] overflow-y-auto font-sans text-gray-800 shadow-xl",
    historyButton:
      "px-2 py-1 bg-white text-blue-600 border border-blue-600 rounded text-xs",
    error:
      "bg-red-50 border border-red-400 text-red-600 p-2 rounded mb-5 text-sm",
    progressText: "text-center text-xs text-gray-500",
    profileOption: "border-blue-600",
    previewCard:
      "bg-white border-2 border-blue-600 rounded-[15px] p-6 mb-5 shadow-md",
    previewUsername: "text-blue-600 text-[20px] font-bold",
    previewHighlight: "bg-yellow-200 text-black px-1 rounded",
    privateContainer: "bg-red-50 border border-red-400 rounded mb-5",
    privateToggle:
      "p-3 cursor-pointer flex items-center justify-between hover:bg-red-100",
    privateToggleOpen: "border-b border-red-400",
    privateToggleText:
      "text-[12px] text-red-600 uppercase font-bold flex items-center gap-2",
    privateToggleIcon: "text-red-600 transition-transform",
    privateContent: "p-4",
    privateItem: "mb-4",
    privateLabel: "text-[11px] text-red-500 mb-1",
    privateValue:
      "bg-white p-2 rounded text-[11px] break-all flex justify-between items-center gap-2 border border-red-200",
    privateValueText: "text-red-500",
    copyButton:
      "bg-red-200 text-red-700 border border-red-400 px-2 py-1 text-[10px] rounded cursor-pointer flex-shrink-0",
  },
} as const;

export function ProfileGenerationModal({
  isOpen,
  onClose,
  onProfileSaved,
  theme = "matrix",
}: ProfileGenerationModalProps) {
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedProfiles, setGeneratedProfiles] = useState<
    GeneratedProfile[]
  >([]);
  const [generatedProfile, setGeneratedProfile] =
    useState<GeneratedProfile | null>(null);
  const [error, setError] = useState("");
  const [showPrivateKeys, setShowPrivateKeys] = useState(false);
  const [recentIdentities, setRecentIdentities] = useState<string[]>([]);
  const cancelRef = useRef(false);
  const t = styles[theme];

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      cancelRef.current = true;
      setInput("");
      setIsGenerating(false);
      setProgress(0);
      setGeneratedProfiles([]);
      setGeneratedProfile(null);
      setError("");
      setShowPrivateKeys(false);
    }
  }, [isOpen]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nostr_identities");
      if (stored) {
        setRecentIdentities(JSON.parse(stored));
      }
    } catch {
      // ignore parsing errors
    }
  }, []);

  const addIdentityToHistory = (identity: string) => {
    setRecentIdentities((prev) => {
      const updated = [identity, ...prev.filter((i) => i !== identity)].slice(
        0,
        5
      );
      localStorage.setItem("nostr_identities", JSON.stringify(updated));
      return updated;
    });
  };

  const parseInput = (inputText: string) => {
    const parts = inputText.split("#");
    const username = parts[0].trim();
    const suffix = parts.length > 1 ? parts[1].trim() : "";

    if (suffix && !/^[0-9a-fA-F]{1,4}$/.test(suffix)) {
      throw new Error("Suffix must be 1-4 hexadecimal characters (0-9, a-f)");
    }

    return { username, suffix: suffix.toLowerCase() };
  };

  const generateKeys = async (identityInput?: string) => {
    try {
      setError("");
      const rawInput =
        typeof identityInput === "string" ? identityInput.trim() : input.trim();
      const { username, suffix } = parseInput(rawInput);

      if (!username) {
        setError("Please enter a username");
        return;
      }

      setInput(rawInput);
      addIdentityToHistory(rawInput);

      setProgress(0);
      setGeneratedProfiles([]);
      setGeneratedProfile(null);

      const targetSuffix = suffix;
      const cacheKey = `generated_profiles:${username}:${targetSuffix}`;
      const cached = localStorage.getItem(cacheKey);
      const profiles: GeneratedProfile[] = cached
        ? (JSON.parse(cached) as GeneratedProfile[])
        : [];

      if (profiles.length) {
        const sorted = [...profiles].sort((a, b) => a.hue - b.hue);
        setGeneratedProfiles(sorted);
        setProgress((sorted.length / 64) * 100);
        if (profiles.length >= 64) {
          setIsGenerating(false);
          return;
        }
      }

      setIsGenerating(true);
      cancelRef.current = false;

      let attempts = 0;

      while (profiles.length < 64 && !cancelRef.current) {
        const privateKey = generateSecretKey();
        const publicKey = getPublicKey(privateKey);
        if (!targetSuffix || publicKey.endsWith(targetSuffix)) {
          if (!profiles.some((p) => p.publicKeyHex === publicKey)) {
            const color = colorForPeerSeed('nostr' + publicKey, false);
            const hue = color.hsv.h;
            const npub = nip19.npubEncode(publicKey);
            const nsec = nip19.nsecEncode(privateKey);
            profiles.push({
              username,
              privateKeyHex: Array.from(privateKey, (byte) =>
                byte.toString(16).padStart(2, "0")
              ).join(""),
              publicKeyHex: publicKey,
              npub,
              nsec,
              color: color.hex,
              hue,
            });
            const sorted = [...profiles].sort((a, b) => a.hue - b.hue);
            setGeneratedProfiles(sorted);
            setProgress((sorted.length / 64) * 100);
            localStorage.setItem(cacheKey, JSON.stringify(sorted));
          }
        }

        attempts++;
        if (attempts % 1000 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }

      setIsGenerating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const saveProfile = () => {
    if (!generatedProfile) return;
    cancelRef.current = true;
    setIsGenerating(false);

    try {
      const profileData: SavedProfile = {
        username: generatedProfile.username,
        privateKey: generatedProfile.privateKeyHex,
        publicKey: generatedProfile.publicKeyHex,
        npub: generatedProfile.npub,
        nsec: generatedProfile.nsec,
        color: generatedProfile.color,
        createdAt: Date.now(),
      };

      localStorage.setItem("nostr_profile", JSON.stringify(profileData));

      // Call the callback to immediately update parent state with the new profile
      if (onProfileSaved) {
        onProfileSaved(profileData);
      }

      // Close modal after successful save
      onClose();
    } catch {
      setError("Failed to save profile to localStorage");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      setError("Failed to copy to clipboard");
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className={t.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={t.container}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="m-0 text-lg">🔐 CREATE NOSTR PROFILE</h2>
          <ThemedButton
            onClick={onClose}
            theme={theme}
            className="w-8 h-8 rounded-full p-0 text-xl flex items-center justify-center"
          >
            ✕
          </ThemedButton>
        </div>

        {!generatedProfile ? (
          <>
            {generatedProfiles.length === 0 ? (
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
                          onClick={() => generateKeys(id)}
                          className={t.historyButton}
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
                    onChange={(e) => setInput((e.target as HTMLInputElement).value)}
                    placeholder="username#1999"
                    disabled={isGenerating}
                    theme={theme}
                    className={`w-full p-3 text-base ${
                      theme === "matrix"
                        ? "focus:shadow-[0_0_5px_rgba(0,255,0,0.5)]"
                        : "focus:ring-2 focus:ring-blue-600"
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isGenerating) {
                        generateKeys();
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
                  onClick={() => generateKeys()}
                  disabled={isGenerating || !input.trim()}
                  theme={theme}
                  className="w-full py-3 text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? "GENERATING..." : "GENERATE PROFILES"}
                </ThemedButton>
              </>
            ) : (
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
                      onClick={() => setGeneratedProfile(profile)}
                      className={`w-10 h-10 rounded-full border ${t.profileOption}`}
                      style={{ backgroundColor: profile.color }}
                      title={profile.publicKeyHex.slice(-4)}
                    />
                  ))}
                </div>
                <ThemedButton
                  onClick={() => {
                    setGeneratedProfiles([]);
                    setProgress(0);
                  }}
                  theme={theme}
                  className="w-full py-3 text-sm mt-2"
                >
                  Change Name
                </ThemedButton>
              </>
            )}
          </>
        ) : (
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
                onClick={() => setGeneratedProfile(null)}
                theme={theme}
                className="flex-1 py-3 text-sm"
              >
                Change Color
              </ThemedButton>
              <ThemedButton
                onClick={saveProfile}
                theme={theme}
                className="flex-1 py-3 text-sm"
              >
                Save Profile
              </ThemedButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
