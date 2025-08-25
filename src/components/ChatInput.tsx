import React, { useState, useEffect } from "react";
import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, validateEvent, verifyEvent } from "nostr-tools/pure";
import { NOSTR_RELAYS } from "../constants/projections";
import { hexToBytes } from "nostr-tools/utils";

interface ChatInputProps {
  currentChannel: string; // e.g., "nyc" from "in:nyc"
  onMessageSent?: (message: string) => void;
  onOpenProfileModal?: () => void;
}

interface SavedProfile {
  username: string;
  privateKey: string;
  publicKey: string;
  npub: string;
  nsec: string;
  createdAt: number;
}

export function ChatInput({ currentChannel, onMessageSent, onOpenProfileModal }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [savedProfile, setSavedProfile] = useState<SavedProfile | null>(null);
  const [error, setError] = useState("");

  // Load saved profile on component mount
  useEffect(() => {
    try {
      const profileData = localStorage.getItem("nostr_profile");
      if (profileData) {
        const profile = JSON.parse(profileData) as SavedProfile;
        setSavedProfile(profile);
      }
    } catch (err) {
      console.warn("Failed to load saved profile:", err);
    }
  }, []);

  const sendMessage = async () => {
    if (!message.trim() || !currentChannel || !savedProfile) {
      setError(
        !savedProfile
          ? "No profile found. Please create a profile first."
          : "Please enter a message"
      );
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
        
        // Method 1: Use Promise.any (as recommended in docs)
        try {
          await Promise.any(pool.publish(NOSTR_RELAYS, signedEvent));
          console.log("✅ Message published successfully using Promise.any");
          
          // Clear input and notify parent
          setMessage("");
          onMessageSent?.(message.trim());
          
        } catch (aggregateError) {
          console.warn("Promise.any failed, trying alternative method...");
          
          // Method 2: Handle individual publications
          const publishResults = pool.publish(NOSTR_RELAYS, signedEvent);
          let successCount = 0;
          let errorCount = 0;
          
          const publishPromises = publishResults.map(pub => {
            return new Promise<void>((resolve, reject) => {
              pub.on('ok', (relay: string, eventId: string) => {
                console.log(`✅ Successfully published to ${relay}`, eventId);
                successCount++;
                resolve();
              });
              
              pub.on('failed', (relay: string, reason: string) => {
                console.error(`❌ Failed to publish to ${relay}:`, reason);
                errorCount++;
                reject(new Error(`Failed to publish to ${relay}: ${reason}`));
              });
              
              // Timeout after 10 seconds
              setTimeout(() => {
                reject(new Error(`Timeout publishing to relay`));
              }, 10000);
            });
          });
          
          // Wait for at least one success or all failures
          try {
            await Promise.any(publishPromises);
            console.log(`✅ Message sent successfully to ${successCount} relays`);
            
            // Clear input and notify parent
            setMessage("");
            onMessageSent?.(message.trim());
            
          } catch (error) {
            throw new Error("Failed to publish to any relay using fallback method");
          }
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
          #{currentChannel}
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
            placeholder={`Message #${currentChannel}...`}
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
          disabled={isSending || !message.trim() || message.length > 280}
          style={{
            padding: "8px 16px",
            backgroundColor:
              isSending || !message.trim() || message.length > 280
                ? "#333"
                : "#003300",
            color:
              isSending || !message.trim() || message.length > 280
                ? "#666"
                : "#00ff00",
            border: `1px solid ${
              isSending || !message.trim() || message.length > 280
                ? "#666"
                : "#00ff00"
            }`,
            borderRadius: "6px",
            fontSize: "12px",
            fontFamily: "Courier New, monospace",
            cursor:
              isSending || !message.trim() || message.length > 280
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
            if (!isSending && message.trim() && message.length <= 280) {
              e.currentTarget.style.backgroundColor = "#004400";
              e.currentTarget.style.boxShadow = "0 0 8px rgba(0, 255, 0, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSending && message.trim() && message.length <= 280) {
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