import React from 'react';
import { globalStyles } from '../styles';


const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

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

const styles = globalStyles["LinkRenderer"];

/**
 * Renders text with clickable links while keeping everything else as plain text
 * @param text - The text content to process
 * @param theme - Active theme for styling
 * @returns Array of text and link elements
 */
export function renderTextWithLinks(
  text: string,
  theme: "matrix" | "material" = "matrix"
): (string | JSX.Element)[] {
  if (!text || typeof text !== "string") return [];
  
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
    
    // Only render as link if URL is valid and safe
    if (isValidUrl(url)) {
      const sanitizedUrl = sanitizeUrlText(url);
      
      parts.push(
        <a
          key={`link-${matchIndex}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles[theme]}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Additional security check before opening
            if (isValidUrl(url)) {
              try {
                window.open(url, '_blank', 'noopener,noreferrer');
              } catch (error) {
                console.warn('Failed to open URL:', error);
              }
            }
          }}
          onMouseEnter={(e) => {
            // Show full URL in tooltip for truncated URLs
            if (url.length > 100) {
              e.currentTarget.title = url;
            }
          }}
        >
          {sanitizedUrl}
        </a>
      );
    } else {
      // If URL is not safe, just render as plain text
      parts.push(url);
    }
    
    lastIndex = matchIndex + url.length;
  }
  
  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts;
}