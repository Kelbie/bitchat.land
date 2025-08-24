import { useState, useEffect } from "react";
import { getHierarchicalCounts } from "../utils/geohashUtils";
import { getCachedLocationFromGeohash, LocationInfo } from "../utils/geocoder";

interface EventHierarchyProps {
  searchGeohash: string;
  allEventsByGeohash: Map<string, number>;
  onSearch: (geohash: string) => void;
  isMobileView?: boolean;

}

export function EventHierarchy({ 
  searchGeohash, 
  allEventsByGeohash, 
  onSearch,
  isMobileView = false,

}: EventHierarchyProps) {
  const [locationNames, setLocationNames] = useState<Map<string, LocationInfo>>(new Map());

  const hierarchicalCounts = searchGeohash 
    ? getHierarchicalCounts(searchGeohash.toLowerCase(), allEventsByGeohash)
    : { direct: 0, total: 0 };

  // Load location names for geohashes
  useEffect(() => {
    const loadLocationNames = async () => {
      const geohashesToLookup = searchGeohash 
        ? [searchGeohash.toLowerCase()]
        : Array.from(allEventsByGeohash.keys()).map(hash => hash.charAt(0)).filter((char, index, arr) => arr.indexOf(char) === index);

      for (const geohash of geohashesToLookup) {
        if (!locationNames.has(geohash)) {
          const location = await getCachedLocationFromGeohash(geohash);
          if (location) {
            setLocationNames(prev => new Map(prev).set(geohash, location));
          }
        }
      }
    };

    loadLocationNames();
  }, [searchGeohash, allEventsByGeohash, locationNames]);

  // When no search is active, show all top-level geohashes
  if (!searchGeohash) {
    const topLevelCounts = new Map<string, number>();
    
    // Aggregate all events by first character
    for (const [geohash, count] of allEventsByGeohash.entries()) {
      const firstChar = geohash.charAt(0);
      topLevelCounts.set(firstChar, (topLevelCounts.get(firstChar) || 0) + count);
    }

    if (topLevelCounts.size === 0) {
      return null;
    }

    return (
      <div
        style={{
          position: isMobileView ? "relative" : "absolute",
          top: isMobileView ? "0" : "10px",
          left: isMobileView ? "0" : "10px",
          width: isMobileView ? "100%" : "auto",
          height: isMobileView ? "100%" : "auto",
          zIndex: 1000,
          background: isMobileView ? "#000000" : "rgba(0, 0, 0, 0.8)",
          border: isMobileView ? "none" : "1px solid #003300",
          borderRadius: "0px",
          fontSize: isMobileView ? "14px" : "12px",
          color: "#00ff00",
          fontFamily: "Courier New, monospace",
          maxWidth: isMobileView ? "100%" : "calc(50vw - 20px)",
          maxHeight: isMobileView ? "100%" : "calc(100vh - 20px)",
          display: "flex",
          flexDirection: "column",
          overflowX: "hidden",
          wordWrap: "break-word",
          margin: isMobileView ? "0" : "auto",
        }}
      >
        {!isMobileView && (
          <div
            style={{
              position: "sticky",
              top: 0,
              backgroundColor: "rgba(0, 0, 0, 0.95)",
              border: "1px solid #003300",
              borderBottom: "2px solid #00ff00",
              padding: "10px",
              margin: "-1px -1px 0 -1px",
              color: "#00aa00",
              fontWeight: "bold",
              zIndex: 10,
            }}
          >
            <div style={{ 
              marginBottom: "5px",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              textShadow: "0 0 10px rgba(0, 255, 0, 0.5)"
            }}>
              ALL GEOHASH REGIONS
            </div>
            <div style={{ 
              fontSize: "10px", 
              color: "#00ff00",
              background: "rgba(0, 255, 0, 0.1)",
              padding: "2px 4px",
              borderRadius: "4px",
              border: "1px solid rgba(0, 255, 0, 0.3)",
              display: "inline-block"
            }}>
              TOTAL EVENTS: {Array.from(topLevelCounts.values()).reduce((sum, count) => sum + count, 0)}
            </div>
          </div>
        )}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isMobileView ? "20px 20px 20px 20px" : "10px",
            paddingTop: isMobileView ? "20px" : "8px"
          }}
        >
          {Array.from(topLevelCounts.entries())
            .sort((a, b) => b[1] - a[1]) // Sort by event count descending
            .map(([geohash, count]) => {
              const location = locationNames.get(geohash);
              return (
                <div
                  key={geohash}
                  style={{
                    padding: isMobileView ? "16px 20px" : "12px 16px",
                    marginBottom: isMobileView ? "12px" : "8px",
                    background: "linear-gradient(135deg, rgba(0, 50, 0, 0.4), rgba(0, 30, 0, 0.2))",
                    border: "1px solid rgba(0, 204, 0, 0.3)",
                    borderLeft: "4px solid #00ff00",
                    borderRadius: isMobileView ? "8px" : "4px",
                    cursor: "pointer",
                    fontFamily: "Courier New, monospace",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                  }}
                  onClick={() => onSearch(geohash)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 80, 0, 0.5), rgba(0, 50, 0, 0.3))";
                    e.currentTarget.style.borderColor = "rgba(0, 204, 0, 0.6)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 255, 0, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 50, 0, 0.4), rgba(0, 30, 0, 0.2))";
                    e.currentTarget.style.borderColor = "rgba(0, 204, 0, 0.3)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: isMobileView ? "8px" : "4px",
                    flexWrap: "wrap",
                    gap: "8px"
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span style={{
                        fontSize: isMobileView ? "16px" : "12px",
                        color: "#00ff00",
                        fontWeight: "bold",
                        background: "rgba(0, 255, 0, 0.1)",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontFamily: "monospace"
                      }}>
                        #{geohash.toUpperCase()}
                      </span>
                      <span style={{ 
                        fontSize: isMobileView ? "12px" : "10px", 
                        color: "#00aa00",
                        background: "rgba(0, 0, 0, 0.5)",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontFamily: "monospace"
                      }}>
                        [{count} events]
                      </span>
                    </div>
                  </div>
                  {location && (
                    <div style={{ 
                      fontSize: isMobileView ? "13px" : "11px", 
                      color: "#00dd00",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      lineHeight: isMobileView ? "1.4" : "1.3",
                      letterSpacing: "0.3px"
                    }}>
                      {location.formatted}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  if (hierarchicalCounts.direct === 0 && hierarchicalCounts.total === 0) {
    return null;
  }

  // Build complete hierarchy tree
  const buildHierarchy = (prefix: string) => {
    const hierarchy = new Map<
      string,
      { direct: number; children: Map<string, any> }
    >();

    for (const [geohash, count] of allEventsByGeohash.entries()) {
      if (geohash.startsWith(prefix) && geohash !== prefix) {
        // Build path from prefix to this geohash
        let currentPath = prefix;
        let currentLevel = hierarchy;

        for (let i = prefix.length; i < geohash.length; i++) {
          const nextChar = geohash[i];
          const nextPath = currentPath + nextChar;

          if (!currentLevel.has(nextChar)) {
            currentLevel.set(nextChar, {
              direct: 0,
              children: new Map(),
            });
          }

          const node = currentLevel.get(nextChar)!;

          // If this is the final character of the geohash, add direct count
          if (i === geohash.length - 1) {
            node.direct += count;
          }

          currentPath = nextPath;
          currentLevel = node.children;
        }
      }
    }

    return hierarchy;
  };

  // Render hierarchy recursively
  const renderHierarchy = (
    hierarchy: Map<string, any>,
    prefix: string,
    depth: number = 0
  ) => {
    const items: JSX.Element[] = [];
    const sortedEntries = Array.from(hierarchy.entries()).sort(
      (a, b) => a[0].localeCompare(b[0])
    );

    for (const [char, node] of sortedEntries) {
      const fullPath = prefix + char;
      // const indent = ">".repeat(depth + 1) + " "; // Currently unused
      const hasChildren = node.children.size > 0;
      const totalCount =
        node.direct +
        Array.from(node.children.values()).reduce(
          (sum: number, child: any) => {
            return sum + getTotalCount(child);
          },
          0
        );

      items.push(
        <div
          key={fullPath}
          style={{
            marginLeft: isMobileView ? `${depth * 16}px` : `${depth * 12}px`,
            marginBottom: isMobileView ? "8px" : "6px",
            padding: isMobileView ? "12px 16px" : "8px 12px",
            background: depth % 2 === 0 
              ? "linear-gradient(135deg, rgba(0, 40, 0, 0.4), rgba(0, 25, 0, 0.2))"
              : "linear-gradient(135deg, rgba(0, 35, 0, 0.4), rgba(0, 20, 0, 0.2))",
            border: "1px solid rgba(0, 150, 0, 0.3)",
            borderLeft: `4px solid ${depth === 0 ? "#00ff00" : depth === 1 ? "#00cc00" : "#00aa00"}`,
            borderRadius: isMobileView ? "6px" : "4px",
            cursor: "pointer",
            fontFamily: "Courier New, monospace",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
          }}
          onClick={() => onSearch(fullPath)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = depth % 2 === 0
              ? "linear-gradient(135deg, rgba(0, 70, 0, 0.5), rgba(0, 45, 0, 0.3))"
              : "linear-gradient(135deg, rgba(0, 65, 0, 0.5), rgba(0, 40, 0, 0.3))";
            e.currentTarget.style.borderColor = "rgba(0, 150, 0, 0.6)";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 3px 8px rgba(0, 255, 0, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = depth % 2 === 0 
              ? "linear-gradient(135deg, rgba(0, 40, 0, 0.4), rgba(0, 25, 0, 0.2))"
              : "linear-gradient(135deg, rgba(0, 35, 0, 0.4), rgba(0, 20, 0, 0.2))";
            e.currentTarget.style.borderColor = "rgba(0, 150, 0, 0.3)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.2)";
          }}
        >
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: isMobileView ? "4px" : "2px",
            gap: "8px"
          }}>
            <span style={{
              fontSize: isMobileView ? "14px" : "11px",
              color: depth === 0 ? "#00ff00" : "#00cc00",
              fontWeight: depth === 0 ? "bold" : "normal",
              background: "rgba(0, 255, 0, 0.1)",
              padding: "2px 6px",
              borderRadius: "3px",
              fontFamily: "monospace"
            }}>
              #{fullPath.toUpperCase()}
            </span>
            <span style={{
              fontSize: isMobileView ? "11px" : "9px",
              color: "#00aa00",
              background: "rgba(0, 0, 0, 0.5)",
              padding: "2px 6px",
              borderRadius: "3px",
              fontFamily: "monospace"
            }}>
              [{totalCount}]
            </span>
          </div>
          {locationNames.get(fullPath) && (
            <div style={{ 
              fontSize: isMobileView ? "12px" : "10px", 
              color: "#00dd00",
              fontFamily: "system-ui, -apple-system, sans-serif",
              lineHeight: "1.3",
              letterSpacing: "0.3px"
            }}>
              {locationNames.get(fullPath)?.formatted}
            </div>
          )}
        </div>
      );

      // Recursively render children
      if (hasChildren) {
        items.push(
          ...renderHierarchy(node.children, fullPath, depth + 1)
        );
      }
    }

    return items;
  };

  // Helper to calculate total count for a node
  const getTotalCount = (node: any): number => {
    let total = node.direct;
    for (const child of node.children.values()) {
      total += getTotalCount(child);
    }
    return total;
  };

  const hierarchy = buildHierarchy(searchGeohash.toLowerCase());

  return (
    <div
      style={{
        position: isMobileView ? "relative" : "absolute",
        top: isMobileView ? "0" : "10px",
        left: isMobileView ? "0" : "10px",
        width: isMobileView ? "100%" : "auto",
        height: isMobileView ? "100%" : "auto",
        zIndex: 1000,
        background: isMobileView ? "#000000" : "rgba(0, 0, 0, 0.8)",
        border: isMobileView ? "none" : "1px solid #003300",
        borderRadius: "0px",
        fontSize: isMobileView ? "14px" : "12px",
        color: "#00ff00",
        fontFamily: "Courier New, monospace",
        maxWidth: isMobileView ? "100%" : "calc(50vw - 20px)",
        maxHeight: isMobileView ? "100%" : "calc(100vh - 20px)",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        wordWrap: "break-word",
        margin: isMobileView ? "0" : "auto",
      }}
    >
      {!isMobileView && (
        <div
          style={{
            position: "sticky",
            top: 0,
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            border: "1px solid #003300",
            borderBottom: "2px solid #00ff00",
            padding: "10px",
            margin: "-1px -1px 0 -1px",
            color: "#00aa00",
            fontWeight: "bold",
            zIndex: 10,
          }}
        >
          <div style={{ 
            marginBottom: "5px",
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "1px",
            textShadow: "0 0 10px rgba(0, 255, 0, 0.5)"
          }}>
            EVENTS IN "{searchGeohash.toUpperCase()}"
          </div>
          <div style={{ 
            fontSize: "10px", 
            color: "#00ff00",
            background: "rgba(0, 255, 0, 0.1)",
            padding: "2px 4px",
            borderRadius: "4px",
            border: "1px solid rgba(0, 255, 0, 0.3)",
            display: "inline-block"
          }}>
            DIRECT: {hierarchicalCounts.direct} | TOTAL: {hierarchicalCounts.total}
          </div>
        </div>
      )}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: isMobileView ? "20px 20px 20px 20px" : "10px",
          paddingTop: isMobileView ? "20px" : "8px"
        }}
      >
        {/* Current Geohash Display */}
        {hierarchicalCounts.direct > 0 && (
          <div
            style={{
              padding: isMobileView ? "16px 20px" : "12px 16px",
              marginBottom: isMobileView ? "16px" : "12px",
              background: "linear-gradient(135deg, rgba(0, 80, 0, 0.5), rgba(0, 50, 0, 0.3))",
              border: "2px solid rgba(0, 255, 0, 0.4)",
              borderLeft: "4px solid #00ff00",
              borderRadius: isMobileView ? "8px" : "6px",
              cursor: "pointer",
              fontFamily: "Courier New, monospace",
              transition: "all 0.2s ease",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            }}
            onClick={() => onSearch(searchGeohash)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 120, 0, 0.6), rgba(0, 80, 0, 0.4))";
              e.currentTarget.style.borderColor = "rgba(0, 255, 0, 0.7)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 255, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 80, 0, 0.5), rgba(0, 50, 0, 0.3))";
              e.currentTarget.style.borderColor = "rgba(0, 255, 0, 0.4)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: isMobileView ? "8px" : "4px",
              flexWrap: "wrap",
              gap: "8px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span style={{
                  fontSize: isMobileView ? "18px" : "14px",
                  color: "#00ff00",
                  fontWeight: "bold",
                  background: "rgba(0, 255, 0, 0.15)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontFamily: "monospace"
                }}>
                  #{searchGeohash.toUpperCase()}
                </span>
                <span style={{
                  fontSize: isMobileView ? "12px" : "10px",
                  color: "#00ff00",
                  background: "rgba(0, 0, 0, 0.6)",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  CURRENT
                </span>
              </div>
              <span style={{ 
                fontSize: isMobileView ? "12px" : "10px", 
                color: "#00aa00",
                background: "rgba(0, 0, 0, 0.5)",
                padding: "2px 6px",
                borderRadius: "3px",
                fontFamily: "monospace"
              }}>
                [{hierarchicalCounts.direct} events]
              </span>
            </div>
            {locationNames.get(searchGeohash.toLowerCase()) && (
              <div style={{ 
                fontSize: isMobileView ? "14px" : "11px", 
                color: "#00dd00",
                fontFamily: "system-ui, -apple-system, sans-serif",
                lineHeight: "1.4",
                letterSpacing: "0.3px"
              }}>
                {locationNames.get(searchGeohash.toLowerCase())?.formatted}
              </div>
            )}
          </div>
        )}

        {hierarchy.size > 0 && (
          <div>
            <div
              style={{
                fontSize: "10px",
                color: "#00aa00",
                marginBottom: "8px",
                fontWeight: "bold",
                borderBottom: "1px solid rgba(0, 170, 0, 0.3)",
                paddingBottom: "4px",
              }}
            >
              SUBREGIONS ({hierarchicalCounts.total - hierarchicalCounts.direct} events):
            </div>
            <div style={{ marginTop: "6px" }}>
              {renderHierarchy(hierarchy, searchGeohash.toLowerCase())}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
