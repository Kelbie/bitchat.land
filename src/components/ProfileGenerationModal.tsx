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
            const color = colorForPeerSeed('nostr' + publicKey, true);
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
                <p
                  style={{
                    marginBottom: "20px",
                    fontSize: "14px",
                    lineHeight: "1.4",
                  }}
                >
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
                      className="w-10 h-10 border border-[#00ff00] rounded-full"
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
            <div
              style={{
                backgroundColor: "#001100",
                border: "2px solid #00ff00",
                borderRadius: "15px",
                padding: "25px",
                marginBottom: "20px",
                boxShadow: "0 0 20px rgba(0, 255, 0, 0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  marginBottom: "20px",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    backgroundColor: generatedProfile.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#000",
                    textShadow: "none",
                    border: `2px solid ${generatedProfile.color}`,
                    boxShadow: "0 0 15px rgba(0, 255, 0, 0.3)",
                  }}
                >
                  {generatedProfile.username.charAt(0).toUpperCase()}
                </div>

                {/* Profile Info */}
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      margin: "0",
                      color: "#00ff00",
                      fontSize: "20px",
                      textShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
                    }}
                  >
                    @{generatedProfile.username}#
                    <span
                      style={{
                        backgroundColor: "#ffff00",
                        color: "#000",
                        padding: "2px 4px",
                        borderRadius: "3px",
                        fontWeight: "bold",
                      }}
                    >
                      {generatedProfile.publicKeyHex.slice(-4)}
                    </span>
                  </h3>
                </div>
              </div>
            </div>

            {/* Private Keys Section - Collapsible */}
            <div
              style={{
                backgroundColor: "#110000",
                border: "1px solid #ff3300",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <div
                onClick={() => setShowPrivateKeys(!showPrivateKeys)}
                style={{
                  padding: "12px 15px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: showPrivateKeys ? "1px solid #ff3300" : "none",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#ff6666",
                    textTransform: "uppercase",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  🔐 Private Keys (Keep Secret!)
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    color: "#ff6666",
                    transform: showPrivateKeys
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  ▼
                </div>
              </div>

              {showPrivateKeys && (
                <div style={{ padding: "15px" }}>
                  <div style={{ marginBottom: "15px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#ff9999",
                        marginBottom: "5px",
                      }}
                    >
                      Private Key (nsec):
                    </div>
                    <div
                      style={{
                        backgroundColor: "#000",
                        padding: "8px",
                        borderRadius: "3px",
                        fontSize: "11px",
                        wordBreak: "break-all" as const,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "10px",
                        border: "1px solid #330000",
                      }}
                    >
                      <span style={{ color: "#ff9999" }}>
                        {generatedProfile.nsec}
                      </span>
                      <button
                        onClick={() => copyToClipboard(generatedProfile.nsec)}
                        style={{
                          background: "#330000",
                          color: "#ff6666",
                          border: "1px solid #ff3300",
                          padding: "4px 8px",
                          fontSize: "10px",
                          borderRadius: "3px",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
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
