import React from 'react';

// URL regex pattern to detect various types of links
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Renders text with clickable links while keeping everything else as plain text
 * @param text - The text content to process
 * @returns Array of text and link elements
 */
export function renderTextWithLinks(text: string): (string | JSX.Element)[] {
  if (!text) return [];
  
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  
  // Reset regex state
  URL_REGEX.lastIndex = 0;
  
  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    const matchIndex = match.index;
    
    // Add text before the URL
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }
    
    // Add clickable link
    parts.push(
      <a
        key={`link-${matchIndex}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#00ff00',
          textDecoration: 'underline',
          cursor: 'pointer',
          wordBreak: 'break-all',
        }}
        onClick={(e) => {
          e.stopPropagation();
          window.open(url, '_blank', 'noopener,noreferrer');
        }}
      >
        {url}
      </a>
    );
    
    lastIndex = matchIndex + url.length;
  }
  
  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts;
}
