import React, { useState, useEffect, useRef } from "react";
import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, validateEvent, verifyEvent } from "nostr-tools/pure";
import { NOSTR_RELAYS } from "../../constants/projections";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { sha256 } from "@noble/hashes/sha256";
import { ThemedInput } from "../common/ThemedInput";
import { GeoRelayDirectory } from "../../utils/geoRelayDirectory";
import { globalStyles } from "../../styles";

// Extend Window interface to include our custom method
declare global {
  interface Window {
    openFavoritesModal?: () => void;
    onInsertImage?: (imageUrl: string, cursorPosition?: number, currentValue?: string) => void;
    updateChatInputValue?: (value: string, cursorPos: number) => void;
    getChatInputCursorPosition?: () => number;
    getChatInputValue?: () => string;
  }
}

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
  savedProfile?: SavedProfile; // Profile data passed from parent
  theme?: "matrix" | "material";
  onInsertImage?: (imageUrl: string) => void;
  powEnabled?: boolean;
  powDifficulty?: number;
}

interface SavedProfile {
  username: string;
  privateKey: string;
  publicKey: string;
  npub: string;
  nsec: string;
  createdAt: number;
}

interface EventTemplate {
  kind: number;
  created_at: number;
  content: string;
  tags: string[][];
}

interface PowWorkerMessage {
  type: 'POW_COMPLETE' | 'POW_ERROR' | 'POW_STOPPED';
  data: {
    success?: boolean;
    minedEvent?: {
      id: string;
      kind: number;
      created_at: number;
      content: string;
      tags: string[][];
    };
    difficulty?: number;
    eventId?: string;
    error?: string;
    message?: string;
  };
}

const styles = globalStyles["ChatInput"];

export function ChatInput({
  currentChannel,
  onMessageSent,
  onOpenProfileModal,
  prefillText,
  savedProfile,
  theme = "matrix",
  onInsertImage,
  powEnabled = true,
  powDifficulty = 8,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMiningPow, setIsMiningPow] = useState(false);
  const [error, setError] = useState("");
  const [eventTemplateForPow, setEventTemplateForPow] = useState<EventTemplate | null>(null);
  const lastPrefillRef = useRef<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const powWorkerRef = useRef<Worker | null>(null);

  // Handle prefillText changes - only apply when it's a new prefill
  useEffect(() => {
    if (prefillText && prefillText !== lastPrefillRef.current) {
      setMessage(prefillText);
      lastPrefillRef.current = prefillText;
      // Focus the textarea after setting the prefill
      if (textareaRef.current) {
        setTimeout(() => {
          textareaRef.current?.focus();
          textareaRef.current?.setSelectionRange(prefillText.length, prefillText.length);
        }, 100);
      }
    }
  }, [prefillText]); // Only depend on prefillText

  // Set up the onInsertImage callback for the favorites modal
  useEffect(() => {
    if (onInsertImage) {
      window.onInsertImage = handleInsertImage;
    }
    
    // Expose functions for getting cursor position and input value
    window.getChatInputCursorPosition = () => {
      // Use the ref to get the textarea for this component
      const textarea = textareaRef.current;
      const cursorPos = textarea ? textarea.selectionStart : 0;
      return cursorPos;
    };
    
    window.getChatInputValue = () => {
      return message;
    };
    
    // Expose function for updating input value
    window.updateChatInputValue = (newValue: string, newCursorPos: number) => {
      setMessage(newValue);
      // Set cursor position after the component re-renders
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          // Ensure cursor position is within bounds
          const safeCursorPos = Math.min(Math.max(0, newCursorPos), newValue.length);
          textarea.setSelectionRange(safeCursorPos, safeCursorPos);
          textarea.focus();
        }
      }, 0);
    };
    
    return () => {
      delete window.onInsertImage;
      delete window.getChatInputCursorPosition;
      delete window.getChatInputValue;
      delete window.updateChatInputValue;
    };
  }, [onInsertImage, message]);

  // Focus textarea when message is cleared (after sending)
  useEffect(() => {
    if (message === "" && textareaRef.current) {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      });
    }
  }, [message]);

  // Initialize POW worker
  useEffect(() => {
    // Create worker with ES module support
    powWorkerRef.current = new Worker(
      new URL('../../workers/powWorker.js', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from worker
    powWorkerRef.current.onmessage = function(e) {
      const { type, data } = e.data as PowWorkerMessage;
      
      switch (type) {
        case 'POW_COMPLETE':
          handlePowComplete(data);
          break;
        case 'POW_ERROR':
          handlePowError(data);
          break;
        case 'POW_STOPPED':
          handlePowStopped(data);
          break;
        default:
          console.log('Unknown worker message type:', type);
      }
    };

    // Handle worker errors
    powWorkerRef.current.onerror = function(error) {
      console.error('POW Worker error:', error);
      setIsMiningPow(false);
      setError('POW worker error: ' + error.message);
    };

    // Cleanup worker on unmount
    return () => {
      if (powWorkerRef.current) {
        powWorkerRef.current.terminate();
      }
    };
  }, []);

  // POW message handlers
  const handlePowComplete = (data: PowWorkerMessage['data']) => {
    setIsMiningPow(false);
    // Continue with message sending using the mined event
    if (data.minedEvent) {
      continueWithMinedEvent(data.minedEvent);
    }
  };

  const handlePowError = (data: PowWorkerMessage['data']) => {
    console.error('❌ POW failed:', data.error);
    setIsMiningPow(false);
    setError(`POW mining failed: ${data.error}`);
    // Continue without POW
    continueWithoutPow();
  };

  const handlePowStopped = (data: PowWorkerMessage['data']) => {
    setIsMiningPow(false);
    // Continue without POW
    continueWithoutPow();
  };

  // Continue functions for POW flow
  const continueWithMinedEvent = (minedEvent: NonNullable<PowWorkerMessage['data']['minedEvent']>) => {
    // Create event template from mined event
    const eventWithPow: EventTemplate = {
      kind: minedEvent.kind,
      created_at: minedEvent.created_at,
      content: minedEvent.content,
      tags: minedEvent.tags,
    };
    
    // Continue with the normal flow
    continueWithEvent(eventWithPow);
  };

  const continueWithoutPow = () => {
    // Continue with the original event template
    if (eventTemplateForPow) {
      continueWithEvent(eventTemplateForPow);
    } else {
      // Create a proper event template with current channel information
      const isGeohash = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(currentChannel);
      
      const tags = [
        ["n", savedProfile?.username || "Anonymous"],
        ["client", "bitchat.land"]
      ];
      
      let kind;
      if (isGeohash) {
        kind = 20000; // Geohash channels use kind 20000
        tags.push(["g", currentChannel.toLowerCase()]);
      } else {
        kind = 23333; // Standard channels use kind 23333
        tags.push(["d", currentChannel.toLowerCase()]);
        tags.push(["relay", NOSTR_RELAYS[0]]);
      }
      
      const basicTemplate: EventTemplate = {
        kind,
        created_at: Math.floor(Date.now() / 1000),
        content: message.trim(),
        tags,
      };
      continueWithEvent(basicTemplate);
    }
  };

  const continueWithEvent = (eventToUse: EventTemplate) => {
    if (!savedProfile) {
      setError("No profile found");
      return;
    }
    
    // Sign the event
    const signedEvent = finalizeEvent(eventToUse, hexToBytes(savedProfile.privateKey));
    
    // Continue with publishing
    publishEvent(signedEvent);
    
    // Handle roll command after message is sent
    const rollRange = parseRollCommand(message.trim());
    if (rollRange) {
      setTimeout(() => {
        handleRoll(rollRange).catch(console.error);
      }, 1000);
    }
  };

  const publishEvent = (signedEvent: ReturnType<typeof finalizeEvent>) => {
    // Get ALL available relays for maximum distribution
    let allRelays = ["wss://relay.damus.io"]; // Start with single fallback relay
    
    // Add georelay relays if available
    try {
      const isGeohash = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(currentChannel);
      
      if (isGeohash) {
        // For geohash channels, get relays closest to that geohash
        const geoRelays = GeoRelayDirectory.shared.closestRelays(currentChannel, 10);
        if (geoRelays.length > 0) {
          allRelays = [...new Set([...allRelays, ...geoRelays])];
        }
      } else {
        // For group channels, get relays closest to current location (if available)
        try {
          const geoRelays = GeoRelayDirectory.shared.closestRelays("u", 10); // Use global fallback
          if (geoRelays.length > 0) {
            allRelays = [...new Set([...allRelays, ...geoRelays])];
          }
        } catch (geoError) {
          console.warn("Could not get georelay relays for current location:", geoError);
        }
      }
    } catch (geoError) {
      console.warn("Could not get georelay relays:", geoError);
    }
    
    // Remove duplicates and ensure we have valid relay URLs
    allRelays = [...new Set(allRelays)].filter(relay => 
      relay && relay.startsWith('wss://') && relay.length > 0
    );
    
    // Create pool and publish
    const pool = new SimplePool();

    try {
      // Publish to ALL relays - pool.publish returns an array of promises
      const publishPromises = pool.publish(allRelays, signedEvent);

      // Use Promise.allSettled to wait for all attempts, then check if at least one succeeded
      Promise.allSettled(publishPromises).then((results) => {
        const successful = results.filter(result => result.status === 'fulfilled');
        
        if (successful.length === 0) {
          // All relays failed - collect error messages for debugging
          const errors = results
            .filter(result => result.status === 'rejected')
            .map(result => result.reason?.message || 'Unknown error');
          
          console.error("Failed to publish to any relay. Errors:", errors);
          setError(`Failed to publish message to any relay: ${errors.join(', ')}`);
        } else {
          // Log any failed relays for debugging (but don't throw)
          const failed = results.filter(result => result.status === 'rejected');
          if (failed.length > 0) {
            console.warn(
              `Warning: Some relays failed (${failed.length}/${results.length}):`,
              failed.map(result => result.reason?.message || 'Unknown error')
            );
          }

          // Clear input and notify parent
          setMessage("");
          onMessageSent?.(signedEvent.content);

          // Focus the textarea after clearing the message
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              // Try to focus again after a short delay to ensure it sticks
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.focus();
                }
              }, 50);
            } else {
              console.warn("Warning: textareaRef.current is null");
              // Fallback: try to find textarea by data attribute
              const textarea = document.querySelector('textarea[data-chat-input="true"]') as HTMLTextAreaElement;
              if (textarea) {
                textarea.focus();
              }
            }
          }, 100);
        }
      }).catch((error) => {
        console.error("Error during publishing:", error);
        setError(`Publishing error: ${error.message}`);
      }).finally(() => {
        setIsSending(false);
        pool.close(allRelays);
      });
      
    } catch (err) {
      console.error("Failed to publish event:", err);
      setError(`Failed to publish event: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsSending(false);
      pool.close(allRelays);
    }
  };

  const t = styles[theme];

  const sendDisabled =
    isSending || !message.trim() || message.length > 280 || currentChannel === "global";

  const handleRoll = async ({ min, max }: RollRange) => {
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
              content: `@${savedProfile?.username}#${savedProfile?.publicKey.slice(-4)} rolled ${result} point(s) via bitchat.land`,
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
      const rollRange = parseRollCommand(message.trim());
  
      // Determine event kind and tags based on channel
      const isGeohash = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(currentChannel);
  
      const tags = [
        ["n", savedProfile.username], // username tag
        ["client", "bitchat.land"] // client tag
      ];
  
      let kind;
      if (isGeohash) {
        kind = 20000; // Geohash channels use kind 20000
        tags.push(["g", currentChannel.toLowerCase()]);
      } else {
        kind = 23333; // Standard channels use kind 23333
        tags.push(["d", currentChannel.toLowerCase()]);
        tags.push(["relay", NOSTR_RELAYS[0]]);
      }
  
            // Create event template (don't include pubkey, finalizeEvent adds it)
      const eventTemplate = {
        kind: kind,
        created_at: Math.floor(Date.now() / 1000),
        content: message.trim(),
        tags: tags,
      };


      // Apply proof of work if enabled
      if (powEnabled && powDifficulty > 0) {
        setIsMiningPow(true);
        
        // Create a complete event template with pubkey for POW mining
        const eventForPow = {
          ...eventTemplate,
          pubkey: savedProfile.publicKey,
        };
        
        // Send work to worker
        if (powWorkerRef.current) {
          powWorkerRef.current.postMessage({
            command: 'START_POW',
            data: {
              eventTemplate: eventForPow,
              difficulty: powDifficulty
            }
          });
          
          // Store the event template for later use
          setEventTemplateForPow(eventTemplate);
          return; // Exit early, worker will handle the rest
        } else {
          console.warn("Warning: POW worker not available, continuing without POW");
          setIsMiningPow(false);
        }
      }

      // If no POW or POW failed, continue with normal flow
      continueWithoutPow();
      return; // Exit early after sending message without POW
  
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle inserting image URL into input
  const handleInsertImage = (imageUrl: string) => {
    const currentMessage = message;
    const newMessage = currentMessage + (currentMessage ? " " : "") + imageUrl;
    setMessage(newMessage);
    
    // Focus the textarea and move cursor to end
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newMessage.length, newMessage.length);
    }
  };

  if (!savedProfile) {
    return (
      <div className={t.noProfileContainer}>
        <button onClick={onOpenProfileModal} className={t.noProfileButton}>
          🔐 Create Profile to Start Chatting
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Chat Input and Message Composition" className={t.container}>
      {/* Channel indicator */}
      <div className={t.channelInfo} role="status" aria-live="polite">
        <span>Sending to:</span>
        <span className={t.channelPill}>
          {currentChannel === "global" ? "Select Channel" : `#${currentChannel}`}
        </span>
        <span>as</span>
        <span className={t.username}>
          @{savedProfile.username}#{savedProfile.publicKey.slice(-4)}
        </span>
        {powEnabled && powDifficulty > 0 && (
          <span className="ml-2 text-xs text-gray-400">
            ⛏️ POW {powDifficulty}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && <div className={t.error}>{error}</div>}

      <div className="flex gap-2 items-stretch">
        <div className={t.inputWrapper}>
          <ThemedInput
            ref={textareaRef}
            as="textarea"
            value={message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentChannel === "global"
                ? "Select a channel to start chatting..."
                : `Message #${currentChannel}...`
            }
            disabled={isSending}
            theme={theme}
            data-chat-input="true"
            className={`w-full min-h-[36px] max-h-[120px] p-2 resize-vertical ${
              theme === "matrix"
                ? "focus:shadow-[0_0_8px_rgba(0,255,0,0.3)]"
                : "focus:ring-2 focus:ring-blue-600"
            }`}
          />
          <div
            className={`${t.charCount} ${
              message.length > 280 ? t.charCountExceeded : ""
            }`}
          >
            {message.length}/280
          </div>
        </div>
        
        {/* Favorites button */}
        <button
          onClick={() => {
            if (window.openFavoritesModal) {
              window.openFavoritesModal();
            }
          }}
          className={`px-3 py-2 rounded text-xs font-bold transition-colors ${
            theme === "matrix"
              ? "bg-green-950 text-green-400 border border-green-400 hover:bg-green-900 hover:shadow-[0_0_8px_rgba(34,197,94,0.3)]"
              : "bg-blue-600 text-white border border-blue-600 hover:bg-blue-700"
          }`}
          title="Open favorite images"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </button>
        
        <button
          onClick={sendMessage}
          disabled={sendDisabled}
          className={`${t.sendButton} ${
            sendDisabled ? t.sendButtonDisabled : t.sendButtonHover
          }`}
        >
          {isSending ? "..." : isMiningPow ? "⛏️ Mining..." : "Send"}
        </button>
      </div>

      <div className={t.hint}>
        Press Enter to send, Shift+Enter for new line
        {powEnabled && powDifficulty > 0 && (
          <span className="ml-2 text-xs text-gray-400">
            • POW: {powDifficulty} bits
          </span>
        )}
      </div>
    </section>
  );
}

// Helper function to convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Helper function to convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}