// Import the official Cashu library
import { getDecodedToken } from '@cashu/cashu-ts';

// Helper function to decode Cashu tokens using the official library
function decodeCashuToken(token: string): Record<string, unknown> | null {
  try {
    const decodedToken = getDecodedToken(token);
    console.log('Decoded Cashu token using official library:', decodedToken);
    return decodedToken as Record<string, unknown>;
  } catch (error) {
    console.warn('Failed to decode Cashu token with official library:', error);
    return null;
  }
}

// Helper functions for Cashu token parsing
function getProofCount(decodedData: Record<string, unknown> | null): number {
  if (!decodedData) return 0;
  
  // The official library should return { proofs: [...] } directly
  const proofs = decodedData.proofs as Array<unknown>;
  return Array.isArray(proofs) ? proofs.length : 0;
}

function getTotalAmount(decodedData: Record<string, unknown> | null): number {
  if (!decodedData) return 0;
  
  // The official library should return { proofs: [...] } directly
  const proofs = decodedData.proofs as Array<{ amount?: number }>;
  
  if (!Array.isArray(proofs)) {
    return 0;
  }
  
  return proofs.reduce((sum, proof) => sum + (proof?.amount || 0), 0);
}

function getMint(decodedData: Record<string, unknown> | null): string {
  if (!decodedData) {
    return 'Unknown mint';
  }
  
  // The official library should return { mint: "..." } directly
  const mint = decodedData.mint as string;
  return typeof mint === 'string' ? mint : 'Unknown mint';
}

// Base interfaces for content parsing system
export interface ContentMatch {
  type: string;
  content: string;
  start: number;
  end: number;
  data?: Record<string, unknown>;
}

export interface ContentParser {
  type: string;
  regex: RegExp;
  validate?: (match: string) => boolean;
  process?: (match: string) => Record<string, unknown>;
}

// Content parsers - easily extensible
export const IMAGE_PARSER: ContentParser = {
  type: 'image',
  regex: /https?:\/\/[^\s]+\.(?:png|jpe?g|gif|bmp|webp|svg)/gi,
  validate: (url: string) => {
    try {
      new URL(url);
      return url.length <= 2048;
    } catch {
      return false;
    }
  }
};

export const CASHU_PARSER: ContentParser = {
  type: 'cashu',
  regex: /(?:web\+cashu:\/\/|cashu:\/\/|cashu:)?cashu[AB][A-Za-z0-9+/=_-]+/gi,
  validate: (token: string) => {
    try {
      // Remove URI prefixes
      const cleanToken = token.replace(/^(?:web\+cashu:\/\/|cashu:\/\/|cashu:)/, '');
      
      // Check if it starts with cashuA or cashuB
      if (!cleanToken.startsWith('cashuA') && !cleanToken.startsWith('cashuB')) {
        return false;
      }
      
      // Basic length check
      return cleanToken.length > 10 && cleanToken.length < 10000;
    } catch {
      return false;
    }
  },
  process: (token: string) => {
    try {
      // Remove URI prefixes
      const cleanToken = token.replace(/^(?:web\+cashu:\/\/|cashu:\/\/|cashu:)/, '');
      const version = cleanToken.startsWith('cashuA') ? 'v3' : 'v4';
      const encoded = cleanToken.slice(6); // Remove 'cashuA' or 'cashuB'
      
      // Use the official Cashu library to decode the token
      let decodedData: Record<string, unknown> | null = null;
      try {
        decodedData = decodeCashuToken(token);
      } catch (error) {
        console.warn('Failed to decode Cashu token:', error);
        // If we can't decode, we'll still show the token but with limited info
      }
      
      return {
        version,
        fullToken: token,
        cleanToken,
        decodedData,
        mint: getMint(decodedData),
        unit: (decodedData?.unit as string) || 'sat',
        memo: decodedData?.memo as string,
        proofCount: getProofCount(decodedData),
        totalAmount: getTotalAmount(decodedData)
      };
    } catch {
      return {
        version: 'unknown',
        fullToken: token,
        cleanToken: token,
        decodedData: null,
        mint: 'Unknown mint',
        unit: 'sat',
        memo: null,
        proofCount: 0,
        totalAmount: 0
      };
    }
  }
};

export const LINK_PARSER: ContentParser = {
  type: 'link',
  regex: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi,
  validate: (url: string) => {
    try {
      const urlObj = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      
      // Basic length check
      if (url.length > 2048) {
        return false;
      }
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /file:/i,
        /about:/i,
        /chrome:/i,
        /moz-extension:/i,
        /chrome-extension:/i
      ];
      
      return !suspiciousPatterns.some(pattern => pattern.test(url));
    } catch {
      return false;
    }
  },
  process: (url: string) => ({
    displayText: url.length > 100 ? url.substring(0, 97) + '...' : url,
    fullUrl: url
  })
};

// Registry of all parsers - add new ones here
export const CONTENT_PARSERS = [IMAGE_PARSER, CASHU_PARSER, LINK_PARSER];

/**
 * Parse content and extract all rich content matches
 */
export function parseContent(content: string): ContentMatch[] {
  const matches: ContentMatch[] = [];
  
  for (const parser of CONTENT_PARSERS) {
    // Reset regex state
    parser.regex.lastIndex = 0;
    
    let match;
    while ((match = parser.regex.exec(content)) !== null) {
      const matchedContent = match[0];
      
      // Validate if parser has validation
      if (parser.validate && !parser.validate(matchedContent)) {
        continue;
      }
      
      // Process additional data if parser has processing
      const data = parser.process ? parser.process(matchedContent) : undefined;
      
      matches.push({
        type: parser.type,
        content: matchedContent,
        start: match.index,
        end: match.index + matchedContent.length,
        data
      });
    }
  }
  
  // Sort matches by position to handle overlaps correctly
  return matches.sort((a, b) => a.start - b.start);
}

/**
 * Remove overlapping matches, with priority: images > cashu > links
 */
export function removeOverlaps(matches: ContentMatch[]): ContentMatch[] {
  const result: ContentMatch[] = [];
  
  // Define priority order (higher number = higher priority)
  const getPriority = (type: string): number => {
    switch (type) {
      case 'image': return 3;
      case 'cashu': return 2;
      case 'link': return 1;
      default: return 0;
    }
  };
  
  for (const match of matches) {
    const hasOverlap = result.some(existing => 
      (match.start >= existing.start && match.start < existing.end) ||
      (match.end > existing.start && match.end <= existing.end) ||
      (match.start <= existing.start && match.end >= existing.end)
    );
    
    if (!hasOverlap) {
      result.push(match);
    } else {
      // If there's an overlap, prefer higher priority types
      const overlappingIndex = result.findIndex(existing => 
        (match.start >= existing.start && match.start < existing.end) ||
        (match.end > existing.start && match.end <= existing.end) ||
        (match.start <= existing.start && match.end >= existing.end)
      );
      
      if (overlappingIndex !== -1) {
        const existingPriority = getPriority(result[overlappingIndex].type);
        const newPriority = getPriority(match.type);
        
        if (newPriority > existingPriority) {
          result[overlappingIndex] = match;
        }
      }
    }
  }
  
  return result.sort((a, b) => a.start - b.start);
}

// Legacy compatibility functions
export function hasImageUrl(text: string | null | undefined): boolean {
  if (!text) return false;
  return IMAGE_PARSER.regex.test(text);
}

export function extractImageUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  IMAGE_PARSER.regex.lastIndex = 0;
  const match = IMAGE_PARSER.regex.exec(text);
  return match ? match[0] : null;
}
