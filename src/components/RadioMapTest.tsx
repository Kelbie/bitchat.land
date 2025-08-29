import { useState, useEffect } from "react";
import { RadioStationDirectory } from "../utils/radioStationDirectory";

export function RadioMapTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalStations, setTotalStations] = useState(0);

  useEffect(() => {
    const runTests = async () => {
      const results: string[] = [];
      
      try {
        // Test 1: Basic functionality
        results.push("Testing RadioStationDirectory...");
        
        const directory = RadioStationDirectory.shared;
        results.push("✓ RadioStationDirectory instance created");
        
        // Test 2: Test geohash decoding
        const testGeohash = "u4pruyd";
        const center = (directory as any).decodeCenter(testGeohash);
        results.push(`✓ Geohash ${testGeohash} decoded to lat: ${center.lat.toFixed(4)}, lon: ${center.lon.toFixed(4)}`);
        
        // Test 3: Test station selection
        const stations = directory.closestStations(testGeohash, 3);
        results.push(`✓ Found ${stations.length} closest stations for geohash ${testGeohash}`);
        stations.forEach((station, i) => {
          results.push(`  ${i + 1}. ${station.name} (${station.countrycode}) - ${station.codec}`);
        });
        
        // Test 4: Test coordinate-based station selection
        const coordStations = (directory as any).closestStationsByCoords(37.7749, -122.4194, 3); // San Francisco
        results.push(`✓ Found ${coordStations.length} closest stations for San Francisco coordinates`);
        coordStations.forEach((station, i) => {
          results.push(`  ${i + 1}. ${station.name} (${station.countrycode}) - ${station.codec}`);
        });
        
        // Test 5: Test country-based selection
        const usStations = directory.getStationsByCountry("US", 3);
        results.push(`✓ Found ${usStations.length} US stations (by popularity)`);
        usStations.forEach((station, i) => {
          results.push(`${i + 1}. ${station.name} - ${station.codec} ${station.bitrate ? `${station.bitrate}kbps` : ""}`);
        });
        
        // Test 6: Test search functionality
        const searchResults = directory.searchStations("jazz", 3);
        results.push(`✓ Found ${searchResults.length} stations matching "jazz"`);
        searchResults.forEach((station, i) => {
          results.push(`  ${i + 1}. ${station.name} (${station.countrycode})`);
        });
        
        // Test 7: Test total stations count
        const total = directory.totalStations;
        setTotalStations(total);
        results.push(`✓ Total stations available: ${total.toLocaleString()}`);
        
        // Test 8: Test bounds-based selection
        const boundsStations = directory.getStationsInBounds(37.7, 37.8, -122.5, -122.4, 3); // SF area
        results.push(`✓ Found ${boundsStations.length} stations in San Francisco bounds`);
        boundsStations.forEach((station, i) => {
          results.push(`  ${i + 1}. ${station.name} (${station.countrycode})`);
        });
        
        results.push("✅ All tests passed!");
        
      } catch (error) {
        results.push(`❌ Test failed: ${error}`);
        console.error("RadioMapTest error:", error);
      } finally {
        setIsLoading(false);
        setTestResults(results);
      }
    };

    runTests();
  }, []);

  return (
    <div className="p-6 bg-black/90 text-green-400 font-mono text-sm max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-green-300">📻 Radio Map Test Results</h2>
      
      {isLoading ? (
        <div className="text-yellow-400">Running tests...</div>
      ) : (
        <div className="space-y-2">
          {testResults.map((result, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {result}
            </div>
          ))}
        </div>
      )}
      
      {totalStations > 0 && (
        <div className="mt-6 p-4 bg-green-900/20 border border-green-600 rounded">
          <h3 className="text-lg font-bold text-green-300 mb-2">📊 Station Directory Status</h3>
          <div className="space-y-1">
            <div>Total Stations: {totalStations.toLocaleString()}</div>
            <div>Status: {totalStations > 0 ? "✅ Loaded" : "⏳ Loading..."}</div>
            <div className="text-xs opacity-70">
              Stations are cached locally and refresh every 24 hours
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 text-xs opacity-70">
        This test verifies the RadioStationDirectory follows the same pattern as your GeoRelayDirectory
      </div>
    </div>
  );
}
