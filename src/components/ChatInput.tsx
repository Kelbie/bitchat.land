import React, { useState, useEffect, useRef } from "react";
import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, validateEvent, verifyEvent } from "nostr-tools/pure";
import { NOSTR_RELAYS } from "../constants/projections";
import { hexToBytes, bytesToHex } from "nostr-tools/utils";
import { generateSecretKey, getPublicKey } from "nostr-tools";

interface ChatInputProps {
  currentChannel: string; // e.g., "nyc" from "in:nyc"
  onMessageSent?: (message: string) => void;
  onOpenProfileModal?: () => void;
  prefillText?: string;
  savedProfile?: any; // Profile data passed from parent
}

interface SavedProfile {
  username: string;
  privateKey: string;
  publicKey: string;
  npub: string;
  nsec: string;
  createdAt: number;
}

export function ChatInput({ currentChannel, onMessageSent, onOpenProfileModal, prefillText, savedProfile }: ChatInputProps) {
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
  const publishToChannel = async (
    content: string,
    privateKeyHex: string,
    nameTag: string
  ) => {
    const isGeohash = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(currentChannel);
    const tags = [
      ["n", nameTag],
      ["client", "bitchat.land"],
    ];

    if (isGeohash) {
      tags.push(["g", currentChannel.toLowerCase()]);
    } else {
      tags.push(["d", currentChannel.toLowerCase()]);
      tags.push(["relay", NOSTR_RELAYS[0]]);
    }

    const eventTemplate = {
      kind: isGeohash ? 20000 : 23333,
      created_at: Math.floor(Date.now() / 1000),
      content,
      tags,
    };

    const signedEvent = finalizeEvent(eventTemplate, hexToBytes(privateKeyHex));
    const valid = validateEvent(signedEvent);
    const verified = verifyEvent(signedEvent);

    if (!valid) throw new Error("Event validation failed");
    if (!verified) throw new Error("Event signature verification failed");

    const pool = new SimplePool();
    try {
      const publishPromises = pool.publish(NOSTR_RELAYS, signedEvent);
      await Promise.race(publishPromises);
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

    if (!currentChannel || currentChannel === "global") {
      setError("Please select a specific channel or location to send a message");
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const msg = message.trim();
      await publishToChannel(msg, savedProfile.privateKey, savedProfile.username);
      setMessage("");
      onMessageSent?.(msg);

      if (msg.toLowerCase().startsWith("!roll")) {
        const args = msg.slice(5).trim();
        let min = 1;
        let max = 10;

        if (args) {
          if (args.includes("-")) {
            const [start, end] = args.split("-").map((n) => parseInt(n, 10));
            if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
              min = start;
              max = end;
            }
          } else {
            const num = parseInt(args, 10);
            if (!Number.isNaN(num)) {
              min = 0;
              max = num;
            }
          }
        }

        const tempSk = generateSecretKey();
        const tempPk = getPublicKey(tempSk);
        const pubkeyHex = typeof tempPk === "string" ? tempPk : bytesToHex(tempPk);

        const range = BigInt(max) - BigInt(min) + BigInt(1);
        const pkNum = BigInt("0x" + pubkeyHex);
        const roll = Number(pkNum % range) + min;

        const rollMsg = `@${savedProfile.username}#${savedProfile.publicKey.slice(-4)} rolled ${roll} point(s) via bitchat.land`;
        const tempSkHex = typeof tempSk === "string" ? tempSk : bytesToHex(tempSk);

        setTimeout(async () => {
          try {
            await publishToChannel(rollMsg, tempSkHex, "!roll");
            onMessageSent?.(rollMsg);
          } catch (err) {
            console.error("Failed to send roll result:", err);
          }
        }, 1000);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(
        `Failed to send message: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
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
      {error && (
        <div
          style={{
            fontSize: "12px",
            color: "#ff6666",
            backgroundColor: "rgba(255, 0, 0, 0.1)",
            padding: "6px 8px",
            borderRadius: "4px",
            border: "1px solid rgba(255, 0, 0, 0.3)",
          }}
        >
          {error}
        </div>
      )}

      {/* Input area */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "stretch",
        }}
      >
        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentChannel === "global" ? "Select a channel to start chatting..." : `Message #${currentChannel}...`}
            disabled={isSending}
            style={{
              width: "100%",
              minHeight: "36px",
              maxHeight: "120px",
              padding: "8px 12px",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "#00ff00",
              border: "1px solid #00ff00",
              borderRadius: "6px",
              fontSize: "14px",
              fontFamily: "Courier New, monospace",
              outline: "none",
              resize: "vertical",
              lineHeight: "1.4",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = "0 0 8px rgba(0, 255, 0, 0.3)";
              e.target.style.borderColor = "#00ff00";
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = "none";
              e.target.style.borderColor = "#00ff00";
            }}
          />

          {/* Character count */}
          <div
            style={{
              position: "absolute",
              bottom: "-18px",
              right: "0",
              fontSize: "10px",
              color: message.length > 280 ? "#ff6666" : "#888",
              fontFamily: "Courier New, monospace",
            }}
          >
            {message.length}/280
          </div>
        </div>

        <button
          onClick={sendMessage}
          disabled={isSending || !message.trim() || message.length > 280 || currentChannel === "global"}
          style={{
            padding: "8px 16px",
            backgroundColor:
              isSending || !message.trim() || message.length > 280 || currentChannel === "global"
                ? "#333"
                : "#003300",
            color:
              isSending || !message.trim() || message.length > 280 || currentChannel === "global"
                ? "#666"
                : "#00ff00",
            border: `1px solid ${
              isSending || !message.trim() || message.length > 280 || currentChannel === "global"
                ? "#666"
                : "#00ff00"
            }`,
            borderRadius: "6px",
            fontSize: "12px",
            fontFamily: "Courier New, monospace",
            cursor:
              isSending || !message.trim() || message.length > 280 || currentChannel === "global"
                ? "not-allowed"
                : "pointer",
            textTransform: "uppercase",
            fontWeight: "bold",
            minWidth: "60px",
            minHeight: "36px",
            height: "fit-content",
            alignSelf: "flex-start",
            transition: "all 0.2s ease",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            if (!isSending && message.trim() && message.length <= 280 && currentChannel !== "global") {
              e.currentTarget.style.backgroundColor = "#004400";
              e.currentTarget.style.boxShadow = "0 0 8px rgba(0, 255, 0, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSending && message.trim() && message.length <= 280 && currentChannel !== "global") {
              e.currentTarget.style.backgroundColor = "#003300";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
        >
          {isSending ? "..." : "Send"}
        </button>
      </div>

      {/* Send hint */}
      <div
        style={{
          fontSize: "10px",
          color: "#666",
          fontFamily: "Courier New, monospace",
          textAlign: "right",
          marginTop: "4px",
        }}
      >
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}