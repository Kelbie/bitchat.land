import React, { useState, useEffect, useRef } from "react";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { colorForNostrPubkey, hueFromColor } from "../utils/userColor";

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

export function ProfileGenerationModal({
  isOpen,
  onClose,
  onProfileSaved,
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
      const rawInput = (identityInput ?? input).trim();
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
            const color = colorForNostrPubkey(publicKey, true);
            const hue = hueFromColor(color);
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
              color,
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
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#111",
          border: "2px solid #00ff00",
          borderRadius: "10px",
          padding: "30px",
          maxWidth: "500px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: "Courier New, monospace",
          color: "#00ff00",
          boxShadow: "0 0 20px rgba(0, 255, 0, 0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#00ff00",
              textShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
              fontSize: "20px",
            }}
          >
            🔐 CREATE NOSTR PROFILE
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #00ff00",
              color: "#00ff00",
              fontSize: "18px",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
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
                  <div style={{ marginBottom: "20px" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        marginBottom: "8px",
                      }}
                    >
                      Previous identities:
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      {recentIdentities.map((id) => (
                        <button
                          key={id}
                          onClick={() => generateKeys(id)}
                          style={{
                            padding: "6px 10px",
                            backgroundColor: "#000",
                            color: "#00ff00",
                            border: "1px solid #00ff00",
                            borderRadius: "5px",
                            fontFamily: "Courier New, monospace",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: "20px" }}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="username#1999"
                    disabled={isGenerating}
                    style={{
                      width: "100%",
                      padding: "12px",
                      backgroundColor: "#000",
                      color: "#00ff00",
                      border: "1px solid #00ff00",
                      borderRadius: "5px",
                      fontSize: "16px",
                      fontFamily: "Courier New, monospace",
                      outline: "none",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isGenerating) {
                        generateKeys();
                      }
                    }}
                  />
                </div>

                {error && (
                  <div
                    style={{
                      backgroundColor: "#330000",
                      border: "1px solid #ff0000",
                      color: "#ff6666",
                      padding: "10px",
                      borderRadius: "5px",
                      marginBottom: "20px",
                      fontSize: "14px",
                    }}
                  >
                    {error}
                  </div>
                )}

                {isGenerating && (
                  <div style={{ marginBottom: "20px" }}>
                    <div
                      style={{
                        backgroundColor: "#333",
                        height: "10px",
                        borderRadius: "5px",
                        overflow: "hidden",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#00ff00",
                          height: "100%",
                          width: `${progress}%`,
                          transition: "width 0.3s ease",
                          borderRadius: "5px",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        textAlign: "center",
                        color: "#888",
                      }}
                    >
                      Generating keys... {Math.round(progress)}%
                      {input.includes("#") && (
                        <div style={{ marginTop: "5px" }}>
                          This may take a while for longer suffixes
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={generateKeys}
                  disabled={isGenerating || !input.trim()}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor:
                      isGenerating || !input.trim() ? "#333" : "#000",
                    color: isGenerating || !input.trim() ? "#666" : "#00ff00",
                    border: `1px solid ${
                      isGenerating || !input.trim() ? "#666" : "#00ff00"
                    }`,
                    borderRadius: "5px",
                    fontSize: "16px",
                    fontFamily: "Courier New, monospace",
                    cursor:
                      isGenerating || !input.trim() ? "not-allowed" : "pointer",
                    textTransform: "uppercase",
                    fontWeight: "bold",
                  }}
                >
                  {isGenerating ? "GENERATING..." : "GENERATE PROFILES"}
                </button>
              </>
            ) : (
              <>
                {isGenerating && generatedProfiles.length < 64 && (
                  <div style={{ marginBottom: "20px" }}>
                    <div
                      style={{
                        backgroundColor: "#333",
                        height: "10px",
                        borderRadius: "5px",
                        overflow: "hidden",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#00ff00",
                          height: "100%",
                          width: `${progress}%`,
                          transition: "width 0.3s ease",
                          borderRadius: "5px",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        textAlign: "center",
                        color: "#888",
                      }}
                    >
                      Found {generatedProfiles.length} profile
                      {generatedProfiles.length !== 1 ? "s" : ""}... searching
                      for more
                    </div>
                  </div>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(8, 1fr)",
                    gridAutoRows: "1fr", // make rows flexible too
                    gap: "12px",
                    marginBottom: "20px",
                  }}
                >
                  {generatedProfiles.map((profile, idx) => (
                    <button
                      key={idx}
                      onClick={() => setGeneratedProfile(profile)}
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: profile.color,
                        border: "1px solid #00ff00",
                        cursor: "pointer",
                        borderRadius: "50%",
                      }}
                      title={profile.publicKeyHex.slice(-4)}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    setGeneratedProfiles([]);
                    setProgress(0);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: "#333",
                    color: "#fff",
                    border: "1px solid #555",
                    borderRadius: "5px",
                    fontSize: "14px",
                    fontFamily: "Courier New, monospace",
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  Change Name
                </button>
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

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setGeneratedProfile(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#333",
                  color: "#fff",
                  border: "1px solid #555",
                  borderRadius: "5px",
                  fontSize: "14px",
                  fontFamily: "Courier New, monospace",
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                Change Color
              </button>
              <button
                onClick={saveProfile}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "#003300",
                  color: "#00ff00",
                  border: "1px solid #00ff00",
                  borderRadius: "5px",
                  fontSize: "14px",
                  fontFamily: "Courier New, monospace",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  fontWeight: "bold",
                }}
              >
                Save Profile
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
