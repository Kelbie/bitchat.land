import * as ngeohash from 'ngeohash';
import { GeohashInfo } from '../types/radio';

export class GeohashService {
  /**
   * Convert geohash string to detailed information
   */
  static getGeohashInfo(geohashString: string): GeohashInfo {
    const bbox = ngeohash.decode_bbox(geohashString);
    const center = ngeohash.decode(geohashString);
    

    
    return {
      geohash: geohashString,
      precision: geohashString.length,
      boundingBox: {
        minLat: bbox[1],
        minLon: bbox[0],
        maxLat: bbox[3],
        maxLon: bbox[2]
      },
      center: {
        latitude: center.latitude,
        longitude: center.longitude
      }
    };
  }

  /**
   * Validate geohash string
   */
  static isValidGeohash(geohashString: string): boolean {
    try {
      ngeohash.decode(geohashString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get sample points within geohash for country detection
   */
  static getSamplePoints(geohashInfo: GeohashInfo, sampleCount: number = 25): Array<{lat: number, lon: number}> {
    const { boundingBox } = geohashInfo;
    const points: Array<{lat: number, lon: number}> = [];
    
    const latStep = (boundingBox.maxLat - boundingBox.minLat) / Math.sqrt(sampleCount);
    const lonStep = (boundingBox.maxLon - boundingBox.minLon) / Math.sqrt(sampleCount);
    
    for (let lat = boundingBox.minLat; lat <= boundingBox.maxLat; lat += latStep) {
      for (let lon = boundingBox.minLon; lon <= boundingBox.maxLon; lon += lonStep) {
        points.push({ lat, lon });
      }
    }
    
    return points;
  }
}
