import { useState, useEffect } from "react";
import { getHierarchicalCounts } from "../../utils/geohashUtils";
import { getCachedLocationFromGeohash, LocationInfo } from "../../utils/geocoder";
import { parseSearchQuery, addGeohashToSearch } from "../../utils/searchParser";
import { HierarchyItem } from "./HierarchyItem";
import { globalStyles } from "../../styles";

interface EventHierarchyProps {
  searchText: string;
  allEventsByGeohash: Map<string, number>;
  onSearch: (searchText: string) => void;
  theme?: "matrix" | "material";
}

const styles = globalStyles["EventHierarchy"];

export function EventHierarchy({
  searchText,
  allEventsByGeohash,
  onSearch,
  theme = "matrix",
}: EventHierarchyProps) {
  const [locationNames, setLocationNames] = useState<Map<string, LocationInfo>>(new Map());
  const t = styles[theme];

  const parsedSearch = parseSearchQuery(searchText);
  const primarySearchGeohash =
    parsedSearch.geohashes.length > 0 ? parsedSearch.geohashes[0] : "";

  const hierarchicalCounts = primarySearchGeohash
    ? getHierarchicalCounts(
        primarySearchGeohash.toLowerCase(),
        allEventsByGeohash
      )
    : { direct: 0, total: 0 };

  useEffect(() => {
    const loadLocationNames = async () => {
      const geohashesToLookup = primarySearchGeohash
        ? [primarySearchGeohash.toLowerCase()]
        : Array.from(allEventsByGeohash.keys())
            .map((hash) => hash.charAt(0))
            .filter((char, index, arr) => arr.indexOf(char) === index);

      for (const geohash of geohashesToLookup) {
        if (!locationNames.has(geohash)) {
          const location = await getCachedLocationFromGeohash(geohash);
          if (location) {
            setLocationNames((prev) => new Map(prev).set(geohash, location));
          }
        }
      }
    };

    loadLocationNames();
  }, [primarySearchGeohash, allEventsByGeohash, locationNames]);

  if (!primarySearchGeohash) {
    const topLevelCounts = new Map<string, number>();
    for (const [geohash, count] of allEventsByGeohash.entries()) {
      const firstChar = geohash.charAt(0);
      topLevelCounts.set(firstChar, (topLevelCounts.get(firstChar) || 0) + count);
    }

    if (topLevelCounts.size === 0) return null;

    return (
      <div className={t.container}>
        <div className={t.list}>
          {Array.from(topLevelCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([geohash, count]) => (
              <HierarchyItem
                key={geohash}
                geohash={geohash}
                count={count}
                location={locationNames.get(geohash)?.formatted}
                onClick={() => onSearch(addGeohashToSearch(searchText, geohash))}
                theme={theme}
              />
            ))}
        </div>
      </div>
    );
  }

  const buildHierarchy = (prefix: string) => {
    const hierarchy = new Map<string, { direct: number; children: Map<string, any> }>();
    for (const [geohash, count] of allEventsByGeohash.entries()) {
      if (geohash.startsWith(prefix) && geohash !== prefix) {
        let currentPath = prefix;
        let currentLevel = hierarchy;
        for (let i = prefix.length; i < geohash.length; i++) {
          const nextChar = geohash[i];
          const nextPath = currentPath + nextChar;
          if (!currentLevel.has(nextChar)) {
            currentLevel.set(nextChar, { direct: 0, children: new Map() });
          }
          const node = currentLevel.get(nextChar)!;
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

  const getTotalCount = (node: any): number => {
    let total = node.direct;
    for (const child of node.children.values()) {
      total += getTotalCount(child);
    }
    return total;
  };

  const renderHierarchy = (
    hierarchy: Map<string, any>,
    prefix: string,
    depth: number = 0
  ): JSX.Element[] => {
    const items: JSX.Element[] = [];
    const sortedEntries = Array.from(hierarchy.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    for (const [char, node] of sortedEntries) {
      const fullPath = prefix + char;
      const hasChildren = node.children.size > 0;
      const totalCount =
        node.direct +
        Array.from(node.children.values()).reduce(
          (sum: number, child: any) => sum + getTotalCount(child),
          0
        );

      items.push(
        <HierarchyItem
          key={fullPath}
          geohash={fullPath}
          count={totalCount}
          location={locationNames.get(fullPath)?.formatted}
          depth={depth}
          onClick={() =>
            onSearch(addGeohashToSearch(searchText, fullPath))
          }
          theme={theme}
        />
      );
      if (hasChildren) {
        items.push(...renderHierarchy(node.children, fullPath, depth + 1));
      }
    }
    return items;
  };

  const hierarchy = buildHierarchy(primarySearchGeohash.toLowerCase());

  return (
    <div className={t.container}>
      <div className={t.list}>
        {hierarchicalCounts.direct > 0 && (
          <HierarchyItem
            geohash={primarySearchGeohash.toLowerCase()}
            count={hierarchicalCounts.direct}
            location={locationNames.get(primarySearchGeohash.toLowerCase())?.formatted}
            onClick={() =>
              onSearch(addGeohashToSearch(searchText, primarySearchGeohash))
            }
            theme={theme}
          />
        )}
        {hierarchy.size > 0 && (
          <div className="mt-4">
            <div className={t.section}>
              SUBREGIONS ({
                hierarchicalCounts.total - hierarchicalCounts.direct
              } events):
            </div>
            <div className="mt-2">
              {renderHierarchy(
                hierarchy,
                primarySearchGeohash.toLowerCase()
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

