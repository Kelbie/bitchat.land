import { useState, useCallback, useEffect, useRef } from "react";
import { nip19 } from "nostr-tools";
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
  const workerRef = useRef<Worker | null>(null);

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

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Reset state when modal opens/closes
  const resetState = useCallback(async () => {
    cancelRef.current = true;
    
    // Stop the worker if it's running
    if (workerRef.current) {
      try {
        // Send stop command
        workerRef.current.postMessage({ command: 'STOP_GENERATION' });
        
        // Wait a bit for the worker to process the stop command
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Terminate the worker completely
        workerRef.current.terminate();
        workerRef.current = null;
      } catch (error) {
        console.error('Error stopping worker:', error);
        // Force terminate if there's an error
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
      }
    }
    
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

      // Create or reuse worker
      if (!workerRef.current) {
        workerRef.current = new Worker(new URL('../../../workers/profileGenerationWorker.js', import.meta.url), {
          type: 'module'
        });
      }

      // Set up worker message handler
      const handleWorkerMessage = (e: MessageEvent) => {
        const { type, data } = e.data;
        
        switch (type) {
          case 'PROFILE_GENERATED': {
            // Add color and encoding to the profile
            const profileWithColor = addProfileMetadata(data.profile, username);
            
            // Use functional update to get the current state
            setGeneratedProfiles(prevProfiles => {
              const updatedProfiles = [...prevProfiles, profileWithColor];
              const sorted = updatedProfiles.sort((a, b) => a.hue - b.hue);
              
              // Update localStorage with the new sorted profiles
              localStorage.setItem(cacheKey, JSON.stringify(sorted));
              
              // Update progress
              setProgress((sorted.length / 64) * 100);
              
              return sorted;
            });
            break;
          }
            
          case 'GENERATION_PROGRESS':
            // Update progress based on attempts
            setProgress(Math.min((data.found / 64) * 100, 99));
            break;
            
          case 'GENERATION_COMPLETE':
            setIsGenerating(false);
            setProgress(100);
            break;
            
          case 'GENERATION_CANCELLED':
            setIsGenerating(false);
            break;
            
          case 'GENERATION_ERROR':
            setError(data.error || 'Profile generation failed');
            setIsGenerating(false);
            setProgress(0);
            break;
        }
      };

      workerRef.current.onmessage = handleWorkerMessage;

      // Start generation
      workerRef.current.postMessage({
        command: 'START_GENERATION',
        data: {
          username,
          targetSuffix,
          maxProfiles: 64
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsGenerating(false);
      setProgress(0);
    }
  }, [input, addIdentityToHistory]);

  // Helper function to add color and encoding metadata to profiles
  const addProfileMetadata = useCallback((profile: { privateKeyHex: string; publicKeyHex: string }, username: string): GeneratedProfile => {
    const color = colorForPeerSeed('nostr' + profile.publicKeyHex.toLowerCase(), true);
    const hue = color.hsv.h;
    const npub = nip19.npubEncode(profile.publicKeyHex);
    
    // Convert hex string back to Uint8Array for nsecEncode
    const privateKeyBytes = new Uint8Array(
      profile.privateKeyHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    const nsec = nip19.nsecEncode(privateKeyBytes);
    
    return {
      username,
      privateKeyHex: profile.privateKeyHex,
      publicKeyHex: profile.publicKeyHex,
      npub,
      nsec,
      color: color.hex,
      hue,
    };
  }, []);

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
