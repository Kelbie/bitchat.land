import { useState } from "react";
import { ZoomState } from "../types";
import { decodeGeohash } from "../utils/geohashUtils";
import { PROJECTIONS } from "../constants/projections";

export function useZoom(width: number, height: number, projection: string) {
  const [zoomedGeohash, setZoomedGeohash] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(250);
  const [zoomTranslate, setZoomTranslate] = useState<[number, number]>([0, 0]);

  // Function to zoom to a specific geohash
  const zoomToGeohash = (geohash: string) => {
    if (!geohash) {
      // Reset zoom
      setZoomedGeohash(null);
      setZoomScale(250);
      setZoomTranslate([0, 0]); // Reset to center (no offset)
      return;
    }

    const bounds = decodeGeohash(geohash);

    // Calculate the dimensions of the geohash region
    const lngSpan = Math.abs(bounds.maxLng - bounds.minLng);

    // Handle antimeridian crossing
    const actualLngSpan = lngSpan > 180 ? 360 - lngSpan : lngSpan;

    // Calculate center with antimeridian handling
    let centerLng;
    if (lngSpan > 180) {
      // Antimeridian crossing - center on the smaller segment
      centerLng =
        bounds.minLng < 0
          ? (bounds.minLng + 180) / 2
          : (bounds.maxLng - 180) / 2;
    } else {
      centerLng = (bounds.minLng + bounds.maxLng) / 2;
    }
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;

    // Create a temporary projection to calculate the scale needed
    const tempProjection = PROJECTIONS[projection]().scale(1).translate([0, 0]);

    // Project the bounds to get pixel dimensions at scale 1
    const topLeft = tempProjection([bounds.minLng, bounds.maxLat]);
    const bottomRight = tempProjection([bounds.maxLng, bounds.minLat]);

    if (!topLeft || !bottomRight) {
      // Fallback: use geographic bounds to calculate optimal scale
      const lngSpan = Math.abs(bounds.maxLng - bounds.minLng);
      const latSpan = Math.abs(bounds.maxLat - bounds.minLat);
      
      // Handle antimeridian crossing for longitude
      const actualLngSpan = lngSpan > 180 ? 360 - lngSpan : lngSpan;
      
      // Calculate how much of the world this geohash represents
      const worldLngSpan = 360;
      const worldLatSpan = 180;
      
      // More aggressive scaling for higher precision levels
      const precision = geohash.length;
      const baseDesiredCoverage = precision <= 3 ? 0.6 : precision <= 5 ? 0.4 : 0.2;
      const availableWidth = width * baseDesiredCoverage;
      const availableHeight = height * baseDesiredCoverage;
      
      // Calculate scale needed to fit this geographic region in desired screen space
      // At scale 1, the world is approximately 2π × scale pixels wide
      const baseWorldWidth = 2 * Math.PI;
      const scaleForLng = (availableWidth * worldLngSpan) / (actualLngSpan * baseWorldWidth);
      const scaleForLat = (availableHeight * worldLatSpan) / (latSpan * baseWorldWidth);
      
      // Use the more restrictive scale
      let calculatedScale = Math.min(scaleForLng, scaleForLat);
      
      // Apply additional multiplier for very high precision levels
      if (precision >= 6) {
        const extraMultiplier = Math.pow(2, precision - 5); // 2x, 4x, 8x, 16x for levels 6, 7, 8, 9+
        calculatedScale *= extraMultiplier;
      }
      
      const newScale = Math.max(250, Math.min(calculatedScale, 5000000)); // Higher max for deep zoom

      const finalProjection = PROJECTIONS[projection]()
        .scale(newScale)
        .translate([width / 2, height / 2]);

      const screenCoords = finalProjection([centerLng, centerLat]);

      if (screenCoords) {
        const translateX = width / 2 - screenCoords[0];
        const translateY = height / 2 - screenCoords[1];

        setZoomedGeohash(geohash);
        setZoomScale(newScale);
        setZoomTranslate([translateX, translateY]);
      }
      return;
    }

    // Calculate the pixel dimensions of the region at scale 1
    const pixelWidth = Math.abs(bottomRight[0] - topLeft[0]);
    const pixelHeight = Math.abs(bottomRight[1] - topLeft[1]);

    // More aggressive padding for higher precision levels
    const precision = geohash.length;
    const padding = precision <= 3 ? 0.1 : precision <= 5 ? 0.05 : 0.02;
    const availableWidth = width * (1 - 2 * padding);
    const availableHeight = height * (1 - 2 * padding);

    // Calculate scale to fit both width and height
    let scaleX = pixelWidth > 0 ? availableWidth / pixelWidth : 1;
    let scaleY = pixelHeight > 0 ? availableHeight / pixelHeight : 1;

    // Apply additional multiplier for very high precision levels
    if (precision >= 6) {
      const extraMultiplier = Math.pow(2, precision - 5); // 2x, 4x, 8x, 16x for levels 6, 7, 8, 9+
      scaleX *= extraMultiplier;
      scaleY *= extraMultiplier;
    }

    // Use the smaller scale to ensure the entire region fits
    const newScale = Math.max(250, Math.min(scaleX, scaleY, 5000000)); // Higher max for deep zoom

    // Create a temporary projection to get the screen coordinates
    const finalProjection = PROJECTIONS[projection]()
      .scale(newScale)
      .translate([width / 2, height / 2]);

    const screenCoords = finalProjection([centerLng, centerLat]);

    if (screenCoords) {
      // Calculate translation to center the geohash
      // Since zoomTranslate is now an offset from center, we need the negative offset
      const translateX = width / 2 - screenCoords[0];
      const translateY = height / 2 - screenCoords[1];

      setZoomedGeohash(geohash);
      setZoomScale(newScale);
      setZoomTranslate([translateX, translateY]);
    }
  };

  // Update translate during drag
  const updateTranslate = (deltaX: number, deltaY: number) => {
    setZoomTranslate((prev) => [prev[0] + deltaX, prev[1] + deltaY]);
  };

  return {
    zoomedGeohash,
    zoomScale,
    zoomTranslate,
    zoomToGeohash,
    updateTranslate,
  };
}
