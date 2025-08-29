import { GeohashInfo, CountryInRegion } from '../types/radio';
import * as ngeohash from 'ngeohash';
import { iso1A2Code, iso1A2Codes } from '@rapideditor/country-coder';

export class CountryService {
  /**
   * Find countries that intersect with a geohash region using accurate geographic detection
   */
  static async getCountriesInGeohash(
    geohashInfo: GeohashInfo
  ): Promise<CountryInRegion[]> {
    const { geohash, center } = geohashInfo;
    
    // Get the bounding box from the geohash
    const bbox = ngeohash.decode_bbox(geohash);
    // Convert from [minLat, minLon, maxLat, maxLon] to [minLon, minLat, maxLon, maxLat] format
    // Ensure we have exactly 4 elements for the bbox
    const countryCoderBbox: [number, number, number, number] = [bbox[1], bbox[0], bbox[3], bbox[2]];
    
    // Get all countries that intersect with the geohash bounding box
    const countryCodes = iso1A2Codes(countryCoderBbox);
    
    if (countryCodes.length === 0) {
      // Fallback: try center point detection
      return this.findCountriesByCenterPoint(center);
    }
    
    // Convert country codes to CountryInRegion objects with distance calculations
    const countries: CountryInRegion[] = countryCodes.map((countryCode: string) => {
      // Get country name from the code
      const countryName = this.getCountryName(countryCode);
      
      // Calculate distance from geohash center to country center
      const countryCenter = this.getCountryCenter(countryCode);
      const distance = this.haversineKm(
        center.latitude, center.longitude,
        countryCenter.latitude, countryCenter.longitude
      );
      
      return {
        countryCode,
        countryName,
        distance
      };
    });
    
    // Sort by distance
    return countries.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  /**
   * Fallback: find countries based on center point
   */
  private static findCountriesByCenterPoint(
    center: { latitude: number; longitude: number }
  ): CountryInRegion[] {
    const countries: CountryInRegion[] = [];
    
    try {
      // Use country-coder to find the country at the center point
      const countryCode = iso1A2Code([center.longitude, center.latitude]);
      
      if (countryCode) {
        const countryName = this.getCountryName(countryCode);
        countries.push({
          countryCode,
          countryName,
          distance: 0 // Center point is inside the country
        });
      }
    } catch (error) {
      console.warn('Failed to detect country at center point:', error);
    }
    
    return countries;
  }

  /**
   * Get human-readable country name from country code
   */
  private static getCountryName(countryCode: string): string {
    // Map of common country codes to names
    const countryNames: Record<string, string> = {
      'US': 'United States',
      'CA': 'Canada',
      'MX': 'Mexico',
      'GB': 'United Kingdom',
      'FR': 'France',
      'DE': 'Germany',
      'IT': 'Italy',
      'ES': 'Spain',
      'JP': 'Japan',
      'AU': 'Australia',
      'BR': 'Brazil',
      'CN': 'China',
      'IN': 'India',
      'RU': 'Russia',
      'IE': 'Ireland',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'CH': 'Switzerland',
      'AT': 'Austria',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'PL': 'Poland',
      'CZ': 'Czech Republic',
      'SK': 'Slovakia',
      'HU': 'Hungary',
      'RO': 'Romania',
      'BG': 'Bulgaria',
      'GR': 'Greece',
      'TR': 'Turkey',
      'UA': 'Ukraine',
      'BY': 'Belarus',
      'LT': 'Lithuania',
      'LV': 'Latvia',
      'EE': 'Estonia',
      'FI': 'Finland'
    };
    
    return countryNames[countryCode] || countryCode;
  }

  /**
   * Get approximate center point of a country (simplified approach)
   * In a production system, you might want to use a proper country centroid database
   */
  private static getCountryCenter(countryCode: string): { latitude: number; longitude: number } {
    // Approximate country centers (longitude, latitude)
    const countryCenters: Record<string, [number, number]> = {
      'US': [-98.5795, 39.8283],
      'CA': [-96.8184, 56.1304],
      'MX': [-102.5528, 23.6345],
      'GB': [-0.1278, 51.5074],
      'FR': [2.2137, 46.2276],
      'DE': [10.4515, 51.1657],
      'IT': [12.5674, 41.8719],
      'ES': [-3.7492, 40.4637],
      'JP': [138.2529, 36.2048],
      'AU': [133.7751, -25.2744],
      'BR': [-51.9253, -14.2350],
      'CN': [104.1954, 35.8617],
      'IN': [78.9629, 20.5937],
      'RU': [105.3188, 61.5240],
      'IE': [-8.2439, 53.4129],
      'NL': [5.2913, 52.1326],
      'BE': [4.3517, 50.8503],
      'CH': [8.2275, 46.8182],
      'AT': [14.5501, 47.5162],
      'SE': [18.0686, 60.1282],
      'NO': [8.4689, 60.4720],
      'DK': [9.5018, 56.2639],
      'PL': [19.1451, 51.9194],
      'CZ': [15.4726, 49.8175],
      'SK': [19.6990, 48.6690],
      'HU': [19.5033, 47.1625],
      'RO': [24.9668, 45.9432],
      'BG': [25.4858, 42.7339],
      'GR': [21.8243, 39.0742],
      'TR': [35.2433, 38.9637],
      'UA': [31.1656, 48.3794],
      'BY': [27.9534, 53.7098],
      'LT': [23.8813, 55.1694],
      'LV': [24.6032, 56.8796],
      'EE': [25.0136, 58.5953],
      'FI': [25.7482, 61.9241]
    };
    
    const center = countryCenters[countryCode];
    if (center) {
      return {
        longitude: center[0],
        latitude: center[1]
      };
    }
    
    // Default fallback
    return {
      longitude: 0,
      latitude: 0
    };
  }

  /**
   * Haversine distance calculation
   */
  private static haversineKm(lat: number, lon: number, lat2: number, lon2: number): number {
    const r = 6371.0; // Earth radius in km
    const dLat = (lat2 - lat) * Math.PI / 180;
    const dLon = (lon2 - lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
              Math.cos(lat * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return r * c;
  }
}
