import { X, Route } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useCityAggregation } from "../hooks/useCityAggregation";
import { useMapStore } from "../stores/useMapStore";

function coverSrc(cover: string) {
  if (!cover) return "";
  if (cover.startsWith("/")) return convertFileSrc(cover);
  if (cover.startsWith("//")) return `https:${cover}`;
  return cover;
}

export function CityGallery() {
  const { entries } = useCityAggregation();
  const selectedCity = useMapStore((s) => s.selectedCity);
  const routePath = useMapStore((s) => s.routePath);
  const setSelectedCity = useMapStore((s) => s.setSelectedCity);
  const clearCityFilter = useMapStore((s) => s.clearCityFilter);
  const generateRoute = useMapStore((s) => s.generateRoute);
  const clearRoute = useMapStore((s) => s.clearRoute);

  if (entries.length === 0) return null;

  const handleEatAll = () => {
    if (routePath) {
      clearRoute();
    } else {
      generateRoute(
        entries.map((e) => ({ name: e.name, coord: e.coord }))
      );
    }
  };

  return (
    <div
      className="absolute bottom-0 right-0 z-10 pointer-events-none transition-[left] duration-300 ease-out"
      style={{ left: 0 }}
    >
      {/* Gradient fade */}
      <div className="h-8 bg-gradient-to-b from-transparent to-[var(--bg-deep)]/80" />

      <div className="bg-[var(--bg-panel)]/85 backdrop-blur-lg pointer-events-auto px-3 pb-3 pt-2
                      border-t border-[var(--border-color)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[9px] font-medium text-secondary uppercase tracking-wide">
            城市分布
          </span>
          <div className="flex items-center gap-3">
            {entries.length >= 2 && (
              <button
                onClick={handleEatAll}
                className={`flex items-center gap-1 text-[9px] font-medium transition-colors ${
                  routePath
                    ? "text-[var(--accent-cyan)]"
                    : "text-secondary hover:text-[var(--accent-cyan)]"
                }`}
              >
                <Route size={10} />
                {routePath ? "清除路线" : "吃一遍"}
              </button>
            )}
            {selectedCity && (
              <button
                onClick={clearCityFilter}
                className="flex items-center gap-1 text-[9px] text-[var(--accent-pink)] hover:opacity-70 transition-opacity"
              >
                <X size={10} />
                清除筛选
              </button>
            )}
          </div>
        </div>

        {/* Route summary */}
        {routePath && (
          <div className="mb-2 px-1">
            <div className="flex gap-1 items-center flex-wrap">
              {routePath.map((node, i) => (
                <span key={node.name} className="flex items-center gap-0.5">
                  <span className="text-[9px] text-[var(--accent-cyan)] font-medium">
                    {node.name}
                  </span>
                  {i < routePath.length - 1 && (
                    <span className="text-[8px] text-secondary">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable city cards */}
        <div className="-m-1">
          <div className="flex gap-2 overflow-x-auto p-1 scrollbar-hide">
            {entries.map((city) => {
              const isActive = selectedCity === city.name;
              return (
                <button
                  key={city.name}
                  onClick={() => setSelectedCity(city.name)}
                  className={`shrink-0 w-[120px] rounded-xl overflow-hidden transition-all
                    ${isActive
                      ? "ring-2 ring-[var(--accent-cyan)] shadow-md"
                      : "bg-card hover:shadow-md"
                    }`}
                >
                  {/* Cover thumbnail */}
                  <div className="w-full h-[60px] bg-card relative">
                    {city.covers[0] ? (
                      <img
                        src={coverSrc(city.covers[0])}
                        alt=""
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[16px] text-secondary">
                        📍
                      </div>
                    )}
                    {/* Count badge */}
                    <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[8px] font-bold bg-[var(--accent-pink)] text-white rounded-md">
                      {city.count}
                    </span>
                  </div>
                  {/* City name */}
                  <div className="px-2 py-1.5 bg-panel">
                    <span className="text-[10px] font-medium text-primary truncate block">
                      {city.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
