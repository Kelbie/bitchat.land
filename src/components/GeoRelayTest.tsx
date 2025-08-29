import { useState, useEffect } from "react";
import { GeoRelayDirectory } from "../utils/geoRelayDirectory";
import { GeohashRadioFinder } from "./GeohashRadioFinder";

// Interface for the directory methods we're using
interface GeoRelayDirectoryExtended extends GeoRelayDirectory {
  decodeCenter: (geohash: string) => { lat: number; lon: number };
  closestRelaysByCoords: (lat: number, lon: number, count: number) => string[];
  entries: Array<{ host: string; lat: number; lon: number }>;
  haversineKm: (lat: number, lon: number, lat2: number, lon2: number) => number;
}

export function GeoRelayTest() {
  const [activeTab, setActiveTab] = useState<'relay' | 'radio'>('relay');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "prompting" | "unavailable">("unavailable");
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lon: number} | null>(null);

  useEffect(() => {
    const runTests = async () => {
      const results: string[] = [];
      
      try {
        // Test 1: Basic functionality
        results.push("Testing GeoRelayDirectory...");
        
        const directory = GeoRelayDirectory.shared as unknown as GeoRelayDirectoryExtended;
        results.push("✓ GeoRelayDirectory instance created");
        
        // Test 2: Test geohash decoding
        const testGeohash = "u4pruyd";
        const center = directory.decodeCenter(testGeohash);
        results.push(`✓ Geohash ${testGeohash} decoded to lat: ${center.lat.toFixed(4)}, lon: ${center.lon.toFixed(4)}`);
        
        // Test 3: Test relay selection
        const relays = directory.closestRelays(testGeohash, 3);
        results.push(`✓ Found ${relays.length} closest relays for geohash ${testGeohash}`);
        relays.forEach((relay: string, i: number) => {
          results.push(`  ${i + 1}. ${relay}`);
        });
        
        // Test 4: Test coordinate-based relay selection
        const coordRelays = directory.closestRelaysByCoords(37.7749, -122.4194, 3); // San Francisco
        results.push(`✓ Found ${coordRelays.length} closest relays for San Francisco coordinates`);
        coordRelays.forEach((relay: string, i: number) => {
          results.push(`  ${i + 1}. ${relay}`);
        });
        
        // Test 5: Test CSV parsing
        const sampleCSV = `Relay URL,Latitude,Longitude
relay.damus.io,37.7621,-122.3971
nostr-pub.wellorder.net,45.5229,-122.9898`;
        const parsed = GeoRelayDirectory.parseCSV(sampleCSV);
        results.push(`✓ CSV parsing test: ${parsed.length} entries parsed`);
        
        // Test 6: Location-based relay selection (manual trigger)
        results.push("");
        results.push("📍 Click 'Check Location' button to find relays near you");
        
      } catch (error) {
        results.push(`✗ Error during testing: ${error}`);
      }
      
      setTestResults(results);
      setIsLoading(false);
    };

    runTests();
  }, []);

  const checkLocation = async () => {
    if (!("geolocation" in navigator)) {
      setLocationPermission("unavailable");
      return;
    }

    setLocationPermission("prompting");
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });
      
      const { latitude, longitude } = position.coords;
      setCurrentLocation({ lat: latitude, lon: longitude });
      setLocationPermission("granted");
      
      // Find closest relays to current location
      const directory = GeoRelayDirectory.shared as unknown as GeoRelayDirectoryExtended;
      const closestRelays = directory.closestRelaysByCoords(latitude, longitude, 3);
      
      const newResults = [...testResults];
      newResults.push("");
      newResults.push(`📍 Your current location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      newResults.push(`✓ Found ${closestRelays.length} closest relays to your location:`);
      
      closestRelays.forEach((relay: string, i: number) => {
        newResults.push(`  ${i + 1}. ${relay}`);
      });
      
      // Calculate distances
      newResults.push("");
      newResults.push("📏 Distances to relays:");
      closestRelays.forEach((relay: string, i: number) => {
        const host = relay.replace(/^wss:\/\//, "");
        const relayEntry = directory.entries.find((entry) => entry.host === host);
        if (relayEntry) {
          const distance = directory.haversineKm(latitude, longitude, relayEntry.lat, relayEntry.lon);
          newResults.push(`  ${i + 1}. ${host}: ${distance.toFixed(1)} km`);
        }
      });
      
      setTestResults(newResults);
      
    } catch (error) {
      setLocationPermission("denied");
      const newResults = [...testResults];
      newResults.push("");
      newResults.push(`✗ Location error: ${error}`);
      setTestResults(newResults);
    }
  };

  if (activeTab === 'radio') {
    return (
      <div className="w-full">
        <div className="mb-4">
          <button
            onClick={() => setActiveTab('relay')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            ← Back to Relay Tests
          </button>
        </div>
        <GeohashRadioFinder />
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4">Loading GeoRelayDirectory tests...</div>;
  }

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('relay')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'relay'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔌 GeoRelay Tests
          </button>
          <button
            onClick={() => setActiveTab('radio')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'radio'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🌍 Geohash Radio Finder
          </button>
        </nav>
      </div>

      {/* Relay Test Content */}
      <div className="p-4 bg-gray-100 rounded-lg max-w-md">
        <h2 className="text-xl font-bold mb-4">GeoRelay Test</h2>
        
        {/* Location Check Button */}
        <div className="mb-4">
          <button
            onClick={checkLocation}
            disabled={locationPermission === "prompting"}
            className={`px-4 py-2 rounded text-sm font-medium ${
              locationPermission === "prompting"
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {locationPermission === "prompting" && "Checking..."}
            {locationPermission === "granted" && "📍 Check Location Again"}
            {locationPermission === "denied" && "📍 Retry Location"}
            {locationPermission === "unavailable" && "📍 Check My Location"}
          </button>
          
          {currentLocation && (
            <div className="mt-2 text-xs text-gray-600">
              Current: {currentLocation.lat.toFixed(4)}, {currentLocation.lon.toFixed(4)}
            </div>
          )}
        </div>
        
        {/* Test Results */}
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {testResults.map((result, index) => (
            <div key={index} className="text-xs font-mono">
              {result}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
