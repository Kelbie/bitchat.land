import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image } from './Image';
import { getFavorites } from '../utils/favorites';

interface FavoritesListProps {
  theme: "matrix" | "material";
  onImageSelect: (imageUrl: string) => void;
}

interface FavoriteImage {
  url: string;
  tags: string[];
}

// True Masonry Grid with Virtual Scrolling
const MasonryGrid: React.FC<{
  images: FavoriteImage[];
  onImageSelect: (url: string) => void;
  theme: "matrix" | "material";
  className: string;
}> = ({ images, onImageSelect, theme, className }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
  const [columnHeights, setColumnHeights] = useState<number[]>([0, 0, 0]);
  const [itemPositions, setItemPositions] = useState<Array<{ x: number; y: number; height: number }>>([]);
  
  const COLUMN_COUNT = 3;
  const GAP = 16;
  
  // Calculate positions when images or heights change
  useEffect(() => {
    if (images.length === 0) return;
    
    const containerWidth = parentRef.current?.clientWidth || 800;
    const columnWidth = (containerWidth - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;
    const heights = [0, 0, 0];
    const positions: Array<{ x: number; y: number; height: number }> = [];
    
    images.forEach((image, index) => {
      // Find shortest column
      const shortestColumnIndex = heights.indexOf(Math.min(...heights));
      
      // Get estimated or actual height
      const estimatedHeight = imageHeights[`${image.url}-${index}`] || 250;
      
      // Calculate position
      const x = shortestColumnIndex * (columnWidth + GAP);
      const y = heights[shortestColumnIndex];
      
      positions.push({ x, y, height: estimatedHeight });
      
      // Update column height
      heights[shortestColumnIndex] += estimatedHeight + GAP;
    });
    
    setItemPositions(positions);
    setColumnHeights(heights);
  }, [images, imageHeights]);

  // Handle image load to get actual dimensions
  const handleImageLoad = useCallback((imageId: string, naturalHeight: number, displayWidth: number) => {
    const containerWidth = parentRef.current?.clientWidth || 800;
    const columnWidth = (containerWidth - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;
    
    // Calculate actual display height based on aspect ratio
    const aspectRatio = naturalHeight / displayWidth;
    const actualHeight = Math.min(columnWidth * aspectRatio, 400); // Max height 400px
    
    setImageHeights(prev => ({
      ...prev,
      [imageId]: actualHeight
    }));
  }, []);

  // Calculate total height for scrolling
  const totalHeight = Math.max(...columnHeights);

  return (
    <div
      ref={parentRef}
      className="h-96 w-full overflow-auto"
      style={{ height: '500px' }}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {images.map((image, index) => {
          const position = itemPositions[index];
          if (!position) return null;

          // Only render items that are likely to be visible
          const scrollTop = parentRef.current?.scrollTop || 0;
          const containerHeight = parentRef.current?.clientHeight || 500;
          const isVisible = position.y < scrollTop + containerHeight + 500 && 
                           position.y + position.height > scrollTop - 500;

          if (!isVisible) return null;

          const containerWidth = parentRef.current?.clientWidth || 800;
          const columnWidth = (containerWidth - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

          return (
            <div
              key={`${image.url}-${index}`}
              style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${columnWidth}px`,
                height: `${position.height}px`,
              }}
            >
              <MasonryFavoriteImage
                image={image}
                onImageSelect={onImageSelect}
                onLoad={handleImageLoad}
                theme={theme}
                width={columnWidth}
                imageId={`${image.url}-${index}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Separate component for masonry favorite images with controls overlay
const MasonryFavoriteImage: React.FC<{
  image: FavoriteImage;
  onImageSelect: (url: string) => void;
  onLoad: (imageId: string, naturalHeight: number, displayWidth: number) => void;
  theme: "matrix" | "material";
  width: number;
  imageId: string;
}> = ({ image, onImageSelect, onLoad, theme, width, imageId }) => {
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      onLoad(imageId, imgRef.current.naturalHeight, imgRef.current.naturalWidth);
    }
  }, [imageId, onLoad]);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // This would typically remove from favorites
    // For now, we'll just prevent the image selection
    console.log('Heart clicked - would remove from favorites');
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Copy image URL to clipboard
    navigator.clipboard.writeText(image.url);
    console.log('Link copied to clipboard');
  };

  return (
    <div className="w-full h-full relative group">
      <img
        ref={imgRef}
        src={image.url}
        alt={`Favorite image`}
        onLoad={handleImageLoad}
        onClick={() => onImageSelect(image.url)}
        className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
        style={{ maxHeight: '400px', objectFit: 'cover' }}
      />
      
      {/* Controls Overlay */}
      <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Heart Button */}
        <button
          onClick={handleHeartClick}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            theme === "matrix"
              ? "bg-black/70 text-[#00ff00] border border-[#00ff00]/20 hover:bg-[#00ff00]/20"
              : "bg-white/70 text-red-500 border border-gray-300 hover:bg-red-50"
          }`}
          title="Remove from favorites"
        >
          ❤️
        </button>
        
        {/* Link Button */}
        <button
          onClick={handleLinkClick}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            theme === "matrix"
              ? "bg-black/70 text-[#00ff00] border border-[#00ff00]/20 hover:bg-[#00ff00]/20"
              : "bg-white/70 text-blue-500 border border-gray-300 hover:bg-blue-50"
          }`}
          title="Copy image URL"
        >
          🔗
        </button>
      </div>

      {/* Tags */}
      {image.tags && image.tags.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex flex-wrap gap-1">
            {image.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className={`px-2 py-1 text-xs rounded ${
                  theme === "matrix" 
                    ? "bg-black/70 text-[#00ff00] border border-[#00ff00]/20" 
                    : "bg-white/70 text-gray-800 border border-gray-300"
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export function FavoritesList({ theme, onImageSelect }: FavoritesListProps) {
  const [favorites, setFavorites] = useState<FavoriteImage[]>([]);

  const loadFavorites = () => {
    const favs = getFavorites();
    setFavorites(favs);
  };

  useEffect(() => {
    loadFavorites();
    
    // Listen for favorites updates
    const handleFavoritesUpdated = () => {
      loadFavorites();
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
    };
  }, []);

  if (favorites.length === 0) {
    return (
      <div className={`text-center py-8 ${
        theme === "matrix" ? "text-[#00aa00]" : "text-gray-500"
      }`}>
        <div className="text-2xl mb-2">❤️</div>
        <div className="text-sm">Click the heart icon on any image in chat to add it to favorites</div>
      </div>
    );
  }

  const styles = {
    matrix: {
      infoText: "text-sm text-center text-[#00aa00] mb-4",
    },
    material: {
      infoText: "text-sm text-center text-gray-600 mb-4",
    }
  };

  const s = styles[theme];

  return (
    <div className="space-y-4">
      <div className={s.infoText}>
        💡 Click on any image below to insert it into your chat message
      </div>
      
      <MasonryGrid
        images={favorites}
        onImageSelect={onImageSelect}
        theme={theme}
        className="w-full"
      />
    </div>
  );
}
