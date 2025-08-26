import { useState, useEffect } from "react";
import { getHierarchicalCounts } from "../utils/geohashUtils";
import { getCachedLocationFromGeohash, LocationInfo } from "../utils/geocoder";
import { parseSearchQuery, addGeohashToSearch } from "../utils/searchParser";

interface EventHierarchyProps {
  searchText: string;
  allEventsByGeohash: Map<string, number>;
  onSearch: (searchText: string) => void;
}

export function EventHierarchy({
  searchText,
  allEventsByGeohash,
  onSearch,
}: EventHierarchyProps) {
  const [locationNames, setLocationNames] = useState<Map<string, LocationInfo>>(new Map());

  // Parse the search to get geohash filters
  const parsedSearch = parseSearchQuery(searchText);
  const primarySearchGeohash = parsedSearch.geohashes.length > 0 ? parsedSearch.geohashes[0] : "";

  const hierarchicalCounts = primarySearchGeohash 
    ? getHierarchicalCounts(primarySearchGeohash.toLowerCase(), allEventsByGeohash)
    : { direct: 0, total: 0 };

  // Load location names for geohashes
  useEffect(() => {
    const loadLocationNames = async () => {
      const geohashesToLookup = primarySearchGeohash 
        ? [primarySearchGeohash.toLowerCase()]
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
  }, [primarySearchGeohash, allEventsByGeohash, locationNames]);

  // When no search is active, show all top-level geohashes
  if (!primarySearchGeohash) {
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
          position: "relative",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          zIndex: 1000,
          background: "#000000",
          border: "none",
          borderRadius: "0px",
          fontSize: "14px",
          color: "#00ff00",
          fontFamily: "Courier New, monospace",
          maxWidth: "100%",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          overflowX: "hidden",
          wordWrap: "break-word",
          margin: "0",
        }}
      >
        
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 20px 20px 20px",
            paddingTop: "20px"
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
                    padding: "16px 20px",
                    marginBottom: "12px",
                    background: "linear-gradient(135deg, rgba(0, 50, 0, 0.4), rgba(0, 30, 0, 0.2))",
                    border: "1px solid rgba(0, 204, 0, 0.3)",
                    borderLeft: "4px solid #00ff00",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontFamily: "Courier New, monospace",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                  }}
                  onClick={() => onSearch(addGeohashToSearch(searchText, geohash))}
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
                    marginBottom: "8px",
                    flexWrap: "wrap",
                    gap: "8px"
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span style={{
                        fontSize: "16px",
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
                        fontSize: "12px", 
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
                      fontSize: "13px", 
                      color: "#00dd00",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      lineHeight: "1.4",
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
          marginLeft: `${depth * 16}px`,
            marginBottom: "8px",
            padding: "12px 16px",
            background: depth % 2 === 0 
              ? "linear-gradient(135deg, rgba(0, 40, 0, 0.4), rgba(0, 25, 0, 0.2))"
              : "linear-gradient(135deg, rgba(0, 35, 0, 0.4), rgba(0, 20, 0, 0.2))",
            border: "1px solid rgba(0, 150, 0, 0.3)",
            borderLeft: `4px solid ${depth === 0 ? "#00ff00" : depth === 1 ? "#00cc00" : "#00aa00"}`,
            borderRadius: "6px",
            cursor: "pointer",
            fontFamily: "Courier New, monospace",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
          }}
          onClick={() => onSearch(addGeohashToSearch(searchText, fullPath))}
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
            marginBottom: "4px",
            gap: "8px"
          }}>
            <span style={{
              fontSize: "14px",
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
              fontSize: "11px",
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
              fontSize: "12px", 
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

  const hierarchy = buildHierarchy(primarySearchGeohash.toLowerCase());

  return (
    <div
      style={{
        position: "relative",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        zIndex: 1000,
        background: "#000000",
        border: "none",
        borderRadius: "0px",
        fontSize: "14px",
        color: "#00ff00",
        fontFamily: "Courier New, monospace",
        maxWidth: "100%",
        maxHeight: "100%",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        wordWrap: "break-word",
        margin: "0",
      }}
    >
      
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 20px 20px 20px",
          paddingTop: "20px"
        }}
      >
        {/* Current Geohash Display */}
        {hierarchicalCounts.direct > 0 && (
          <div
            style={{
              padding: "16px 20px",
              marginBottom: "16px",
              background: "linear-gradient(135deg, rgba(0, 80, 0, 0.5), rgba(0, 50, 0, 0.3))",
              border: "2px solid rgba(0, 255, 0, 0.4)",
              borderLeft: "4px solid #00ff00",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "Courier New, monospace",
              transition: "all 0.2s ease",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            }}
            onClick={() => onSearch(addGeohashToSearch(searchText, primarySearchGeohash))}
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
              marginBottom: "8px",
              flexWrap: "wrap",
              gap: "8px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span style={{
                  fontSize: "18px",
                  color: "#00ff00",
                  fontWeight: "bold",
                  background: "rgba(0, 255, 0, 0.15)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontFamily: "monospace"
                }}>
                  #{primarySearchGeohash.toUpperCase()}
                </span>
                <span style={{
                  fontSize: "12px",
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
                fontSize: "12px", 
                color: "#00aa00",
                background: "rgba(0, 0, 0, 0.5)",
                padding: "2px 6px",
                borderRadius: "3px",
                fontFamily: "monospace"
              }}>
                [{hierarchicalCounts.direct} events]
              </span>
            </div>
            {locationNames.get(primarySearchGeohash.toLowerCase()) && (
              <div style={{ 
                fontSize: "14px", 
                color: "#00dd00",
                fontFamily: "system-ui, -apple-system, sans-serif",
                lineHeight: "1.4",
                letterSpacing: "0.3px"
              }}>
                {locationNames.get(primarySearchGeohash.toLowerCase())?.formatted}
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
              {renderHierarchy(hierarchy, primarySearchGeohash.toLowerCase())}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
