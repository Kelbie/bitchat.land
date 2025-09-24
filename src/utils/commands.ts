export interface UserInfo {
  username: string;
  publicKey: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
  isAction: boolean;
}

export interface RollRange {
  min: number;
  max: number;
}

// Available commands configuration
export const AVAILABLE_COMMANDS = [
  {
    name: 'slap',
    description: 'Slap someone with a trout',
    usage: '/slap <username>',
    example: '/slap @alex#1234'
  },
  {
    name: 'hug',
    description: 'Give someone a warm hug',
    usage: '/hug <username>',
    example: '/hug @alex#1234'
  },
  {
    name: 'roll',
    description: 'Roll dice (1-10 by default)',
    usage: '/roll [min-max]',
    example: '/roll 1-20'
  }
];

// Self-slap messages
const SELF_SLAP_MESSAGES = [
  `* 🐟 {senderName}#{senderHash} slapped themselves in the face with a large trout *`,
  `* 🐟 {senderName}#{senderHash} hits themselves with the trout and immediately regrets it *`,
  `* 🐟 {senderName}#{senderHash} slaps themselves so hard they see stars and fish *`,
  `* 🐟 {senderName}#{senderHash} attempts a self-slap but the trout has other ideas *`,
  `* 🐟 {senderName}#{senderHash} slaps themselves and wonders why they keep doing this *`
];

// Self-hug messages
const SELF_HUG_MESSAGES = [
  `* 🫂 {senderName}#{senderHash} gives themselves a big self-hug and feels a bit lonely *`,
  `* 🫂 {senderName}#{senderHash} wraps their arms around themselves and wonders if this is normal *`,
  `* 🫂 {senderName}#{senderHash} self-hugs so hard they almost fall over *`,
  `* 🫂 {senderName}#{senderHash} gives themselves a comforting hug and whispers "it's okay" *`,
  `* 🫂 {senderName}#{senderHash} attempts a self-hug but realizes they're not very flexible *`
];

// Parse roll command
export function parseRollCommand(input: string): RollRange | null {
  const match = input.trim().match(/^\/roll(?:\s+(\d+)(?:-(\d+))?)?$/i);
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

// Generate random self-action message
function getRandomSelfMessage(messages: string[], senderName: string, senderHash: string): string {
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex]
    .replace('{senderName}', senderName)
    .replace('{senderHash}', senderHash);
}

// Check if user is targeting themselves
function isSelfTarget(username: string, hash: string, currentUser: UserInfo): boolean {
  return username.toLowerCase() === currentUser.username.toLowerCase() &&
    (hash === '' || hash === currentUser.publicKey.slice(-4));
}

// Process slap command
export function processSlapCommand(targetUsername: string, targetHash: string, currentUser: UserInfo): CommandResult {
  const fullTarget = targetHash ? `${targetUsername}#${targetHash}` : targetUsername;
  const isSelf = isSelfTarget(targetUsername, targetHash, currentUser);

  if (isSelf) {
    const message = getRandomSelfMessage(SELF_SLAP_MESSAGES, currentUser.username, currentUser.publicKey.slice(-4));
    return { success: true, message, isAction: true };
  } else {
    const message = `* 🐟 ${currentUser.username}#${currentUser.publicKey.slice(-4)} slaps @${fullTarget} around a bit with a large trout *`;
    return { success: true, message, isAction: true };
  }
}

// Process hug command
export function processHugCommand(targetUsername: string, targetHash: string, currentUser: UserInfo): CommandResult {
  const fullTarget = targetHash ? `${targetUsername}#${targetHash}` : targetUsername;
  const isSelf = isSelfTarget(targetUsername, targetHash, currentUser);

  if (isSelf) {
    const message = getRandomSelfMessage(SELF_HUG_MESSAGES, currentUser.username, currentUser.publicKey.slice(-4));
    return { success: true, message, isAction: true };
  } else {
    const message = `* 🫂 ${currentUser.username}#${currentUser.publicKey.slice(-4)} gives @${fullTarget} a warm, comforting hug *`;
    return { success: true, message, isAction: true };
  }
}

// Process send command
export function processSendCommand(targetUsername: string, targetHash: string, messageText: string, currentUser: UserInfo): CommandResult {
  const fullTarget = targetHash ? `${targetUsername}#${targetHash}` : targetUsername;
  const message = `* ${currentUser.username}#${currentUser.publicKey.slice(-4)} whispers to @${fullTarget}: "${messageText}" *`;
  return { success: true, message, isAction: true };
}

// Process roll command (returns the original message since roll is handled separately)
export function processRollCommand(input: string): CommandResult {
  return { success: true, message: input.trim(), isAction: false };
}

// Main command processor - converts command strings to action messages
export function processCommandMessage(message: string, currentUser: UserInfo): CommandResult {
  const trimmedMessage = message.trim();

  // Check for slap command
  const slapMatch = trimmedMessage.match(/^\/slap\s+@?([^#\s]+)#?([0-9a-f]*)$/i);
  if (slapMatch) {
    const [, username, hash] = slapMatch;
    return processSlapCommand(username, hash, currentUser);
  }

  // Check for hug command
  const hugMatch = trimmedMessage.match(/^\/hug\s+@?([^#\s]+)#?([0-9a-f]*)$/i);
  if (hugMatch) {
    const [, username, hash] = hugMatch;
    return processHugCommand(username, hash, currentUser);
  }

  // Check for send command
  const sendMatch = trimmedMessage.match(/^\/send\s+@?([^#\s]+)#?([0-9a-f]*)\s+(.+)$/i);
  if (sendMatch) {
    const [, username, hash, messageText] = sendMatch;
    return processSendCommand(username, hash, messageText, currentUser);
  }

  // Check for roll command
  const rollMatch = trimmedMessage.match(/^\/roll(?:\s+(\d+)(?:-(\d+))?)?$/i);
  if (rollMatch) {
    return processRollCommand(trimmedMessage);
  }

  // If no command matched, return the original message
  return { success: true, message: trimmedMessage, isAction: false };
}

// Generate action message for button clicks (used by RecentEvents.tsx)
export function generateActionMessage(
  action: 'slap' | 'hug',
  targetUsername: string,
  targetHash: string,
  currentUser: UserInfo
): string {
  if (action === 'slap') {
    const result = processSlapCommand(targetUsername, targetHash, currentUser);
    return result.message;
  } else if (action === 'hug') {
    const result = processHugCommand(targetUsername, targetHash, currentUser);
    return result.message;
  }

  return '';
}

// Check if a message is a system message (starts with "* " followed by specific emojis)
export function isActionMessage(content: string): boolean {
  return /^\* (🫂|🐟|👋)/.test(content);
}
