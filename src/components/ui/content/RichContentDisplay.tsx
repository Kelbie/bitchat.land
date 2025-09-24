import React from 'react';
import { Image } from './Image';
import { CashuToken } from '@/components/features/wallet';
import { globalStyles } from '@/styles';
import { parseContent, removeOverlaps, type ContentMatch } from '@/utils/contentParsers';

interface RichContentProps {
  content: string;
  theme: "matrix" | "material";
  className?: string;
}

/**
 * Render a content match as a React element
 */
function renderContentMatch(match: ContentMatch, theme: "matrix" | "material", index: number): React.ReactNode {
  const styles = globalStyles["LinkRenderer"];
  
  switch (match.type) {
    case 'image':
      return (
        <div key={`image-${index}`} className="block my-2">
          <Image
            src={match.content}
            alt=""
            theme={theme}
            showControls={true}
            maxWidth="200px"
            maxHeight="200px"
            className="max-w-[200px] h-auto rounded-lg shadow-sm"
            tags={[]}
            showTags={false}
          />
        </div>
      );
      
    case 'cashu':
      return (
        <div key={`cashu-${index}`} className="block my-2">
          <CashuToken
            data={match.data as {
              version: string;
              fullToken: string;
              cleanToken: string;
              mint: string;
              unit: string;
              memo?: string;
              proofCount: number;
              totalAmount: number;
              decodedData?: Record<string, unknown> | null;
            }}
            theme={theme}
          />
        </div>
      );
      
    case 'link': {
      const data = match.data as { displayText: string; fullUrl: string } | undefined;
      const { displayText, fullUrl } = data || { displayText: match.content, fullUrl: match.content };
      return (
        <a
          key={`link-${index}`}
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles[theme]}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
              window.open(fullUrl, '_blank', 'noopener,noreferrer');
            } catch (error) {
              console.warn('Failed to open URL:', error);
            }
          }}
          onMouseEnter={(e) => {
            if (fullUrl.length > 100) {
              e.currentTarget.title = fullUrl;
            }
          }}
        >
          {displayText}
        </a>
      );
    }
      
    default:
      return match.content;
  }
}

/**
 * RichContentDisplay - A clean, extensible component for rendering rich content
 */
export function RichContentDisplay({ content, theme, className = "" }: RichContentProps) {
  if (!content || typeof content !== "string") {
    return <span className={className}>[No content]</span>;
  }
  
  // Parse and clean up matches
  const allMatches = parseContent(content);
  const cleanMatches = removeOverlaps(allMatches);
  
  // If no rich content found, return plain text
  if (cleanMatches.length === 0) {
    return <span className={className}>{content}</span>;
  }
  
  // Build the rich content elements
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  
  cleanMatches.forEach((match, index) => {
    // Add text before this match
    if (match.start > lastIndex) {
      const textBefore = content.slice(lastIndex, match.start);
      if (textBefore) {
        elements.push(textBefore);
      }
    }
    
    // Add the rich content element
    elements.push(renderContentMatch(match, theme, index));
    
    lastIndex = match.end;
  });
  
  // Add remaining text after the last match
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex);
    if (textAfter) {
      elements.push(textAfter);
    }
  }
  
  return <span className={className}>{elements}</span>;
}
