import React, { useState, useEffect, useRef, useCallback } from "react";
import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, validateEvent, verifyEvent } from "nostr-tools/pure";
import { NOSTR_RELAYS } from "@/constants/projections";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { sha256 } from "@noble/hashes/sha256";
import { Input, Button } from "@/components/ui";
import { GeoRelayDirectory } from "@/utils/geoRelayDirectory";
import { globalStyles } from "@/styles";
import { CommandSuggestions } from "./CommandSuggestions";
import { processCommandMessage, parseRollCommand, type UserInfo, type RollRange } from "@/utils/commands";

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


interface UserMeta {
  pubkey: string;
  displayName: string;
  hasMessages: boolean;
  eventKind: number;
  lastSeen: number;
  messageCount: number;
  isPinned: boolean;
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
  onPowSettingsChange?: (enabled: boolean, difficulty: number) => void;
  users?: UserMeta[]; // Users for command suggestions
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
  onPowSettingsChange,
  users = [],
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isMiningPow, setIsMiningPow] = useState(false);
  const [error, setError] = useState("");
  const [eventTemplateForPow, setEventTemplateForPow] = useState<EventTemplate | null>(null);
  const [localPowEnabled, setLocalPowEnabled] = useState(powEnabled);
  const [localPowDifficulty, setLocalPowDifficulty] = useState(powDifficulty);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const lastPrefillRef = useRef<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const powWorkerRef = useRef<Worker | null>(null);
  const syncingFromProps = useRef(false);
  const powSettingsChangeRef = useRef(onPowSettingsChange);

  // Keep a ref to the latest onPowSettingsChange handler
  useEffect(() => {
    powSettingsChangeRef.current = onPowSettingsChange;
  }, [onPowSettingsChange]);

  // Sync local PoW settings with props
  useEffect(() => {
    syncingFromProps.current = true;
    setLocalPowEnabled(powEnabled);
    setLocalPowDifficulty(powDifficulty);
  }, [powEnabled, powDifficulty]);

  // Update parent when local settings change from user interaction
  useEffect(() => {
    if (syncingFromProps.current) {
      syncingFromProps.current = false;
      return;
    }
    if (powSettingsChangeRef.current) {
      powSettingsChangeRef.current(localPowEnabled, localPowDifficulty);
    }
  }, [localPowEnabled, localPowDifficulty]);

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
      new URL('@/workers/powWorker.js', import.meta.url),
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
          handlePowStopped();
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

  const handlePowStopped = () => {
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
      // Process the message for commands first
      const currentUser: UserInfo = {
        username: savedProfile?.username || "Anonymous",
        publicKey: savedProfile?.publicKey || "0000"
      };
      const commandResult = processCommandMessage(message, currentUser);
      const processedContent = commandResult.message;
      
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
        content: processedContent,
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
    const rollRange = parseRollCommand(eventToUse.content);
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
          
          console.error("❌ Failed to publish to any relay. Errors:", errors);
          setError(`Failed to publish message to any relay: ${errors.join(', ')}`);
        } else {
          // Log any failed relays for debugging (but don't throw)
          const failed = results.filter(result => result.status === 'rejected');
          if (failed.length > 0) {
            console.warn(`⚠️ Some relays failed (${failed.length}/${results.length}):`, 
              failed.map(result => result.reason?.message || 'Unknown error'));
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
              console.warn("⚠️ textareaRef.current is null");
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
      ["n", "bitchat.land"],
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
      // Process the message for commands first
      const currentUser: UserInfo = {
        username: savedProfile.username,
        publicKey: savedProfile.publicKey
      };
      const commandResult = processCommandMessage(message, currentUser);
      const processedContent = commandResult.message;
      parseRollCommand(processedContent);
  
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
        content: processedContent,
        tags: tags,
      };


      // Apply proof of work if enabled
      if (localPowEnabled && localPowDifficulty > 0) {
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
              difficulty: localPowDifficulty
            }
          });
          
          // Store the event template for later use
          setEventTemplateForPow(eventTemplate);
          return; // Exit early, worker will handle the rest
        } else {
          console.warn("⚠️ POW worker not available, continuing without POW");
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
    // Handle suggestion navigation first
    if (showSuggestions) {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Tab':
        case 'Escape':
          e.preventDefault();
          // Let the CommandSuggestions component handle these
          return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    
    // Quick PoW enable/disable with Ctrl+P (or Cmd+P on Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      if (localPowEnabled) {
        setLocalPowEnabled(false);
        setLocalPowDifficulty(0);
      } else {
        setLocalPowEnabled(true);
        setLocalPowDifficulty(Math.max(1, localPowDifficulty));
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPos = e.target.selectionStart;
    
    setMessage(newValue);
    setCursorPosition(newCursorPos);
    
    // Show suggestions if we're typing a command
    const textBeforeCursor = newValue.substring(0, newCursorPos);
    const hasSlash = textBeforeCursor.includes('/') && textBeforeCursor.match(/\/(\w*)$/);
    const hasCommandWithSpace = textBeforeCursor.match(/\/(\w+)\s+(\w*)$/);
    
    // Always show suggestions if we have a slash or command with space
    setShowSuggestions(!!(hasSlash || hasCommandWithSpace));
  };

  const handleSuggestionSelect = (suggestion: { type: 'command' | 'user'; value: string; displayText: string }) => {
    const textBeforeCursor = message.substring(0, cursorPosition);
    
    if (suggestion.type === 'command') {
      // Replace the partial command with the full command
      const slashMatch = textBeforeCursor.match(/\/(\w*)$/);
      if (slashMatch) {
        const newText = textBeforeCursor.replace(slashMatch[0], suggestion.value) + ' ';
        const newMessage = message.substring(0, cursorPosition).replace(slashMatch[0], suggestion.value) + ' ' + message.substring(cursorPosition);
        setMessage(newMessage);
        setCursorPosition(newText.length);
        
        // Check if this command needs user suggestions
        const commandName = suggestion.value.replace('/', '');
        const needsUser = ['slap', 'hug', 'send'].includes(commandName);
        
        if (needsUser) {
          // Keep suggestions open for user selection
          setShowSuggestions(true);
        } else {
          // Close suggestions for commands that don't need users
          setShowSuggestions(false);
        }
        
        // Focus the textarea and set cursor position
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newText.length, newText.length);
          }
        }, 0);
      }
    } else if (suggestion.type === 'user') {
      // Replace the partial username with the full username
      const commandWithSpaceMatch = textBeforeCursor.match(/\/(\w+)\s+(\w*)$/);
      if (commandWithSpaceMatch) {
        const [, command] = commandWithSpaceMatch;
        // Replace the entire command + space + partial user with command + space + full user
        const newText = textBeforeCursor.replace(/\/(\w+)\s+(\w*)$/, `/${command} ${suggestion.value} `);
        const newMessage = message.substring(0, cursorPosition).replace(/\/(\w+)\s+(\w*)$/, `/${command} ${suggestion.value} `) + message.substring(cursorPosition);
        setMessage(newMessage);
        setCursorPosition(newText.length);
        
        // Focus the textarea and set cursor position
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newText.length, newText.length);
          }
        }, 0);
      }
      
      // Close suggestions after user selection
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClose = () => {
    setShowSuggestions(false);
  };

  const handleSelectedIndexChange = useCallback((index: number) => {
    setSelectedSuggestionIndex(index);
  }, []);


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
        <Button 
          theme={theme}
          onClick={onOpenProfileModal} 
          className={t.noProfileButton}
        >
          🔐 Create Profile to Start Chatting
        </Button>
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
        {localPowEnabled && localPowDifficulty > 0 && (
          <span className="ml-2 text-xs text-gray-400">
            ⛏️ POW {localPowDifficulty}
          </span>
        )}
      </div>

      {/* Quick PoW Controls */}
      <div className="flex items-center gap-2 mb-2">
        {/* Main PoW Button - shows current difficulty and toggles on/off */}
        <button
          onClick={() => {
            if (localPowEnabled) {
              setLocalPowEnabled(false);
              setLocalPowDifficulty(0);
            } else {
              setLocalPowEnabled(true);
              setLocalPowDifficulty(Math.max(1, localPowDifficulty));
            }
          }}
          className={`px-3 py-1 text-xs rounded transition-colors font-mono ${
            localPowEnabled
              ? theme === "matrix"
                ? "bg-green-800 text-green-300 border border-green-600 hover:bg-green-700 hover:shadow-[0_0_4px_rgba(0,255,0,0.3)]"
                : "bg-green-600 text-white border border-green-600 hover:bg-green-700 hover:shadow-sm"
              : theme === "matrix"
                ? "bg-gray-800 text-gray-400 border border-gray-600 hover:bg-gray-700 hover:shadow-[0_0_4px_rgba(0,255,0,0.3)]"
                : "bg-gray-200 text-gray-600 border border-gray-400 hover:bg-gray-300 hover:shadow-sm"
          }`}
          title={localPowEnabled ? "Click to disable PoW" : "Click to enable PoW"}
        >
          ⛏️ PoW {localPowDifficulty}
        </button>
        
        {/* Difficulty Controls - always visible when PoW is enabled */}
        {localPowEnabled && (
          <div className="flex items-center gap-1 animate-in slide-in-from-left-2 duration-200">
            <button
              onClick={() => {
                const newDifficulty = localPowDifficulty - 1;
                if (newDifficulty <= 0) {
                  setLocalPowEnabled(false);
                  setLocalPowDifficulty(0);
                } else {
                  setLocalPowDifficulty(newDifficulty);
                }
              }}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                theme === "matrix"
                  ? "bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700 hover:shadow-[0_0_4px_rgba(0,255,0,0.3)]"
                  : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 hover:shadow-sm"
              }`}
              title="Decrease difficulty (0 = disable)"
            >
              -
            </button>
            
            <button
              onClick={() => setLocalPowDifficulty(Math.min(24, localPowDifficulty + 1))}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                localPowDifficulty >= 24
                  ? theme === "matrix"
                    ? "bg-gray-900 text-gray-500 border border-gray-700 cursor-not-allowed"
                    : "bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
                  : theme === "matrix"
                    ? "bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700 hover:shadow-[0_0_4px_rgba(0,255,0,0.3)]"
                    : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 hover:shadow-sm"
              }`}
              title="Increase difficulty"
              disabled={localPowDifficulty >= 24}
            >
              +
            </button>
            
            {/* Difficulty Info */}
            <span className={`text-xs ${
              theme === "matrix" ? "text-gray-400" : "text-gray-500"
            }`} title={`~${Math.pow(2, localPowDifficulty - 8) < 1 ? '< 1' : Math.pow(2, localPowDifficulty - 8)} second${Math.pow(2, localPowDifficulty - 8) === 1 ? '' : 's'} mining time`}>
              ({Math.pow(2, localPowDifficulty - 8) < 1 ? '< 1' : Math.pow(2, localPowDifficulty - 8)}s)
            </span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && <div className={t.error}>{error}</div>}

      <div className="flex gap-2 items-stretch">
        <div className={t.inputWrapper}>
          <div className="relative overflow-visible">
            {showSuggestions && (
              <CommandSuggestions
                inputValue={message}
                cursorPosition={cursorPosition}
                users={users}
                theme={theme}
                onSuggestionSelect={handleSuggestionSelect}
                onClose={handleSuggestionClose}
                selectedIndex={selectedSuggestionIndex}
                onSelectedIndexChange={handleSelectedIndexChange}
              />
            )}
            <Input
              ref={textareaRef}
              as="textarea"
              value={message}
              onChange={handleInputChange}
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
          </div>
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
        {localPowEnabled && localPowDifficulty > 0 && (
          <span className="ml-2 text-xs text-gray-400">
            • POW: {localPowDifficulty} bits
          </span>
        )}
        <span className="ml-2 text-xs text-gray-400">
          • Ctrl+P: Toggle PoW
        </span>
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