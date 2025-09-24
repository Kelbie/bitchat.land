import React from 'react';
import { Modal } from '@/components/ui/layout';
import { FavoritesPage } from './FavoritesPage';
import { useImageModalState } from './useImageModalState';
import { DiscoverPage } from './DiscoverPage';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "matrix" | "material";
  onImageSelect: (imageUrl: string) => void;
}

export function FavoritesModal({ isOpen, onClose, theme, onImageSelect }: FavoritesModalProps) {
  const { context, actions } = useImageModalState();

  // Render the appropriate page based on state
  const renderContent = () => {
    switch (context.state) {
      case "favorites":
        return (
          <FavoritesPage
            theme={theme}
            onImageSelect={onImageSelect}
          />
        );

      case "discover":
        return (
          <DiscoverPage
            theme={theme}
            onImageSelect={onImageSelect}
          />
        );

      default:
        return null;
    }
  };

  // Render the appropriate page based on state
  const renderTabs = () => {
    return [
      {
        id: "favorites",
        label: "My Favourites",
        icon: "❤️",
        isActive: context.state === "favorites",
        onClick: actions.switchToFavorites,
      },
      {
        id: "discover",
        label: "Discover Images",
        icon: "🔍",
        isActive: context.state === "discover",
        onClick: actions.switchToDiscover,
      },
    ];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Favorite Images"
      theme={theme}
      size="lg"
    >
      {/* Custom Tab Navigation */}
      <div className="flex border-b mb-4">
        {renderTabs().map((tab) => (
          <button
            key={tab.id}
            onClick={tab.onClick}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab.isActive
                ? theme === "matrix"
                  ? "text-[#00ff00] border-b-2 border-[#00ff00]"
                  : "text-blue-600 border-b-2 border-blue-600"
                : theme === "matrix"
                ? "text-[#00aa00] hover:text-[#00ff00]"
                : "text-gray-500 hover:text-gray-700"
            }`}
            type="button"
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Page Content */}
      {renderContent()}
    </Modal>
  );
}
