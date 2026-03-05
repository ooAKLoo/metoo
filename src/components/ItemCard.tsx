import { motion } from "motion/react";
import { MapPin, Heart } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { FavoriteItem } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";

interface Props {
  item: FavoriteItem;
  index: number;
}

export function ItemCard({ item, index }: Props) {
  const { selectedItemId, setSelectedItem } = useMapStore();
  const isSelected = selectedItemId === item.id;
  const isXhs = item.source === "xiaohongshu";

  const coverSrc = item.cover
    ? item.cover.startsWith("/")
      ? convertFileSrc(item.cover)
      : item.cover.startsWith("//")
        ? `https:${item.cover}`
        : item.cover
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25, ease: "easeOut" }}
      whileTap={{ scale: 0.985 }}
      onClick={() => setSelectedItem(isSelected ? null : item.id)}
      className={`flex gap-3 p-2.5 rounded-xl cursor-pointer transition-colors
        ${isSelected
          ? "bg-[var(--accent-cyan)]/8 ring-1 ring-[var(--accent-cyan)]/30"
          : "bg-panel hover:bg-card"
        }`}
    >
      {/* Thumbnail */}
      <div className="w-[72px] h-[54px] rounded-lg overflow-hidden shrink-0 bg-card relative">
        {coverSrc && (
          <img
            src={coverSrc}
            alt=""
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {/* Source badge */}
        <span
          className={`absolute top-0.5 left-0.5 px-1 py-px text-[7px] font-bold rounded
            ${isXhs
              ? "bg-[#fe2c55] text-white"
              : "bg-[#00a1d6] text-white"
            }`}
        >
          {isXhs ? "红" : "B"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="text-[12px] font-medium text-primary leading-tight line-clamp-2">
          {item.title}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {item.locations.length > 0 ? (
            item.locations.slice(0, 2).map((loc) => (
              <span
                key={loc.name}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5
                           bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]
                           text-[9px] font-medium rounded"
              >
                <MapPin size={8} />
                {loc.name}
              </span>
            ))
          ) : (
            <span className="text-[9px] text-secondary">未识别地点</span>
          )}
          <span className="text-[9px] text-secondary ml-auto flex items-center gap-1">
            {isXhs && item.likes && (
              <>
                <Heart size={8} className="text-[#fe2c55]" />
                <span>{item.likes}</span>
                <span className="mx-0.5">·</span>
              </>
            )}
            {item.author}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
