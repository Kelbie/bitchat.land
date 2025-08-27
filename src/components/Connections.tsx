import { useState, useEffect, useRef } from "react";
import { GeoRelayDirectory } from "../utils/geoRelayDirectory";
import { ThemedButton } from "./ThemedButton";
import { DEFAULT_RELAYS } from "../constants/projections";

interface ConnectionsProps {
  theme: "matrix" | "material";
  connectedRelays: string[];
  connectionStatus: string;
  onToggleNostr: () => void;
  nostrEnabled: boolean;
  getGeorelayRelays: (geohash: string, count: number) => string[];
  connectToGeoRelays: () => Promise<string[]>;
  disconnectFromGeoRelays: () => Promise<void>;
}

export function Connections({
  theme,
  connectedRelays,
  connectionStatus,
  onToggleNostr,
  nostrEnabled,
  connectToGeoRelays: hookConnectToGeoRelays,
  disconnectFromGeoRelays: hookDisconnectFromGeoRelays,
}: ConnectionsProps) {
  const [locationPermission, setLocationPermission] = useState<
    "granted" | "denied" | "prompting" | "unavailable"
  >("unavailable");
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [geoRelayStatus, setGeoRelayStatus] = useState<string>("");
  const [isConnectingToGeoRelays, setIsConnectingToGeoRelays] = useState(false);
  // Determine if georelays are enabled by checking if connected relays include non-default relays
  const isGeorelayEnabled = connectedRelays.some(relay => !DEFAULT_RELAYS.includes(relay));
  
  // Debounce ref to prevent rapid clicking
  const lastClickTimeRef = useRef<number>(0);

  const styles = {
    matrix: {
      container:
        "bg-black/90 text-green-500 border border-green-500/30 rounded-lg p-3 shadow-lg",
      title: "text-[#00aa00] text-xs mb-1 font-mono font-bold",
      status: "text-xs font-mono text-green-400 text-center",
      statusConnected: "text-green-400",
      statusDisconnected: "text-red-400",
      statusConnecting: "text-yellow-400",
      relayButton:
        "w-full text-left px-2 py-1 text-xs font-mono border border-green-500/30 rounded hover:bg-green-500/20 transition-colors",
      relayButtonActive:
        "w-full text-left px-2 py-1 text-xs font-mono border border-green-500 rounded bg-green-500/20",
      actionButton:
        "w-full text-center px-3 py-2 text-xs font-bold",
      actionButtonDisabled:
        "w-full bg-gray-600 text-gray-400 px-3 py-2 rounded text-xs font-mono cursor-not-allowed font-bold",
      geoRelayButton:
        "w-full text-center px-3 py-2 text-xs font-bold",
      geoRelayButtonDisabled:
        "w-full bg-gray-600 text-gray-400 px-3 py-2 rounded text-xs font-mono cursor-not-allowed font-bold",
      locationInfo: "text-xs text-green-400 mt-2 text-center",
    },
    material: {
      container:
        "bg-white/95 text-gray-800 border border-gray-300 rounded-lg p-3 shadow-lg",
      title: "text-blue-600 text-xs mb-1 font-semibold",
      status: "text-xs text-gray-600 text-center",
      statusConnected: "text-green-600",
      statusDisconnected: "text-red-600",
      statusConnecting: "text-yellow-600",
      relayButton:
        "w-full text-left px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 transition-colors",
      relayButtonActive:
        "w-full text-left px-2 py-1 text-xs border border-blue-500 rounded bg-blue-50",
      actionButton:
        "w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-xs font-medium transition-colors font-bold",
      actionButtonDisabled:
        "w-full bg-gray-400 text-gray-600 px-3 py-2 rounded text-xs font-medium cursor-not-allowed font-bold",
      geoRelayButton:
        "w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-xs font-medium transition-colors font-bold",
      geoRelayButtonDisabled:
        "w-full bg-gray-400 text-gray-600 px-3 py-2 rounded text-xs font-medium cursor-not-allowed font-bold",
      locationInfo: "text-xs text-gray-600 mt-2 text-center",
    },
  };

  const t = styles[theme];

  const getStatusClass = (status: string) => {
    if (status.includes("Connected")) return t.statusConnected;
    if (status.includes("Connecting")) return t.statusConnecting;
    return t.statusDisconnected;
  };

  const connectToGeoRelays = async () => {
    // Debounce rapid clicks - prevent clicking more than once every 500ms
    const now = Date.now();
    if (now - lastClickTimeRef.current < 500) {
      console.log("Ignoring rapid click");
      return;
    }
    lastClickTimeRef.current = now;
    
    if (!("geolocation" in navigator)) {
      setGeoRelayStatus("Geolocation not supported");
      return;
    }

    // If georelay is already enabled, disable it
    if (isGeorelayEnabled) {
      setGeoRelayStatus("Disabling georelay...");
      setLocationPermission("unavailable");
      
      // Call the hook to disconnect from georelays
      if (hookDisconnectFromGeoRelays) {
        try {
          await hookDisconnectFromGeoRelays();
          setGeoRelayStatus("Georelay disabled");
        } catch (error) {
          setGeoRelayStatus(`Error disabling: ${error}`);
        }
      }
      return;
    }

    // Enable georelay
    setLocationPermission("prompting");
    setIsConnectingToGeoRelays(true);
    setGeoRelayStatus("Getting location...");

    try {
      // Use the hook method to connect to georelays
      const geoRelays = await hookConnectToGeoRelays();

      if (geoRelays.length > 0) {
        setLocationPermission("granted");
        setGeoRelayStatus(
          `Connected to ${geoRelays.length} georelays near you`
        );
      } else {
        setGeoRelayStatus("No georelays available");
        setLocationPermission("unavailable");
      }
    } catch (error) {
      setLocationPermission("denied");
      setGeoRelayStatus(`Location error: ${error}`);
    } finally {
      setIsConnectingToGeoRelays(false);
    }
  };

  return (
    <div className={`${t.container} w-48`}>
      <div className={t.title}>{connectionStatus}</div>

      {/* Connected Relays List */}
      <div className="space-y-2 mb-4">
        {connectedRelays.map((relay, index) => {
          // Hide georelay names for privacy - show generic labels
          const isGeorelay = !DEFAULT_RELAYS.includes(relay);
          const displayName = isGeorelay
            ? `Georelay ${Math.abs(DEFAULT_RELAYS.length - index - 1)}`
            : relay.replace(/^wss:\/\//, "");

          return (
            <div key={index} className="flex items-center gap-2 align-middle">
              <div className={`w-3 h-3 rounded-full ${nostrEnabled ? "bg-green-400" : "bg-red-400"}`}></div>
              <span className={`text-xs font-mono ${t.status}`}>{index + 1}. {displayName}</span>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <ThemedButton
          as="button"
          onClick={onToggleNostr}
          disabled={false}
          className={t.actionButton}
        >
          {nostrEnabled ? "DISCONNECT" : "CONNECT"}
        </ThemedButton>

        <ThemedButton
          as="button"
          onClick={connectToGeoRelays}
          disabled={
            isConnectingToGeoRelays || locationPermission === "prompting"
          }
          className={isConnectingToGeoRelays ? t.actionButtonDisabled : t.geoRelayButton}
        >
          {isConnectingToGeoRelays 
            ? "CONNECTING..." 
            : isGeorelayEnabled 
              ? "DISABLE GEORELAY ✓" 
              : "USE GEORELAY"
          }
        </ThemedButton>
        <ThemedButton
          // as="a"
          onClick={() => {
            window.open("https://primal.net/p/nprofile1qqsvvullpd0j9rltp2a3qqvgy9udf3vgh389p7zhzu65fd258dz5lqg9ryan5", "_blank");
          }}
          className={t.actionButton}
        >
          Follow Kelbie
        </ThemedButton>
      </div>
    </div>
  );
}
