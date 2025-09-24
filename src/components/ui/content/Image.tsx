import React, { useState, useEffect } from "react";
import {
  addToFavorites,
  removeFromFavorites,
  isFavorited,
} from "@/utils/favorites";

interface ImageProps {
  src: string;
  alt: string;
  className?: string;
  maxWidth?: string;
  maxHeight?: string;
  onImageSelect?: (imageUrl: string) => void;
  showControls?: boolean;
  theme: "matrix" | "material";
  tags?: string[];
  showTags?: boolean;
  imageRef?: React.RefObject<HTMLDivElement>;
}

export function Image({
  src,
  alt,
  className = "",
  maxWidth = "200px",
  maxHeight = "200px",
  onImageSelect,
  showControls = true,
  theme,
  tags = [],
  showTags = false,
  imageRef,
}: ImageProps) {
  const [isFavoritedState, setIsFavoritedState] = useState(isFavorited(src));

  // Listen for favorites updates
  useEffect(() => {
    const handleFavoritesUpdated = () => {
      setIsFavoritedState(isFavorited(src));
    };

    window.addEventListener("favoritesUpdated", handleFavoritesUpdated);
    return () => {
      window.removeEventListener("favoritesUpdated", handleFavoritesUpdated);
    };
  }, [src]);

  const handleImageClick = () => {
    if (onImageSelect) {
      onImageSelect(src);
    }
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavoritedState) {
      removeFromFavorites(src);
    } else {
      addToFavorites(src, tags);
    }
  };

  const handleDirectLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(src, "_blank");
  };

  return (
    <div ref={imageRef} className={`relative inline-block group ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`max-w-[${maxWidth}] h-auto rounded-lg shadow-sm cursor-pointer hover:opacity-80 transition-opacity hover:scale-105 transform duration-200 ${
          onImageSelect ? "hover:opacity-80" : ""
        }`}
        style={{ maxHeight }}
        onClick={handleImageClick}
      />

      {showControls && (
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={handleDirectLinkClick}
            className="bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/90 cursor-pointer"
            title="Open image in new tab"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </button>
          <button
            onClick={handleHeartClick}
            className="bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/90 cursor-pointer"
            title={
              isFavoritedState ? "Remove from favorites" : "Add to favorites"
            }
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              {isFavoritedState ? (
                // Filled heart for favorited
                <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.584 20.58 20.58 0 01-1.174.681l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
              ) : (
                // Outline heart for not favorited
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              )}
            </svg>
          </button>
        </div>
      )}

      {/* Tags Display */}
      {showTags && tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {tags.slice(0, 6).map((tag, index) => (
            <span
              key={index}
              className={`px-1.5 py-0.5 text-[10px] rounded truncate max-w-16 ${
                theme === "matrix"
                  ? "bg-[#003300] text-[#00aa00] border border-[#00ff00]/20 hover:bg-[#004400]"
                  : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
              }`}
              title={tag}
            >
              #{tag}
            </span>
          ))}
          {tags.length > 6 && (
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded ${
                theme === "matrix"
                  ? "bg-[#003300] text-[#00aa00] border border-[#00ff00]/20"
                  : "bg-gray-100 text-gray-700 border border-gray-300"
              }`}
            >
              +{tags.length - 6}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
