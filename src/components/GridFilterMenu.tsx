import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { PROV_FULL } from "./map-shared";

const CHINA_PROV_SET = new Set([
  ...Object.keys(PROV_FULL),
  ...Object.values(PROV_FULL),
]);

interface CountryGroup {
  country: string;
  cities: { name: string; count: number }[];
  totalCount: number;
}

export function GridFilterMenu({ open }: { open: boolean }) {
  const items = useFavoriteStore((s) => s.items);
  const gridCountry = useMapStore((s) => s.gridCountry);
  const gridCity = useMapStore((s) => s.gridCity);
  const setGridCountry = useMapStore((s) => s.setGridCountry);
  const setGridCity = useMapStore((s) => s.setGridCity);

  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const countryGroups = useMemo((): CountryGroup[] => {
    const countryMap = new Map<string, Map<string, number>>();
    let uncategorized = 0;
    for (const item of items) {
      if (item.locations.length === 0) {
        uncategorized++;
        continue;
      }
      for (const loc of item.locations) {
        const country = CHINA_PROV_SET.has(loc.province) ? "中国" : loc.province;
        if (!countryMap.has(country)) countryMap.set(country, new Map());
        const cities = countryMap.get(country)!;
        cities.set(loc.name, (cities.get(loc.name) || 0) + 1);
      }
    }
    const groups: CountryGroup[] = Array.from(countryMap.entries())
      .map(([country, cities]) => ({
        country,
        cities: Array.from(cities.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        totalCount: Array.from(cities.values()).reduce((s, c) => s + c, 0),
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
    // Append uncategorized items at the end
    if (uncategorized > 0) {
      groups.push({ country: "未归类", cities: [], totalCount: uncategorized });
    }
    return groups;
  }, [items]);

  const activeHover = hoveredCountry ?? gridCountry;
  const expandedGroup = activeHover
    ? countryGroups.find((g) => g.country === activeHover)
    : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          className="absolute top-[34px] left-0 z-20 flex
                     rounded-xl
                     shadow-[0_4px_24px_rgba(0,0,0,0.12)]
                     overflow-hidden"
          onMouseLeave={() => setHoveredCountry(null)}
        >
          {/* Column 1: Countries — fixed, never shifts */}
          <div className="w-[112px] shrink-0 max-h-[280px] overflow-y-auto scrollbar-hide
                          p-1 bg-white">
            {countryGroups.map((group) => {
              const isSelected = gridCountry === group.country && !gridCity;
              const isHovered = activeHover === group.country;
              return (
                <button
                  key={group.country}
                  onMouseEnter={() => setHoveredCountry(group.country)}
                  onClick={() => {
                    setGridCountry(gridCountry === group.country ? null : group.country);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg
                             text-left transition-colors cursor-pointer
                             ${isSelected
                               ? "bg-neutral-800 text-white"
                               : isHovered
                                 ? "bg-neutral-100"
                                 : "hover:bg-neutral-50"
                             }`}
                >
                  <span className={`text-[11px] truncate ${isSelected ? "font-medium" : ""}`}>
                    {group.country}
                  </span>
                  <span className={`text-[9px] shrink-0 ml-1.5 tabular-nums
                    ${isSelected ? "text-white/60" : "text-neutral-400"}`}>
                    {group.totalCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Column 2: Cities — slides in from right, left column stays put */}
          <AnimatePresence>
            {expandedGroup && expandedGroup.cities.length > 0 && (
              <motion.div
                key={expandedGroup.country}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 120, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="shrink-0 overflow-hidden border-l border-neutral-100 bg-white"
              >
                <div className="w-[120px] max-h-[280px] overflow-y-auto scrollbar-hide p-1">
                  {expandedGroup.cities.map((city) => {
                    const isActive = gridCountry === expandedGroup.country
                      && gridCity === city.name;
                    return (
                      <button
                        key={city.name}
                        onClick={() => {
                          if (gridCountry !== expandedGroup.country) {
                            setGridCountry(expandedGroup.country);
                          }
                          setGridCity(isActive ? null : city.name);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg
                                   text-left transition-colors cursor-pointer
                                   ${isActive
                                     ? "bg-neutral-800 text-white"
                                     : "hover:bg-neutral-50"
                                   }`}
                      >
                        <span className={`text-[11px] truncate
                          ${isActive ? "font-medium" : "text-neutral-700"}`}>
                          {city.name}
                        </span>
                        <span className={`text-[9px] shrink-0 ml-1.5 tabular-nums
                          ${isActive ? "text-white/60" : "text-neutral-400"}`}>
                          {city.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
