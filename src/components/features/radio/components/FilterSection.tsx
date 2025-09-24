import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { ToggleButton } from "@/components/ui/base";
import { capitalizeFirst } from "@/utils/stringUtils";
import { FilterSectionProps } from "@/types/app";
import { VStack, HStack } from "@/components/ui/layout/Layout";

const variants = cva("", {
  variants: {
    type: {
      header: "text-lg font-semibold",
      clearButton: "text-sm px-3 py-1 rounded-full border transition-colors",
      summary: "mb-3 text-sm",
      count: "mt-3 text-sm",
    },
    theme: {
      matrix: "",
      material: "",
    },
  },
  compoundVariants: [
    { type: "header", theme: "matrix", className: "text-green-400" },
    { type: "header", theme: "material", className: "text-gray-800" },
    { type: "clearButton", theme: "matrix", className: "text-green-400/70 border-green-400/30 hover:border-green-400 hover:text-green-400" },
    { type: "clearButton", theme: "material", className: "text-gray-600 border-gray-300 hover:border-gray-400 hover:text-gray-800" },
    { type: "summary", theme: "matrix", className: "text-green-400/70" },
    { type: "summary", theme: "material", className: "text-gray-600" },
    { type: "count", theme: "matrix", className: "text-green-400/70" },
    { type: "count", theme: "material", className: "text-gray-600" },
  ],
});

export function FilterSection({ theme, data, state, actions }: FilterSectionProps) {
  const { allTags, tagPopularity, allCountries, filteredStationsCount, totalStationsCount } = data;
  const { selectedTags, selectedCountries } = state;
  const { onTagToggle, onClearTags, onCountryToggle, onClearCountries } = actions;

  if (allTags.length === 0) return null;

  const totalVotes = Object.values(tagPopularity).reduce((sum, tag) => sum + tag.totalVotes, 0);
  const totalStations = Object.values(tagPopularity).reduce((sum, tag) => sum + tag.stationCount, 0);

  const FilterGroup = ({ title, items, selectedItems, onToggle, onClear, showBadge = false }: {
    title: string;
    items: string[];
    selectedItems: Set<string>;
    onToggle: (item: string) => void;
    onClear: () => void;
    showBadge?: boolean;
  }) => (
    <VStack gap="3">
      <HStack justify="between" align="center">
        <h3 className={cn(variants({ type: "header", theme }))}>{title}</h3>
        {selectedItems.size > 0 && (
          <button onClick={onClear} className={cn(variants({ type: "clearButton", theme }))}>
            Clear All
          </button>
        )}
      </HStack>
      
      {showBadge && (
        <div className={cn(variants({ type: "summary", theme }))}>
          Tags ordered by popularity • Total votes: {totalVotes.toLocaleString()} • Total stations: {totalStations}
        </div>
      )}

      <div className="h-30 overflow-x-auto">
        <VStack gap="2">
          {showBadge ? [
            <HStack key="top" gap="2">
              {items.slice(0, Math.ceil(items.length / 2)).map(item => (
                <ToggleButton
                  key={item}
                  onClick={() => onToggle(item)}
                  theme={theme}
                  isSelected={selectedItems.has(item)}
                  badge={tagPopularity[item]?.totalVotes}
                  title={`${tagPopularity[item]?.totalVotes} votes • ${tagPopularity[item]?.stationCount} stations`}
                >
                  {capitalizeFirst(item)}
                </ToggleButton>
              ))}
            </HStack>,
            <HStack key="bottom" gap="2">
              {items.slice(Math.ceil(items.length / 2)).map(item => (
                <ToggleButton
                  key={item}
                  onClick={() => onToggle(item)}
                  theme={theme}
                  isSelected={selectedItems.has(item)}
                  badge={tagPopularity[item]?.totalVotes}
                  title={`${tagPopularity[item]?.totalVotes} votes • ${tagPopularity[item]?.stationCount} stations`}
                >
                  {capitalizeFirst(item)}
                </ToggleButton>
              ))}
            </HStack>
          ] : (
            <HStack gap="2">
              {items.map(item => (
                <ToggleButton
                  key={item}
                  onClick={() => onToggle(item)}
                  theme={theme}
                  isSelected={selectedItems.has(item)}
                >
                  {item}
                </ToggleButton>
              ))}
            </HStack>
          )}
        </VStack>
      </div>
    </VStack>
  );

  return (
    <VStack gap="6">
      <FilterGroup
        title="Filter by Tags"
        items={allTags}
        selectedItems={selectedTags}
        onToggle={onTagToggle}
        onClear={onClearTags}
        showBadge
      />
      
      <FilterGroup
        title="Filter by Countries"
        items={allCountries.map(c => c.countryName)}
        selectedItems={new Set(allCountries.filter(c => selectedCountries.has(c.countryCode)).map(c => c.countryName))}
        onToggle={(name) => onCountryToggle(allCountries.find(c => c.countryName === name)?.countryCode || '')}
        onClear={onClearCountries}
      />

      <div className={cn(variants({ type: "count", theme }))}>
        Showing {filteredStationsCount} of {totalStationsCount} stations
      </div>
    </VStack>
  );
}
