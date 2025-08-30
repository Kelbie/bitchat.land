import { useState } from "react";
import { ThemedButton } from "../common/ThemedButton";

import { globalStyles } from "../../styles";

export const truncate = (value: string, options: { length: number }): string => {
  if (value.length > options.length) {
    return value.slice(0, options.length) + "...";
  }
  return value;
};

interface ConnectionsProps {
  theme: "matrix" | "material";
  connectedRelays: Array<{url: string, geohash: string}>;
  connectionStatus: string;
  onToggleNostr: () => void;
  nostrEnabled: boolean;
}

export function Connections({
  theme,
  connectedRelays,
  connectionStatus,
  onToggleNostr,
  nostrEnabled,
}: ConnectionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const styles = globalStyles["Connections"];

  const t = styles[theme];


  return (
    <div className={`${t.container} w-48`}>
      <div className={t.title}>{connectionStatus}</div>

      {/* Connected Relays List */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-mono ${t.status}`}>Relays ({connectedRelays.length})</span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-xs p-1 rounded hover:bg-opacity-20 transition-colors ${t.status}`}
            title={isExpanded ? "Collapse details" : "Expand details"}
          >
            {isExpanded ? "−" : "+"}
          </button>
        </div>
        
        {/* Scrollable relay list with max height */}
        <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-2">
          {connectedRelays.map((relay, index) => {
            const host = relay.url.replace(/^wss:\/\//, "");
            const displayName = truncate(host, { length: 12 });

            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-2 align-middle">
                  <div className={`w-3 h-3 rounded-full ${nostrEnabled ? "bg-green-400" : "bg-red-400"}`}></div>
                  <span className={`text-xs font-mono ${t.status}`} title={host}>
                    {index + 1}. {displayName}
                  </span>
                </div>
                
                {isExpanded && (
                  <div className="ml-5 space-y-1 text-xs opacity-70">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📍</span>
                      <span className="font-mono">#{relay.geohash}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">🔗</span>
                      <span className="font-mono text-xs break-all">{relay.url}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
{/* 
        <ThemedButton
          as="button"
          onClick={connectToGeoRelays}
          disabled={isConnectingToGeoRelays}
          className={isConnectingToGeoRelays ? t.actionButtonDisabled : t.geoRelayButton}
        >
          {isConnectingToGeoRelays 
            ? "CONNECTING..." 
            : "USE GEORELAY"
          }
        </ThemedButton> */}
        
        <ThemedButton
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
