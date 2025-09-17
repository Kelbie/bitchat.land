import React, { useState, useEffect } from "react";

interface TwitterPost {
  type: string;
  content: string;
  quoted_text?: string;
  quoted_tweet?: {
    author?: string;
    content?: string;
  };
  media?: Array<{
    type: string;
    url?: string;
    alt?: string;
    suggestion?: string;
  }>;
  sources?: Array<{
    id: string;
    author: string;
    content: string;
    type: string;
    timestamp: string;
  }>;
  in_reply_to?: number;
}

interface Post {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  timestamp: string;
  content: string;
  quotedText?: string;
  media?: Array<{
    type: string;
    url?: string;
    alt?: string;
    suggestion?: string;
  }>;
  source_type?: string;
  sources?: Array<{
    id: string;
    author: string;
    content: string;
    type: string;
    timestamp: string;
  }>;
}

interface AdminPageProps {
  theme?: "matrix" | "material";
}

// Function to format timestamp
const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    return "now";
  } catch {
    return "now";
  }
};

// Function to convert TwitterPost to Post format
const convertTwitterPost = (twitterPost: TwitterPost, index: number, sourceType: string): Post => {
  const sourceInfo = twitterPost.sources?.[0];
  const avatar = sourceType === 'releases' ? '🚀' : 
                 twitterPost.type === 'tweet' ? '📢' : '💬';
  const quotedText = twitterPost.quoted_text
    || (twitterPost.quoted_tweet && twitterPost.quoted_tweet.content
        ? `${twitterPost.quoted_tweet.author ? twitterPost.quoted_tweet.author + ': ' : ''}${twitterPost.quoted_tweet.content}`
        : undefined);
  const isNitter = sourceType === 'nitter';
  const displayAuthor = isNitter ? 'BitchatLand' : (sourceInfo?.author || 'BitChat');
  const displayHandle = isNitter ? '@BitchatLand' : (sourceInfo?.author || '@bitchat');
  
  return {
    id: sourceInfo?.id || `${sourceType}_${index}`,
    author: displayAuthor,
    handle: displayHandle,
    avatar,
    timestamp: sourceInfo?.timestamp ? formatTimestamp(sourceInfo.timestamp) : "now",
    content: twitterPost.content,
    quotedText,
    media: twitterPost.media,
    source_type: sourceType,
    sources: twitterPost.sources
  };
};

export const AdminPage: React.FC<AdminPageProps> = ({ theme = "matrix" }) => {
  const [releasesData, setReleasesData] = useState<Post[]>([]);
  const [nitterData, setNitterData] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sourcesFor, setSourcesFor] = useState<Post | null>(null);

  // Function to organize posts in thread order
  const organizePostsInThreads = (posts: TwitterPost[]): TwitterPost[] => {
    const organized: TwitterPost[] = [];
    const processedIndexes = new Set<number>();
    
    posts.forEach((post, index) => {
      if (processedIndexes.has(index)) return;
      
      // If this is a main post (not a reply), add it and its replies
      if (post.in_reply_to === undefined) {
        organized.push(post);
        processedIndexes.add(index);
        
        // Find and add all replies to this post
        posts.forEach((replyPost, replyIndex) => {
          if (replyPost.in_reply_to === index && !processedIndexes.has(replyIndex)) {
            organized.push(replyPost);
            processedIndexes.add(replyIndex);
          }
        });
      }
    });
    
    // Add any remaining posts that weren't processed
    posts.forEach((post, index) => {
      if (!processedIndexes.has(index)) {
        organized.push(post);
      }
    });
    
    return organized;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load releases data
        const releasesResponse = await fetch('/releases.json');
        const releasesJson: TwitterPost[] = await releasesResponse.json();
        const organizedReleases = organizePostsInThreads(releasesJson);
        const convertedReleases = organizedReleases.map((post, index) => 
          convertTwitterPost(post, index, 'releases')
        );
        setReleasesData(convertedReleases);

        // Load nitter data
        const nitterResponse = await fetch('/nitter.json');
        const nitterJson: TwitterPost[] = await nitterResponse.json();
        const organizedNitter = organizePostsInThreads(nitterJson);
        const convertedNitter = organizedNitter.map((post, index) => 
          convertTwitterPost(post, index, 'nitter')
        );
        setNitterData(convertedNitter);

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const themeClasses = {
    background: theme === "matrix" ? "bg-black" : "bg-gray-50",
    text: theme === "matrix" ? "text-[#00ff00]" : "text-gray-900",
    cardBg: theme === "matrix" ? "bg-gray-900/50" : "bg-white",
    cardBorder: theme === "matrix" ? "border-[#00ff00]/30" : "border-gray-200",
    columnHeader: theme === "matrix" ? "bg-[#00ff00]/10 border-[#00ff00]/50" : "bg-blue-50 border-blue-200",
    scrollbar: theme === "matrix" ? "scrollbar-matrix" : "scrollbar-material"
  };

  if (loading) {
    return (
      <div className={`w-full h-full ${themeClasses.background} ${themeClasses.text} flex items-center justify-center`}>
        <div className="text-xl">Loading data...</div>
      </div>
    );
  }

  const PostCard: React.FC<{ post: Post }> = ({ post }) => (
    <div className={`${themeClasses.cardBg} border ${themeClasses.cardBorder} rounded-lg p-4 mb-4 hover:shadow-lg transition-shadow`}>
      {/* Post header */}
      <div className="flex items-center mb-3">
        <div className="text-2xl mr-3">{post.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <span className={`font-bold ${themeClasses.text} truncate`}>{post.author}</span>
            <span className={`ml-2 opacity-60 ${themeClasses.text} text-sm`}>{post.handle}</span>
            <span className={`ml-2 opacity-40 ${themeClasses.text} text-sm`}>•</span>
            <span className={`ml-2 opacity-60 ${themeClasses.text} text-sm`}>{post.timestamp}</span>
          </div>
        </div>
        
      </div>

      {/* Quoted text */}
      {post.quotedText && (
        <div className={`mb-3 p-3 border-l-4 ${theme === 'matrix' ? 'border-green-500' : 'border-blue-500'} bg-black/10 rounded`}>
          <div className={`text-sm italic ${themeClasses.text}`}>“{post.quotedText}”</div>
        </div>
      )}

      {/* Post content */}
      <div className={`${themeClasses.text} whitespace-pre-line mb-3 leading-relaxed`}>
        {post.content}
      </div>

      {/* Media placeholder with suggestion text */}
      {post.media && post.media.length > 0 && (
        <div className="mb-3 space-y-3">
          {post.media.map((media, index) => {
            const isImage = media.type === 'image';
            const hasUrl = typeof media.url === 'string' && media.url.length > 0;
            if (isImage && hasUrl) {
              return (
                <div key={index} className={`overflow-hidden rounded-lg border ${themeClasses.cardBorder}`}>
                  <img
                    src={media.url}
                    alt={media.alt || 'release image'}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                  {media.alt && (
                    <div className={`px-3 py-2 text-xs opacity-60 ${themeClasses.text}`}>{media.alt}</div>
                  )}
                </div>
              );
            }
            // Fallback placeholder for non-image or missing URL
            return (
              <div key={index} className={`border-2 border-dashed ${themeClasses.cardBorder} rounded-lg p-4 bg-opacity-20 ${themeClasses.cardBg}`}>
                <div className={`text-sm opacity-60 ${themeClasses.text} mb-2`}>
                  📎 {isImage ? 'Image not available' : 'Unsupported media type'}
                </div>
                {media.alt && (
                  <div className={`text-xs opacity-50 ${themeClasses.text} mt-1`}>
                    Alt: {media.alt}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions: Copy and Sources */}
      <div className="pt-2 border-t border-opacity-20 flex items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(post.content);
              } else {
                const ta = document.createElement('textarea');
                ta.value = post.content;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
              }
              setCopiedId(post.id);
              setTimeout(() => setCopiedId(null), 1500);
            } catch (e) {
              console.error('Copy failed', e);
            }
          }}
          className={`text-xs px-3 py-1 rounded border ${themeClasses.cardBorder} ${themeClasses.text} hover:opacity-80`}
          title="Copy tweet text"
        >
          {copiedId === post.id ? 'Copied!' : 'Copy'}
        </button>
        {post.sources && post.sources.length > 0 && (
          <button
            type="button"
            onClick={() => setSourcesFor(post)}
            className={`text-xs px-3 py-1 rounded border ${themeClasses.cardBorder} ${themeClasses.text} hover:opacity-80`}
            title="View sources"
          >
            Sources
          </button>
        )}
      </div>
    </div>
  );

  const Column: React.FC<{ title: string; posts: Post[] }> = ({ title, posts }) => (
    <div className="flex-shrink-0 w-96 mr-6">
      {/* Column header */}
      <div className={`${themeClasses.columnHeader} border rounded-t-lg p-4`}>
        <h3 className={`font-bold text-lg ${themeClasses.text}`}>{title}</h3>
      </div>

      {/* Column content - scrollable */}
      <div className={`${themeClasses.cardBg} border-l border-r border-b ${themeClasses.cardBorder} rounded-b-lg p-4`}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );

  return (
    <div className={`w-full h-full ${themeClasses.background} ${themeClasses.text}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-opacity-20">
        <h1 className={`text-2xl font-bold ${themeClasses.text}`}>Admin Dashboard</h1>
        <p className={`text-sm opacity-60 ${themeClasses.text} mt-1`}>
          Monitor releases, announcements, and community activity
        </p>
      </div>

      {/* Horizontally scrollable columns */}
      <div className="flex overflow-x-auto p-6 h-full" style={{ scrollbarWidth: 'thin' }}>
        <Column title="🚀 Releases" posts={releasesData} />
        <Column title="📢 Social Media" posts={nitterData} />
        <Column title="📊 All Posts" posts={[...releasesData, ...nitterData]} />
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .scrollbar-matrix::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-matrix::-webkit-scrollbar-track {
          background: rgba(0, 255, 0, 0.1);
          border-radius: 4px;
        }
        .scrollbar-matrix::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 0, 0.5);
          border-radius: 4px;
        }
        .scrollbar-matrix::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 0, 0.7);
        }

        .scrollbar-material::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-material::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        .scrollbar-material::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }
        .scrollbar-material::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.5);
        }
      `}</style>

      {/* Sources Modal */}
      {sourcesFor && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className={`${themeClasses.cardBg} border ${themeClasses.cardBorder} rounded-lg p-4 w-[680px] max-w-[95vw] max-h-[80vh] overflow-auto`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`font-bold ${themeClasses.text}`}>Sources</div>
              <button
                type="button"
                onClick={() => setSourcesFor(null)}
                className={`text-xs px-3 py-1 rounded border ${themeClasses.cardBorder} ${themeClasses.text} hover:opacity-80`}
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              {(sourcesFor.sources || []).map((s, idx) => {
                const isTweetId = typeof s.id === 'string' && /^\d+$/.test(s.id);
                const hasHandle = typeof s.author === 'string' && s.author.startsWith('@');
                const username = hasHandle ? s.author.slice(1) : '';
                const tweetUrl = isTweetId && hasHandle ? `https://x.com/${username}/status/${s.id}` : null;
                return (
                  <div key={idx} className={`p-3 border ${themeClasses.cardBorder} rounded ${themeClasses.cardBg}`}>
                    <div className={`text-sm ${themeClasses.text} mb-1`}>
                      <span className="font-bold">{s.author}</span>
                      <span className="opacity-60 ml-2">{s.type}</span>
                      {tweetUrl && (
                        <a
                          href={tweetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`ml-3 underline ${themeClasses.text}`}
                          title="Open source tweet on X"
                        >
                          View on X
                        </a>
                      )}
                    </div>
                    <div className={`${themeClasses.text} whitespace-pre-line text-sm`}>{s.content}</div>
                    {s.timestamp && (
                      <div className={`text-xs opacity-60 ${themeClasses.text} mt-1`}>{s.timestamp}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
