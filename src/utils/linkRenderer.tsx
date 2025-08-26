import React from 'react';

// More inclusive URL regex that handles YouTube URLs and other common patterns
// Test cases this should match:
// - https://www.youtube.com/watch?v=dQw4w9WgXcQ
// - https://youtu.be/dQw4w9WgXcQ
// - https://www.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ
// - https://www.youtube.com/user/username
// - https://example.com/path-with-hyphens
// - https://sub-domain.example.com/path/to/page
// eslint-disable-next-line no-useless-escape
const URL_REGEX = /https?:\/\/(?:[-\w.])+(?:[:\d]+)?(?:\/(?:[\w\/_.-])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?/gi;
// Separate regex patterns for hashtags and mentions
const HASHTAG_PATTERN = '#[0-9A-Za-z]+';
const MENTION_PATTERN = '@[A-Za-z0-9_]+#[0-9a-f]{4}';

// Regexes used for classification
const HASHTAG_REGEX = new RegExp(`^${HASHTAG_PATTERN}$`);
const MENTION_REGEX = new RegExp(`^${MENTION_PATTERN}$`);

// Combined regex to detect URLs, hashtags and mentions
const TOKEN_REGEX = new RegExp(
  `${URL_REGEX.source}|${MENTION_PATTERN}|${HASHTAG_PATTERN}`,
  'gi'
);

/**
 * Validates if a string is a safe URL
 * @param url - The URL string to validate
 * @returns boolean indicating if the URL is safe
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // Basic length check to prevent extremely long URLs
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
    
    if (suspiciousPatterns.some(pattern => pattern.test(url))) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes URL text for display
 * @param url - The URL to sanitize
 * @returns Sanitized URL text
 */
function sanitizeUrlText(url: string): string {
  // Truncate very long URLs for display
  if (url.length > 100) {
    return url.substring(0, 97) + '...';
  }
  return url;
}

/**
 * Renders text with clickable links while keeping everything else as plain text
 * @param text - The text content to process
 * @returns Array of text and link elements
 */
export function renderTextWithLinks(
  text: string,
  onSearch?: (value: string) => void
): (string | JSX.Element)[] {
  if (!text || typeof text !== 'string') return [];

  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  TOKEN_REGEX.lastIndex = 0;
  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    const token = match[0];
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    if (token.startsWith('http')) {
      if (isValidUrl(token)) {
        const sanitizedUrl = sanitizeUrlText(token);
        parts.push(
          <a
            key={`link-${matchIndex}`}
            href={token}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#00ff00',
              textDecoration: 'underline',
              cursor: 'pointer',
              wordBreak: 'break-all',
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              if (isValidUrl(token)) {
                try {
                  window.open(token, '_blank', 'noopener,noreferrer');
                } catch (error) {
                  console.warn('Failed to open URL:', error);
                }
              }
            }}
            onMouseEnter={(e) => {
              if (token.length > 100) {
                e.currentTarget.title = token;
              }
            }}
          >
            {sanitizedUrl}
          </a>
        );
      } else {
        parts.push(token);
      }
    } else if (HASHTAG_REGEX.test(token)) {
      const tag = token.slice(1);
      parts.push(
        <button
          key={`hash-${matchIndex}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSearch?.(`in:${tag.toLowerCase()}`);
          }}
          style={{
            background: 'transparent',
            border: '1px solid #00ff00',
            borderRadius: '4px',
            color: '#00ff00',
            padding: '0 2px',
            cursor: 'pointer',
          }}
        >
          {token}
        </button>
      );
    } else if (MENTION_REGEX.test(token)) {
      parts.push(
        <span
          key={`mention-${matchIndex}`}
          style={{
            backgroundColor: '#333',
            color: '#fff',
            borderRadius: '4px',
            padding: '0 2px',
            display: 'inline-block',
          }}
        >
          {token}
        </span>
      );
    } else {
      parts.push(token);
    }

    lastIndex = matchIndex + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Test function to verify URL regex matching (for development/debugging)
 * This can be removed in production
 */
export function testUrlRegex() {
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ',
    'https://www.youtube.com/user/username',
    'https://example.com/path-with-hyphens',
    'https://sub-domain.example.com/path/to/page',
    'http://localhost:3000',
    'https://api.github.com/users/username',
    'https://stackoverflow.com/questions/12345/how-to-do-something',
    'https://medium.com/@username/article-title-with-hyphens'
  ];
  
  console.log('Testing URL regex patterns:');
  testUrls.forEach(url => {
    const matches = url.match(URL_REGEX);
    console.log(`${url}: ${matches ? '✅ MATCHES' : '❌ NO MATCH'}`);
  });
}
