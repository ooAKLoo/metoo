import { useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Play, Heart } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useFavoriteStore, type FavoriteItem } from "../stores/useFavoriteStore";

function coverSrc(cover: string) {
  if (!cover) return "";
  if (cover.startsWith("/")) return convertFileSrc(cover);
  if (cover.startsWith("//")) return `https:${cover}`;
  return cover;
}

function ItemCard({ item, index }: { item: FavoriteItem; index: number }) {
  const isXhs = item.source === "xiaohongshu";

  const openSource = useCallback(() => {
    const url = isXhs
      ? `https://www.xiaohongshu.com/explore/${item.bvid}`
      : `https://www.bilibili.com/video/${item.bvid}`;
    window.open(url, "_blank");
  }, [item.bvid, isXhs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.6) }}
      className="group cursor-pointer"
      onClick={openSource}
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-neutral-200">
        {item.cover && (
          <img
            src={coverSrc(item.cover)}
            alt=""
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            className="w-full h-full object-cover
                       group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />

        {/* Play / source badge */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1
                        px-1.5 py-0.5 rounded-md
                        bg-black/40 text-white text-[8px] font-medium
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {isXhs ? <Heart size={8} /> : <Play size={8} />}
          {isXhs ? "小红书" : "B站"}
        </div>

        {/* Likes badge (XHS) */}
        {item.likes && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5
                          px-1.5 py-0.5 rounded-md
                          bg-black/40 text-white text-[8px]">
            <Heart size={7} />
            {item.likes}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-1.5 px-0.5">
        <p className="text-[10px] font-medium text-neutral-700 leading-tight
                      line-clamp-2 group-hover:text-neutral-900 transition-colors">
          {item.title}
        </p>
        <p className="text-[8px] text-neutral-400 mt-0.5 truncate">
          {item.author}
        </p>
      </div>
    </motion.div>
  );
}

export function GridView() {
  const items = useFavoriteStore((s) => s.items);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-[11px] text-neutral-400">暂无收藏内容</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Header spacer — matches concave notch height, always on top */}
      <div className="shrink-0 h-[52px]" />

      {/* Scrollable grid body — starts below the header, never overlaps */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4"
      >
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          }}
        >
          {items.map((item, i) => (
            <ItemCard key={item.id} item={item} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
