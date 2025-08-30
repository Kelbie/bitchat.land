import { useState, useCallback, useEffect, useRef } from "react";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { colorForPeerSeed } from "../../../utils/userColor";
import { ProfileGenerationState, ProfileGenerationContext, GeneratedProfile } from "./types";

export function useProfileGenerationState() {
  const [state, setState] = useState<ProfileGenerationState>("input");
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedProfiles, setGeneratedProfiles] = useState<GeneratedProfile[]>([]);
  const [generatedProfile, setGeneratedProfile] = useState<GeneratedProfile | null>(null);
  const [error, setError] = useState("");
  const [recentIdentities, setRecentIdentities] = useState<string[]>([]);
  const cancelRef = useRef(false);

  // Load recent identities on mount
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

  // Reset state when modal opens/closes
  const resetState = useCallback(() => {
    cancelRef.current = true;
    setState("input");
    setInput("");
    setIsGenerating(false);
    setProgress(0);
    setGeneratedProfiles([]);
    setGeneratedProfile(null);
    setError("");
  }, []);

  const addIdentityToHistory = useCallback((identity: string) => {
    setRecentIdentities((prev) => {
      const updated = [identity, ...prev.filter((i) => i !== identity)].slice(0, 5);
      localStorage.setItem("nostr_identities", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const parseInput = (inputText: string) => {
    const parts = inputText.split("#");
    const username = parts[0].trim();
    const suffix = parts.length > 1 ? parts[1].trim() : "";

    if (suffix && !/^[0-9a-fA-F]{1,4}$/.test(suffix)) {
      throw new Error("Suffix must be 1-4 hexadecimal characters (0-9, a-f)");
    }

    return { username, suffix: suffix.toLowerCase() };
  };

  const generateKeys = useCallback(async (identityInput?: string) => {
    try {
      setError("");
      const rawInput = typeof identityInput === "string" ? identityInput.trim() : input.trim();
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
      setState("selection");

      const targetSuffix = suffix;
      const cacheKey = `generated_profiles:${username}:${targetSuffix}`;
      const cached = localStorage.getItem(cacheKey);
      const profiles: GeneratedProfile[] = cached ? (JSON.parse(cached) as GeneratedProfile[]) : [];

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
  }, [input, addIdentityToHistory]);

  const selectProfile = useCallback((profile: GeneratedProfile) => {
    setGeneratedProfile(profile);
    setState("preview");
  }, []);

  const changeName = useCallback(() => {
    setState("input");
    setGeneratedProfiles([]);
    setProgress(0);
    setGeneratedProfile(null);
  }, []);

  const changeColor = useCallback(() => {
    setState("selection");
    setGeneratedProfile(null);
  }, []);

  const saveProfile = useCallback(() => {
    if (!generatedProfile) return;
    cancelRef.current = true;
    setIsGenerating(false);

    try {
      const profileData = {
        username: generatedProfile.username,
        privateKey: generatedProfile.privateKeyHex,
        publicKey: generatedProfile.publicKeyHex,
        npub: generatedProfile.npub,
        nsec: generatedProfile.nsec,
        color: generatedProfile.color,
        createdAt: Date.now(),
      };

      localStorage.setItem("nostr_profile", JSON.stringify(profileData));
      return profileData;
    } catch {
      setError("Failed to save profile to localStorage");
      return null;
    }
  }, [generatedProfile]);

  const context: ProfileGenerationContext = {
    state,
    input,
    isGenerating,
    progress,
    generatedProfiles,
    generatedProfile,
    error,
    recentIdentities,
  };

  return {
    context,
    actions: {
      setInput,
      generateKeys,
      selectProfile,
      changeName,
      changeColor,
      saveProfile,
      resetState,
    },
  };
}
