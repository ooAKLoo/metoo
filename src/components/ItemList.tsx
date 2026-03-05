import { useMemo } from "react";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useTagExtraction, titleMatchesTag } from "../hooks/useTagExtraction";
import { ItemCard } from "./ItemCard";
import { Map, List, X } from "lucide-react";

export function ItemList() {
  const { items, status, listTitle } = useFavoriteStore();
  const selectedCity = useMapStore((s) => s.selectedCity);
  const selectedTag = useMapStore((s) => s.selectedTag);
  const setSelectedTag = useMapStore((s) => s.setSelectedTag);
  const viewMode = useMapStore((s) => s.viewMode);
  const clearCityFilter = useMapStore((s) => s.clearCityFilter);
  const tags = useTagExtraction();

  const filteredItems = useMemo(() => {
    let result = items;
    if (viewMode === "city" && selectedCity) {
      result = result.filter((item) =>
        item.locations.some((loc) => loc.name === selectedCity)
      );
    }
    if (selectedTag) {
      result = result.filter((item) => titleMatchesTag(item.title, selectedTag));
    }
    return result;
  }, [items, viewMode, selectedCity, selectedTag]);

  const locatedCount = items.filter((i) => i.locations.length > 0).length;

  if (status === "idle") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-secondary gap-3 px-6">
        <Map size={40} strokeWidth={1.5} className="text-[var(--accent-pink)]/50" />
        <p className="text-[12px] text-center leading-relaxed">
          B 站：粘贴公开收藏夹链接
          <br />
          小红书：粘贴收藏夹页面 HTML
          <br />
          自动提取地点 → 地图可视化
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <List size={14} className="text-[var(--accent-cyan)]" />
          <span className="text-[11px] font-medium text-primary truncate max-w-[140px]">
            {listTitle || "收藏夹"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-secondary">
          <span>{items.length} 条</span>
          <span className="text-[var(--accent-green)]">{locatedCount} 已定位</span>
        </div>
      </div>

      {/* Tag pills */}
      {tags.length > 0 && (
        <div className="px-3 pb-1.5 shrink-0">
          <div className="-m-0.5">
            <div className="flex gap-1 overflow-x-auto p-0.5 scrollbar-hide">
              {tags.map((tag) => {
                const isActive = selectedTag === tag.category;
                return (
                  <button
                    key={tag.category}
                    onClick={() => setSelectedTag(isActive ? null : tag.category)}
                    className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium
                      whitespace-nowrap transition-colors
                      ${isActive
                        ? "bg-[var(--accent-pink)] text-white"
                        : "bg-card text-secondary hover:text-primary"
                      }`}
                  >
                    <span className="text-[11px]">{tag.emoji}</span>
                    {tag.category}
                    <span className={`text-[8px] ${isActive ? "text-white/70" : "text-secondary"}`}>
                      {tag.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active filter indicators */}
      {(selectedTag || (selectedCity && viewMode === "city")) && (
        <div className="mx-3 mb-2 flex flex-wrap gap-1.5">
          {selectedTag && (
            <div className="px-2.5 py-1 rounded-lg bg-[var(--accent-pink)]/15 flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-[var(--accent-pink)]">
                {tags.find((t) => t.category === selectedTag)?.emoji} {selectedTag} · {filteredItems.length} 条
              </span>
              <button
                onClick={() => setSelectedTag(null)}
                className="text-secondary hover:text-primary transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          )}
          {selectedCity && viewMode === "city" && (
            <div className="px-2.5 py-1 rounded-lg bg-[var(--accent-cyan)]/15 flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-[var(--accent-cyan)]">
                📍 {selectedCity}
              </span>
              <button
                onClick={clearCityFilter}
                className="text-secondary hover:text-primary transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {filteredItems.map((item, i) => (
          <ItemCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
