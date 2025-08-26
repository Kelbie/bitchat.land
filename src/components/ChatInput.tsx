import React, { useState, useEffect, useRef } from "react";
import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, validateEvent, verifyEvent } from "nostr-tools/pure";
import { NOSTR_RELAYS } from "../constants/projections";
import { hexToBytes, bytesToHex } from "nostr-tools/utils";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { sha256 } from "@noble/hashes/sha256";

interface RollRange {
  min: number;
  max: number;
}

function parseRollCommand(input: string): RollRange | null {
  const match = input.trim().match(/^!roll(?:\s+(\d+)(?:-(\d+))?)?$/i);
  if (!match) return null;

  let min = 1;
  let max = 10;
  if (match[1]) {
    if (match[2]) {
      min = parseInt(match[1], 10);
      max = parseInt(match[2], 10);
    } else {
      min = 0;
      max = parseInt(match[1], 10);
    }
  }
  if (min > max) {
    [min, max] = [max, min];
  }
  return { min, max };
}

interface ChatInputProps {
  currentChannel: string; // e.g., "nyc" from "in:nyc"
  onMessageSent?: (message: string) => void;
  onOpenProfileModal?: () => void;
  prefillText?: string;
  savedProfile?: any; // Profile data passed from parent
  theme?: "matrix" | "material";
}

interface SavedProfile {
  username: string;
  privateKey: string;
  publicKey: string;
  npub: string;
  nsec: string;
  createdAt: number;
}

const styles = {
  matrix: {
    container: "flex flex-col gap-2 font-mono text-[#00ff00]",
    error:
      "text-[#ff6666] bg-[rgba(255,0,0,0.1)] px-2 py-1 rounded border border-[rgba(255,0,0,0.3)]",
    inputWrapper: "flex-1 relative flex flex-col",
    textarea:
      "w-full min-h-[36px] max-h-[120px] p-2 bg-black/80 text-[#00ff00] placeholder-[#00ff00]/50 border border-[#00ff00] rounded outline-none resize-vertical focus:shadow-[0_0_8px_rgba(0,255,0,0.3)]",
    charCount: "absolute -bottom-4 right-0 text-[10px] font-mono text-[#888]",
    charCountExceeded: "text-[#ff6666]",
    sendButton:
      "px-4 py-2 bg-[#003300] text-[#00ff00] border border-[#00ff00] rounded text-xs font-mono uppercase font-bold transition-colors",
    sendButtonHover: "hover:bg-[#004400] hover:shadow-[0_0_8px_rgba(0,255,0,0.3)]",
    sendButtonDisabled: "bg-[#333] text-[#666] border-[#666] cursor-not-allowed",
    hint: "text-right text-[10px] text-[#666] font-mono mt-1",
  },
  material: {
    container: "flex flex-col gap-2 font-sans text-gray-800",
    error: "text-red-600 bg-red-100 px-2 py-1 rounded border border-red-300",
    inputWrapper: "flex-1 relative flex flex-col",
    textarea:
      "w-full min-h-[36px] max-h-[120px] p-2 bg-white text-gray-800 placeholder-gray-400 border border-blue-600 rounded outline-none resize-vertical focus:ring-2 focus:ring-blue-600",
    charCount: "absolute -bottom-4 right-0 text-[10px] text-gray-500",
    charCountExceeded: "text-red-600",
    sendButton:
      "px-4 py-2 bg-blue-600 text-white border border-blue-600 rounded text-xs uppercase font-bold transition-colors",
    sendButtonHover: "hover:bg-blue-700",
    sendButtonDisabled: "bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed",
    hint: "text-right text-[10px] text-gray-500 mt-1",
  },
} as const;

export function ChatInput({
  currentChannel,
  onMessageSent,
  onOpenProfileModal,
  prefillText,
  savedProfile,
  theme = "matrix",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const lastPrefillRef = useRef<string>("");

  // Handle prefillText changes - only apply when it's a new prefill
  useEffect(() => {
    if (prefillText && prefillText !== lastPrefillRef.current) {
      setMessage(prefillText);
      lastPrefillRef.current = prefillText;
      // Focus the textarea after setting the prefill
      const textarea = document.querySelector('textarea');
      if (textarea) {
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(prefillText.length, prefillText.length);
        }, 100);
      }
    }
  }, [prefillText]); // Only depend on prefillText

  const t = styles[theme];

  const sendDisabled =
    isSending || !message.trim() || message.length > 280 || currentChannel === "global";

  const handleRoll = async ({ min, max }: RollRange) => {
    console.log("🎲 Roll command detected", { min, max });
  
    const tempPriv = generateSecretKey();
    const tempPub = getPublicKey(tempPriv);
    const hash = sha256(hexToBytes(tempPub));
    const hashHex = bytesToHex(hash);
    const rand = parseInt(hashHex.slice(0, 8), 16);
    const result = (rand % (max - min + 1)) + min;
  
    const isGeohash = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(currentChannel);
  
    const tags = [
      ["n", "!roll"],
      ["client", "bitchat.land"],
    ];
  
    let kind;
    if (isGeohash) {
      kind = 20000;
      tags.push(["g", currentChannel.toLowerCase()]);
    } else {
      kind = 23333;
      tags.push(["d", currentChannel.toLowerCase()]);
      tags.push(["relay", NOSTR_RELAYS[0]]);
    }
  
    const eventTemplate = {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      content: `@${savedProfile.username}#${savedProfile.publicKey.slice(-4)} rolled ${result} point(s) via bitchat.land`,
      tags,
    };
  
    const signedEvent = finalizeEvent(eventTemplate, tempPriv);
    const valid = validateEvent(signedEvent);
    const verified = verifyEvent(signedEvent);
  
    if (!valid) throw new Error("Event validation failed");
    if (!verified) throw new Error("Event signature verification failed");
  
    const pool = new SimplePool();
    try {
      const publishPromises = pool.publish(NOSTR_RELAYS, signedEvent);
      
      // Use Promise.allSettled to wait for all attempts, then check if at least one succeeded
      const results = await Promise.allSettled(publishPromises);
      const successful = results.filter(result => result.status === 'fulfilled');
      
      if (successful.length === 0) {
        const errors = results
          .filter(result => result.status === 'rejected')
          .map(result => result.reason?.message || 'Unknown error');
        throw new Error(`Failed to publish to any relay: ${errors.join(', ')}`);
      }
      
      console.log(`✅ Roll published successfully to ${successful.length}/${results.length} relays`);
      onMessageSent?.(eventTemplate.content);
    } finally {
      pool.close(NOSTR_RELAYS);
    }
  };
  
  const sendMessage = async () => {
    if (!message.trim() || !savedProfile) {
      setError(
        !savedProfile
          ? "No profile found. Please create a profile first."
          : "Please enter a message"
      );
      return;
    }
  
    // Handle global channel case
    if (!currentChannel || currentChannel === "global") {
      setError("Please select a specific channel or location to send a message");
      return;
    }
  
    setIsSending(true);
    setError("");
  
    try {
      console.log("🚀 Starting message send...");
      console.log("📝 Message:", message.trim());
      console.log("📍 Channel:", currentChannel);
      console.log("👤 Profile:", {
        username: savedProfile.username,
        publicKey: savedProfile.publicKey.slice(0, 8) + "...",
        privateKeyLength: savedProfile.privateKey.length
      });
  
      const rollRange = parseRollCommand(message.trim());
  
      // Convert hex private key to Uint8Array
      const privateKeyHex = savedProfile.privateKey;
  
      // Determine event kind and tags based on channel
      const isGeohash = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(currentChannel);
  
      console.log(`🔍 Channel analysis:`, {
        channel: currentChannel,
        isGeohash: isGeohash,
        regex: /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(currentChannel)
      });
  
      const tags = [
        ["n", savedProfile.username], // username tag
        ["client", "bitchat.land"] // client tag
      ];
  
      let kind;
      if (isGeohash) {
        kind = 20000; // Geohash channels use kind 20000
        tags.push(["g", currentChannel.toLowerCase()]);
        console.log(`📍 Using kind 20000 with geohash tag: g=${currentChannel.toLowerCase()}`);
      } else {
        kind = 23333; // Standard channels use kind 23333
        tags.push(["d", currentChannel.toLowerCase()]);
        tags.push(["relay", NOSTR_RELAYS[0]]);
        console.log(`💬 Using kind 23333 with group tag: d=${currentChannel.toLowerCase()}`);
      }
  
      // Create event template (don't include pubkey, finalizeEvent adds it)
      const eventTemplate = {
        kind: kind,
        created_at: Math.floor(Date.now() / 1000),
        content: message.trim(),
        tags: tags,
      };
  
      console.log("📄 Event template:", eventTemplate);
  
      // Sign the event
      const signedEvent = finalizeEvent(eventTemplate, hexToBytes(privateKeyHex));
      console.log("✍️ Signed event:", signedEvent);
  
      // Validate the event before publishing
      const valid = validateEvent(signedEvent);
      const verified = verifyEvent(signedEvent);
  
      if (!valid) {
        throw new Error("Event validation failed");
      }
      if (!verified) {
        throw new Error("Event signature verification failed");
      }
  
      console.log("✅ Event validated successfully");
  
      // Create pool and publish
      const pool = new SimplePool();
  
      try {
        console.log("Attempting to publish event to relays:", NOSTR_RELAYS);
  
        // Publish to relays - pool.publish returns an array of promises
        const publishPromises = pool.publish(NOSTR_RELAYS, signedEvent);
  
        console.log("Publish promises created:", publishPromises.length);
  
        // Use Promise.allSettled to wait for all attempts, then check if at least one succeeded
        const results = await Promise.allSettled(publishPromises);
        const successful = results.filter(result => result.status === 'fulfilled');
        
        if (successful.length === 0) {
          // All relays failed - collect error messages for debugging
          const errors = results
            .filter(result => result.status === 'rejected')
            .map(result => result.reason?.message || 'Unknown error');
          
          console.error("❌ Failed to publish to any relay. Errors:", errors);
          throw new Error(`Failed to publish message to any relay: ${errors.join(', ')}`);
        }
  
        // At least one relay succeeded
        console.log(`✅ Message published successfully to ${successful.length}/${results.length} relays`);
        
        // Log any failed relays for debugging (but don't throw)
        const failed = results.filter(result => result.status === 'rejected');
        if (failed.length > 0) {
          console.warn(`⚠️ Some relays failed (${failed.length}/${results.length}):`, 
            failed.map(result => result.reason?.message || 'Unknown error'));
        }
  
        // Clear input and notify parent
        setMessage("");
        onMessageSent?.(message.trim());
  
        if (rollRange) {
          setTimeout(() => {
            handleRoll(rollRange).catch(console.error);
          }, 1000);
        }
  
      } finally {
        // Always close the pool
        pool.close(NOSTR_RELAYS);
      }
      
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!savedProfile) {
    return (
      <div
        style={{
          padding: "16px",
          backgroundColor: "rgba(0, 0, 0, 0.95)",
          borderTop: "1px solid #003300",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          onClick={onOpenProfileModal}
          style={{
            color: "#00ff00",
            fontSize: "14px",
            fontFamily: "Courier New, monospace",
            backgroundColor: "#001100",
            border: "2px solid #00ff00",
            borderRadius: "8px",
            padding: "12px 20px",
            cursor: "pointer",
            textShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
            boxShadow: "0 0 15px rgba(0, 255, 0, 0.3)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#003300";
            e.currentTarget.style.boxShadow = "0 0 20px rgba(0, 255, 0, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#001100";
            e.currentTarget.style.boxShadow = "0 0 15px rgba(0, 255, 0, 0.3)";
          }}
        >
          🔐 Create Profile to Start Chatting
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "12px 16px",
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        borderTop: "1px solid #003300",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {/* Channel indicator */}
      <div
        style={{
          fontSize: "11px",
          color: "#888",
          fontFamily: "Courier New, monospace",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span>Sending to:</span>
        <span
          style={{
            color: "#00ff00",
            backgroundColor: "rgba(0, 255, 0, 0.1)",
            padding: "2px 6px",
            borderRadius: "3px",
            border: "1px solid rgba(0, 255, 0, 0.3)",
          }}
        >
          {currentChannel === "global" ? "Select Channel" : `#${currentChannel}`}
        </span>
        <span>as</span>
        <span
          style={{
            color: "#00aaaa",
          }}
        >
          @{savedProfile.username}#{savedProfile.publicKey.slice(-4)}
        </span>
      </div>

      {/* Error message */}
      {error && <div className={t.error}>{error}</div>}

      <div className="flex gap-2 items-stretch">
        <div className={t.inputWrapper}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentChannel === "global"
                ? "Select a channel to start chatting..."
                : `Message #${currentChannel}...`
            }
            disabled={isSending}
            className={t.textarea}
          />
          <div
            className={`${t.charCount} ${
              message.length > 280 ? t.charCountExceeded : ""
            }`}
          >
            {message.length}/280
          </div>
        </div>
        <button
          onClick={sendMessage}
          disabled={sendDisabled}
          className={`${t.sendButton} ${
            sendDisabled ? t.sendButtonDisabled : t.sendButtonHover
          }`}
        >
          {isSending ? "..." : "Send"}
        </button>
      </div>

      <div className={t.hint}>
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}