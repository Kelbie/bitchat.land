import { useState } from "react";
import { Button } from "@/components/ui";
import { globalStyles } from "@/styles";

export const truncate = (value: string, options: { length: number }): string => {
  if (value.length > options.length) {
    return value.slice(0, options.length) + "...";
  }
  return value;
};

// Simple interface for connection info from useGeoRelays
interface ConnectionInfo {
  relays: Array<{
    url: string;
    geohash: string;
    type: 'initial' | 'local';
    isConnected: boolean; // This is what we actually need to know
  }>;
  status: string;
  isEnabled: boolean;
  totalConnected: number;
  totalConfigured: number;
}

interface ConnectionsProps {
  theme: "matrix" | "material";
  connectionInfo: ConnectionInfo; // Single prop with all connection data
  onToggleNostr: () => void;
}

export function Connections({
  theme,
  connectionInfo,
  onToggleNostr,
}: ConnectionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const styles = globalStyles["Connections"];
  const t = styles[theme];

  const { relays, status, isEnabled, totalConnected, totalConfigured } = connectionInfo;

  return (
    <div className={`${t.container} w-48`}>
      <div className={t.title}>{status}</div>

      {/* Connected Relays List */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-mono ${t.status}`}>
            Relays ({totalConnected}/{totalConfigured})
          </span>
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
          {relays.map((relay, index) => {
            const host = relay.url.replace(/^wss:\/\//, "");
            const displayName = truncate(host, { length: 12 });

            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-2 align-middle">
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      isEnabled && relay.isConnected 
                        ? "bg-green-400" 
                        : isEnabled 
                          ? "bg-yellow-400" 
                          : "bg-red-400"
                    }`}
                    title={
                      isEnabled && relay.isConnected 
                        ? "Connected" 
                        : isEnabled 
                          ? "Connecting..." 
                          : "Disconnected"
                    }
                  />
                  <span 
                    className={`text-xs font-mono ${
                      relay.type === 'local' ? 'text-blue-400' : t.status
                    }`} 
                    title={host}
                  >
                    {index + 1}. {displayName}
                    {relay.type === 'local' && ' (local)'}
                  </span>
                </div>
                
                {isExpanded && (
                  <div className="ml-5 space-y-1 text-xs opacity-70">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📍</span>
                      <span className="font-mono">
                        {relay.geohash ? `#${relay.geohash}` : '#global'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">🔗</span>
                      <span className="font-mono text-xs break-all">{relay.url}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">⚡</span>
                      <span className={`font-mono text-xs ${
                        relay.type === 'local' ? 'text-blue-400' : 'text-gray-400'
                      }`}>
                        {relay.type}
                      </span>
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
        <Button
          as="button"
          onClick={onToggleNostr}
          disabled={false}
          className={t.actionButton}
        >
          {isEnabled ? "DISCONNECT" : "CONNECT"}
        </Button>
        
        <Button
          onClick={() => {
            window.open("https://signal.group/#CjQKICWO018PO3W_PtxDVkUPLfoaY830C0Wkc_Yo4o8rLwm-EhC1lOGktzdGS53xD5ykNg89", "_blank");
          }}
          className={`${t.actionButton} rainbow-button`}
        >
          Join our Signal
        </Button>
      </div>
    </div>
  );
}