// Shared utility for managing favorite images

interface FavoriteImage {
  id: string;
  url: string;
  tags: string[];
}

export const getFavorites = (): FavoriteImage[] => {
  try {
    // Try the new key first, then fall back to the old key for backward compatibility
    const newFavorites = localStorage.getItem('favoriteImages');
    const oldFavorites = localStorage.getItem('nostr_image_favorites');
    
    if (newFavorites) {
      const parsed = JSON.parse(newFavorites);
      return parsed;
    } else if (oldFavorites) {
      // Migrate old favorites to new key
      const parsed = JSON.parse(oldFavorites);
      
      // Convert old string array to new object array format
      const migratedFavorites: FavoriteImage[] = parsed.map((url: string) => ({
        id: url, // Use URL as ID for backward compatibility
        url,
        tags: []
      }));
      
      localStorage.setItem('favoriteImages', JSON.stringify(migratedFavorites));
      localStorage.removeItem('nostr_image_favorites');
      return migratedFavorites;
    }
    
    return [];
  } catch (error) {
    console.error('getFavorites error:', error);
    return [];
  }
};

export const addToFavorites = (imageUrl: string, tags: string[] = []): void => {
  try {
    const favorites = getFavorites();
    if (!favorites.some(fav => fav.url === imageUrl)) {
      favorites.push({ id: imageUrl, url: imageUrl, tags });
      localStorage.setItem('favoriteImages', JSON.stringify(favorites));
      // Force re-render by dispatching a custom event
      window.dispatchEvent(new CustomEvent('favoritesUpdated'));
    }
  } catch (error) {
    console.error('Failed to add to favorites:', error);
  }
};

export const removeFromFavorites = (imageUrl: string): void => {
  try {
    const favorites = getFavorites();
    const newFavorites = favorites.filter(fav => fav.url !== imageUrl);
    localStorage.setItem('favoriteImages', JSON.stringify(newFavorites));
    // Force re-render by dispatching a custom event
    window.dispatchEvent(new CustomEvent('favoritesUpdated'));
  } catch (error) {
    console.error('Failed to remove from favorites:', error);
  }
};

export const isFavorited = (imageUrl: string): boolean => {
  return getFavorites().some(fav => fav.url === imageUrl);
};

