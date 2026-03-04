import { useFavoriteStore } from "../stores/useFavoriteStore";
import { ItemCard } from "./ItemCard";
import { Map, List } from "lucide-react";

export function ItemList() {
  const { items, status, listTitle } = useFavoriteStore();
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
          <span className="text-[11px] font-medium text-primary truncate max-w-[180px]">
            {listTitle || "收藏夹"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-secondary">
          <span>{items.length} 条</span>
          <span className="text-[var(--accent-green)]">{locatedCount} 已定位</span>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {items.map((item, i) => (
          <ItemCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
