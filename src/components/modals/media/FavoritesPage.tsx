import React, { useState, useEffect, useCallback } from 'react';
import { getFavorites, removeFromFavorites } from '@/utils/favorites';
import { MasonryGrid, MasonryImage } from '@/components/ui/data';

interface FavoritesPageProps {
  theme: "matrix" | "material";
  onImageSelect: (imageUrl: string) => void;
}

interface FavoriteImage extends MasonryImage {
  tags: string[];
}

// Separate component for masonry favorite images with controls overlay
const MasonryFavoriteImage: React.FC<{
  image: FavoriteImage;
  onImageSelect: (url: string) => void;
  onLoad: (imageId: string, naturalHeight: number, displayWidth: number) => void;
  theme: "matrix" | "material";
}> = ({ image, onImageSelect, onLoad, theme }) => {
  const imgRef = React.useRef<HTMLImageElement>(null);

  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      onLoad(image.id, imgRef.current.naturalHeight, imgRef.current.naturalWidth);
    }
  }, [image.id, onLoad]);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Remove from favorites
    removeFromFavorites(image.url);
    // The favoritesUpdated event will trigger a re-render of the parent component
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Copy image URL to clipboard
    navigator.clipboard.writeText(image.url);
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

export function FavoritesPage({ theme, onImageSelect }: FavoritesPageProps) {
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

  const renderImage = (image: FavoriteImage, onLoad: (imageId: string, naturalHeight: number, displayWidth: number) => void) => (
    <MasonryFavoriteImage
      image={image}
      onImageSelect={onImageSelect}
      onLoad={onLoad}
      theme={theme}
    />
  );

  return (
    <div className="space-y-4">
      <div className={`text-sm text-center mb-4 ${
        theme === "matrix" ? "text-[#00aa00]" : "text-gray-600"
      }`}>
        💡 Click on any image below to insert it into your chat message
      </div>
      
      <MasonryGrid
        images={favorites}
        renderImage={renderImage}
        columnCount={3}
        gap={16}
        maxHeight={400}
      />
    </div>
  );
}
