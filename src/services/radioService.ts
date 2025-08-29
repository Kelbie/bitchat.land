import { RadioBrowserApi, Station } from '@luigivampa/radio-browser-api';
import { StationWithDistance } from '../types/radio';
import { GeohashInfo, CountryInRegion } from '../types/radio';

export class RadioService {
  private api: RadioBrowserApi;

  constructor(userAgent: string = 'GeohashRadioFinder/1.0') {
    this.api = new RadioBrowserApi(userAgent);
  }

  /**
   * Fetch radio stations for given countries with geolocation
   */
  async getStationsForCountries(
    countries: CountryInRegion[],
    geohashCenter: { latitude: number; longitude: number }
  ): Promise<StationWithDistance[]> {
    const allStations: Station[] = [];
    
    // Fetch stations for each country
    for (const country of countries) {
      try {
        const stations = await this.api.searchStations({
          countryCode: country.countryCode,
          hasGeoInfo: true, // Only stations with lat/lon
          limit: 100, // Reasonable limit per country
          hideBroken: true // Only working stations
        });
        
        allStations.push(...stations);
      } catch (error) {
        console.warn(`Failed to fetch stations for ${country.countryCode}:`, error);
      }
    }

    // Convert to StationWithDistance and calculate distances
    const stationsWithDistance: StationWithDistance[] = allStations
      .filter(station => station.geoLat !== null && station.geoLong !== null)
      .map(station => {
        const distance = this.haversineKm(
          geohashCenter.latitude, geohashCenter.longitude,
          station.geoLat!, station.geoLong!
        );
        
        return {
          ...station,
          distanceKm: distance,
          isMusicStation: this.isMusicStation(station)
        };
      });

    // Sort by distance and return
    return stationsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  /**
   * Determine if station is music-focused based on tags and name
   */
  private isMusicStation(station: Station): boolean {
    const musicTags = [
      'music', 'rock', 'pop', 'jazz', 'classical', 'electronic', 
      'dance', 'hip-hop', 'country', 'folk', 'reggae', 'blues',
      'metal', 'punk', 'indie', 'alternative', 'r&b', 'soul',
      'funk', 'house', 'techno', 'ambient', 'world music'
    ];
    
    const nonMusicTags = [
      'talk', 'news', 'sports', 'comedy', 'podcast', 'religion',
      'education', 'politics', 'business', 'weather'
    ];
    
    const allText = [
      ...station.tags,
      station.name.toLowerCase(),
      station.language?.join(' ') || ''
    ].join(' ').toLowerCase();
    
    // Check for non-music indicators first (higher priority)
    const hasNonMusicTags = nonMusicTags.some(tag => allText.includes(tag));
    if (hasNonMusicTags) return false;
    
    // Check for music indicators
    const hasMusicTags = musicTags.some(tag => allText.includes(tag));
    
    // Default to true if no clear indicators (assume music)
    return hasMusicTags || !hasNonMusicTags;
  }

  /**
   * Send click event to Radio Browser (for usage statistics)
   */
  async recordStationClick(stationId: string): Promise<void> {
    try {
      await this.api.sendStationClick(stationId);
    } catch (error) {
      console.warn('Failed to record station click:', error);
    }
  }

  /**
   * Haversine distance calculation (reusing our existing implementation)
   */
  private haversineKm(lat: number, lon: number, lat2: number, lon2: number): number {
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
