import { useState, useEffect } from "react";
import { GeoRelayDirectory } from "../utils/geoRelayDirectory";

export function GeoRelayTest() {
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
        
        const directory = GeoRelayDirectory.shared;
        results.push("✓ GeoRelayDirectory instance created");
        
        // Test 2: Test geohash decoding
        const testGeohash = "u4pruyd";
        const center = (directory as any).decodeCenter(testGeohash);
        results.push(`✓ Geohash ${testGeohash} decoded to lat: ${center.lat.toFixed(4)}, lon: ${center.lon.toFixed(4)}`);
        
        // Test 3: Test relay selection
        const relays = directory.closestRelays(testGeohash, 3);
        results.push(`✓ Found ${relays.length} closest relays for geohash ${testGeohash}`);
        relays.forEach((relay: string, i: number) => {
          results.push(`  ${i + 1}. ${relay}`);
        });
        
        // Test 4: Test coordinate-based relay selection
        const coordRelays = (directory as any).closestRelaysByCoords(37.7749, -122.4194, 3); // San Francisco
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
      const directory = GeoRelayDirectory.shared;
      const closestRelays = (directory as any).closestRelaysByCoords(latitude, longitude, 3);
      
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
        const relayEntry = (directory as any).entries.find((entry: any) => entry.host === host);
        if (relayEntry) {
          const distance = (directory as any).haversineKm(latitude, longitude, relayEntry.lat, relayEntry.lon);
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

  if (isLoading) {
    return <div className="p-4">Loading GeoRelayDirectory tests...</div>;
  }

  return (
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
  );
}
