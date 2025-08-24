// @ts-ignore - No types available for latlon-geohash
import Geohash from 'latlon-geohash';

export interface LocationInfo {
  name: string;
  admin1?: string;
  country?: string;
  formatted: string;
}

// Simple geohash to region mapping based on first character
const GEOHASH_REGIONS: { [key: string]: LocationInfo } = {
  // Northern hemisphere, western longitudes
  'b': { name: 'Alaska & Far NE Russia', admin1: 'Bering / Arctic', country: 'Multiple', formatted: 'Alaska & Far NE Russia' },
  'c': { name: 'Canada NW', admin1: 'Northwest Canada', country: 'Canada', formatted: 'Northwest Canada' },
  'f': { name: 'Canada NE & Hudson Bay', admin1: 'NE Canada', country: 'Canada', formatted: 'Northeast Canada & Hudson Bay' },
  'g': { name: 'Greenland', admin1: 'Greenland', country: 'Greenland / Denmark', formatted: 'Greenland' },

  // Northern hemisphere, eastern longitudes
  'u': { name: 'Western / Central Europe', admin1: 'Europe', country: 'Europe', formatted: 'Western & Central Europe' },
  'v': { name: 'Eastern Europe', admin1: 'Eastern Europe', country: 'Europe', formatted: 'Eastern Europe' },
  'y': { name: 'Scandinavia & Northern Russia', admin1: 'Northern Europe', country: 'Europe / Russia', formatted: 'Scandinavia & Northern Russia' },
  'z': { name: 'NE Russia & Arctic Coast', admin1: 'Far NE Russia', country: 'Russia', formatted: 'Far Northeast Russia & Arctic Coast' },

  // Mid-latitudes, western hemisphere
  '9': { name: 'US West', admin1: 'Western United States', country: 'USA', formatted: 'US West' },
  'd': { name: 'US East & Great Lakes', admin1: 'Eastern United States', country: 'USA', formatted: 'US East & Great Lakes' },
  'e': { name: 'Western Europe & NW Africa', admin1: 'Western Europe', country: 'Europe / Africa', formatted: 'Western Europe & NW Africa' },
  's': { name: 'Mediterranean & Middle East', admin1: 'Southern Europe / Middle East', country: 'Europe / Asia / Africa', formatted: 'Mediterranean & Middle East' },
  't': { name: 'Central Asia', admin1: 'Central Asia', country: 'Asia', formatted: 'Central Asia' },

  // Southern hemisphere
  '3': { name: 'Eastern South America', admin1: 'Eastern South America', country: 'Brazil / S. America', formatted: 'Eastern South America' },
  '6': { name: 'Western South America', admin1: 'Andes', country: 'South America', formatted: 'Western South America' },
  '7': { name: 'Central America & Caribbean', admin1: 'Central America', country: 'Central America', formatted: 'Central America & Caribbean' },
  'k': { name: 'Southern Africa', admin1: 'Southern Africa', country: 'Africa', formatted: 'Southern Africa' },
  'm': { name: 'Indian Ocean West & Madagascar', admin1: 'SW Indian Ocean', country: 'Ocean / Africa', formatted: 'SW Indian Ocean & Madagascar' },
  'n': { name: 'India & South Asia', admin1: 'South Asia', country: 'Asia', formatted: 'India & South Asia' },
  'q': { name: 'East Africa & Western Indian Ocean', admin1: 'Eastern Africa', country: 'Africa', formatted: 'Eastern Africa & Western Indian Ocean' },
  'r': { name: 'Australia', admin1: 'Australia', country: 'Australia', formatted: 'Australia' },
  'x': { name: 'East Asia (China, Japan, Korea)', admin1: 'East Asia', country: 'Asia', formatted: 'China, Japan & Korea' },
  'w': { name: 'China Interior & Mongolia', admin1: 'East Asia', country: 'Asia', formatted: 'China & Mongolia' },
  'p': { name: 'Middle East & Arabian Peninsula', admin1: 'Middle East', country: 'Asia', formatted: 'Middle East & Arabian Peninsula' },

  // Oceans
  '0': { name: 'North Pacific Ocean (West)', admin1: 'Pacific Ocean', country: 'Ocean', formatted: 'North Pacific Ocean (West)' },
  '1': { name: 'South Pacific Ocean (West)', admin1: 'Pacific Ocean', country: 'Ocean', formatted: 'South Pacific Ocean (West)' },
  '2': { name: 'Central Pacific Ocean (West)', admin1: 'Pacific Ocean', country: 'Ocean', formatted: 'Central Pacific Ocean (West)' },
  '8': { name: 'South Atlantic Ocean', admin1: 'Atlantic Ocean', country: 'Ocean', formatted: 'South Atlantic Ocean' },
  '4': { name: 'Indian Ocean (Central)', admin1: 'Indian Ocean', country: 'Ocean', formatted: 'Central Indian Ocean' },
  '5': { name: 'Antarctica', admin1: 'Antarctica', country: 'Antarctica', formatted: 'Antarctica' },
  'h': { name: 'South Atlantic (East)', admin1: 'Atlantic Ocean', country: 'Ocean', formatted: 'South Atlantic Ocean (East)' },
  'j': { name: 'Antarctic Ocean (East)', admin1: 'Southern Ocean', country: 'Ocean', formatted: 'Antarctic Ocean (East)' },
};

export async function getLocationFromGeohash(geohash: string): Promise<LocationInfo | null> {
  try {
    const { lat, lon } = Geohash.decode(geohash);
    
    // For more specific location names based on coordinates
    if (geohash.length >= 3) {
      // Try to provide more specific names for longer geohashes
      const firstChar = geohash.charAt(0).toLowerCase();
      const baseRegion = GEOHASH_REGIONS[firstChar];
      
      if (baseRegion) {
        // Add some coordinate-based specificity
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';
        const precision = `${Math.abs(lat).toFixed(1)}°${latDir}, ${Math.abs(lon).toFixed(1)}°${lonDir}`;
        
        return {
          ...baseRegion,
          formatted: `${baseRegion.formatted} (${precision})`
        };
      }
    }
    
    // Fallback to basic region for single character
    const firstChar = geohash.charAt(0).toLowerCase();
    return GEOHASH_REGIONS[firstChar] || {
      name: 'Unknown Region',
      formatted: `Unknown Region (${geohash.toUpperCase()})`
    };
  } catch (error) {
    console.warn('Geocoding failed for geohash:', geohash, error);
    return null;
  }
}

// Cache for location lookups
const locationCache = new Map<string, LocationInfo | null>();

export async function getCachedLocationFromGeohash(geohash: string): Promise<LocationInfo | null> {
  if (locationCache.has(geohash)) {
    return locationCache.get(geohash) || null;
  }
  
  const location = await getLocationFromGeohash(geohash);
  locationCache.set(geohash, location);
  return location;
}
