import React, { useState } from 'react';
import { FavoritesList } from './FavoritesList';
import { NostrImageSearch } from './NostrImageSearch';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "matrix" | "material";
  onImageSelect: (imageUrl: string) => void;
}

export function FavoritesModal({ isOpen, onClose, theme, onImageSelect }: FavoritesModalProps) {
  const [favoritesTab, setFavoritesTab] = useState<"favorites" | "discover">("favorites");

  if (!isOpen) return null;

  const styles = {
    matrix: {
      modal: "fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4",
      content: "max-w-2xl w-full max-h-[80vh] rounded-lg shadow-xl bg-black border border-[#00ff00] text-[#00ff00]",
      header: "p-4 border-b border-[#003300]",
      title: "text-lg font-bold text-[#00ff00]",
      closeButton: "p-2 rounded hover:bg-opacity-20 hover:bg-[#00ff00] text-[#00ff00]",
      tabContainer: "flex gap-1 mt-4",
      tabButton: "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
      tabButtonActive: "bg-[#00ff00] text-black",
      tabButtonInactive: "bg-[#003300] text-[#00ff00] hover:bg-[#004400]",
      body: "p-4"
    },
    material: {
      modal: "fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4",
      content: "max-w-2xl w-full max-h-[80vh] rounded-lg shadow-xl bg-white border border-gray-200 text-gray-800",
      header: "p-4 border-b border-gray-200",
      title: "text-lg font-bold text-gray-800",
      closeButton: "p-2 rounded hover:bg-opacity-20 hover:bg-gray-100 text-gray-600",
      tabContainer: "flex gap-1 mt-4",
      tabButton: "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
      tabButtonActive: "bg-blue-600 text-white",
      tabButtonInactive: "bg-gray-200 text-gray-700 hover:bg-gray-300",
      body: "p-4"
    }
  };

  const s = styles[theme];

  return (
    <div className={s.modal}>
      <div className={s.content}>
        <div className={s.header}>
          <div className="flex items-center justify-between">
            <h2 className={s.title}>
              Favorite Images
            </h2>
            <button
              onClick={onClose}
              className={s.closeButton}
            >
              ✕
            </button>
          </div>
          
          {/* Tabs */}
          <div className={s.tabContainer}>
            <button
              onClick={() => setFavoritesTab("favorites")}
              className={`${s.tabButton} ${
                favoritesTab === "favorites" ? s.tabButtonActive : s.tabButtonInactive
              }`}
            >
              ❤️ My Favourites
            </button>
            <button
              onClick={() => setFavoritesTab("discover")}
              className={`${s.tabButton} ${
                favoritesTab === "discover" ? s.tabButtonActive : s.tabButtonInactive
              }`}
            >
              🔍 Discover Images
            </button>
          </div>
        </div>
        
        <div className={s.body}>
          {favoritesTab === "favorites" ? (
            <FavoritesList
              theme={theme}
              onImageSelect={onImageSelect}
            />
          ) : (
            <NostrImageSearch
              theme={theme}
              onImageSelect={onImageSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}
