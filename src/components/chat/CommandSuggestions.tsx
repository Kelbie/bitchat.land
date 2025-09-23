import { useState, useEffect, useRef } from "react";
import { globalStyles } from "../../styles";
import { AVAILABLE_COMMANDS } from "../../utils/commands";

interface UserMeta {
  pubkey: string;
  displayName: string;
  hasMessages: boolean;
  eventKind: number;
  lastSeen: number;
  messageCount: number;
  isPinned: boolean;
}

interface CommandSuggestion {
  type: 'command' | 'user';
  value: string;
  displayText: string;
  description?: string;
  user?: UserMeta;
}

interface CommandSuggestionsProps {
  inputValue: string;
  cursorPosition: number;
  users: UserMeta[];
  theme: "matrix" | "material";
  onSuggestionSelect: (suggestion: CommandSuggestion) => void;
  onClose: () => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
}


export function CommandSuggestions({
  inputValue,
  cursorPosition,
  users,
  theme,
  onSuggestionSelect,
  onClose,
  selectedIndex,
  onSelectedIndexChange
}: CommandSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const styles = globalStyles["CommandSuggestions"] || {};

  // Parse the current input to determine what we're suggesting for
  const parseInput = (value: string, cursor: number) => {
    const textBeforeCursor = value.substring(0, cursor);
    const slashMatch = textBeforeCursor.match(/\/(\w*)$/);
    
    if (slashMatch) {
      const partialCommand = slashMatch[1];
      return {
        type: 'command' as const,
        partial: partialCommand,
        fullMatch: slashMatch[0]
      };
    }

    // Check if we're in a command that expects a user parameter
    const commandWithSpaceMatch = textBeforeCursor.match(/\/(\w+)\s+(\w*)$/);
    if (commandWithSpaceMatch) {
      const [, command, partialUser] = commandWithSpaceMatch;
      const needsUser = ['slap', 'hug', 'send'].includes(command);
      
      if (needsUser) {
        return {
          type: 'user' as const,
          command,
          partial: partialUser,
          fullMatch: commandWithSpaceMatch[0]
        };
      }
    }

    return null;
  };

  // Generate suggestions based on current input
  useEffect(() => {
    const parsed = parseInput(inputValue, cursorPosition);
    
    if (!parsed) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    let newSuggestions: CommandSuggestion[] = [];

    if (parsed.type === 'command') {
      // Suggest commands that match the partial input
      const matchingCommands = AVAILABLE_COMMANDS.filter(cmd =>
        cmd.name.toLowerCase().startsWith(parsed.partial.toLowerCase())
      );

      newSuggestions = matchingCommands.map(cmd => ({
        type: 'command' as const,
        value: `/${cmd.name}`,
        displayText: `/${cmd.name}`,
        description: cmd.description
      }));
    } else if (parsed.type === 'user') {
      // Suggest users that match the partial input
      const matchingUsers = users.filter(user => {
        const displayName = user.displayName.toLowerCase();
        const pubkeySuffix = user.pubkey.slice(-4);
        const searchTerm = parsed.partial.toLowerCase();
        
        return displayName.includes(searchTerm) || 
               pubkeySuffix.includes(searchTerm) ||
               `${displayName}#${pubkeySuffix}`.includes(searchTerm);
      });

      newSuggestions = matchingUsers.map(user => ({
        type: 'user' as const,
        value: `@${user.displayName}#${user.pubkey.slice(-4)}`,
        displayText: `${user.displayName}#${user.pubkey.slice(-4)}`,
        user
      }));
    }

    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
    onSelectedIndexChange(0);
  }, [inputValue, cursorPosition, users, onSelectedIndexChange]);

  // Clamp selected index to valid range
  const clampedSelectedIndex = Math.min(selectedIndex, Math.max(0, suggestions.length - 1));

  // Handle keyboard events globally when suggestions are shown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          onSelectedIndexChange((clampedSelectedIndex + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          onSelectedIndexChange(clampedSelectedIndex === 0 ? suggestions.length - 1 : clampedSelectedIndex - 1);
          break;
        case 'Tab':
          e.preventDefault();
          if (suggestions[clampedSelectedIndex]) {
            onSuggestionSelect(suggestions[clampedSelectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestions, suggestions, clampedSelectedIndex, onSelectedIndexChange, onSuggestionSelect, onClose]);


  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: CommandSuggestion) => {
    onSuggestionSelect(suggestion);
  };

  if (!showSuggestions || suggestions.length === 0) {
    return null;
  }

  const t = styles[theme] || {};

  return (
    <div
      ref={suggestionsRef}
      className={`${t.container} absolute z-[9999]`}
      style={{
        bottom: '100%',
        left: '0',
        right: '0',
        marginBottom: '8px'
      }}
      tabIndex={-1}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.type}-${suggestion.value}-${index}`}
          className={`${t.suggestionItem} ${
            index === clampedSelectedIndex ? t.selectedItem : ''
          }`}
          onClick={() => handleSuggestionClick(suggestion)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {suggestion.type === 'command' && (
                <span className={t.commandPrefix}>/</span>
              )}
              {suggestion.type === 'user' && (
                <span className={t.userPrefix}>@</span>
              )}
              <span className="font-medium">{suggestion.displayText}</span>
            </div>
            {suggestion.description && (
              <span className={t.description}>
                {suggestion.description}
              </span>
            )}
          </div>
          {suggestion.user && (
            <div className={t.userInfo}>
              {suggestion.user.messageCount} messages • Last seen {formatLastSeen(suggestion.user.lastSeen)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatLastSeen(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
