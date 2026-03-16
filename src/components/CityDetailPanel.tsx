import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, MapPin, Heart, Download, Check, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useFavoriteStore, type FavoriteItem } from "../stores/useFavoriteStore";
import { useMapStore } from "../stores/useMapStore";
import { useCityAggregation } from "../hooks/useCityAggregation";
import { generateCityPoster } from "../lib/city-poster";

function coverSrc(cover: string) {
  if (!cover) return "";
  if (cover.startsWith("/")) return convertFileSrc(cover);
  if (cover.startsWith("//")) return `https:${cover}`;
  return cover;
}

function CityItemCard({ item }: { item: FavoriteItem }) {
  const isXhs = item.source === "xiaohongshu";
  const src = coverSrc(item.cover);

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      className="flex gap-2.5 p-2 rounded-xl bg-panel/60 hover:bg-card/80
                 cursor-pointer transition-colors"
    >
      {/* Thumbnail */}
      <div className="w-[64px] h-[48px] rounded-lg overflow-hidden shrink-0 bg-card/50 relative">
        {src && (
          <img
            src={src}
            alt=""
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <span
          className={`absolute top-0.5 left-0.5 px-1 py-px text-[7px] font-bold rounded
            ${isXhs ? "bg-[#fe2c55] text-white" : "bg-[#00a1d6] text-white"}`}
        >
          {isXhs ? "红" : "B"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="text-[11px] font-medium text-primary leading-tight line-clamp-2">
          {item.title}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.locations.slice(0, 1).map((loc) => (
            <span
              key={loc.name}
              className="inline-flex items-center gap-0.5 text-[8px] text-[var(--accent-pink)] font-medium"
            >
              <MapPin size={7} />
              {loc.name}
            </span>
          ))}
          <span className="text-[8px] text-secondary ml-auto flex items-center gap-1">
            {isXhs && item.likes && (
              <>
                <Heart size={7} className="text-[#fe2c55]" />
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

export function CityDetailPanel() {
  const items = useFavoriteStore((s) => s.items);
  const selectedCity = useMapStore((s) => s.selectedCity);
  const clearCityFilter = useMapStore((s) => s.clearCityFilter);
  const { entries } = useCityAggregation();

  const [dlState, setDlState] = useState<"idle" | "loading" | "done">("idle");

  const cityEntry = useMemo(
    () => entries.find((e) => e.name === selectedCity),
    [entries, selectedCity],
  );

  const cityItems = useMemo(() => {
    if (!selectedCity) return [];
    return items.filter((item) =>
      item.locations.some((loc) => loc.name === selectedCity),
    );
  }, [items, selectedCity]);

  const handleDownload = useCallback(async () => {
    if (!selectedCity || cityItems.length === 0 || dlState === "loading") return;

    // Find the province for this city
    const loc = cityItems[0]?.locations.find((l) => l.name === selectedCity);
    const provinceName = loc?.province || selectedCity;
    const cityCoord: [number, number] = cityEntry
      ? cityEntry.coord
      : loc
        ? [loc.lng, loc.lat]
        : [116.4, 39.9];

    setDlState("loading");
    try {
      const blob = await generateCityPoster({
        cityName: selectedCity,
        provinceName,
        items: cityItems,
        cityCoord,
      });

      const arrayBuf = await blob.arrayBuffer();
      const data = Array.from(new Uint8Array(arrayBuf));
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `觅途-${selectedCity}-${timestamp}.png`;

      await invoke("save_image_to_downloads", { data, filename });
      setDlState("done");
      setTimeout(() => setDlState("idle"), 2000);
    } catch (err) {
      console.error("Download failed:", err);
      setDlState("idle");
    }
  }, [selectedCity, cityItems, cityEntry, dlState]);

  return (
    <AnimatePresence mode="wait">
      {selectedCity && (
        <motion.div
          key="city-detail"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
          className="absolute top-3 right-3 bottom-3 w-[260px] z-[25]
                     flex flex-col
                     bg-panel/80 backdrop-blur-xl
                     border border-[var(--border-color)]/30
                     rounded-2xl
                     shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2">
            {/* City avatar */}
            {cityEntry && cityEntry.covers.length > 0 && (
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border-[1.5px] border-[var(--accent-cyan)]/40">
                <img
                  src={coverSrc(cityEntry.covers[0])}
                  alt=""
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-primary truncate">
                {selectedCity}
              </div>
              <div className="text-[9px] text-secondary">
                {cityItems.length} 条收藏
              </div>
            </div>

            {/* Download button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleDownload}
              disabled={dlState === "loading"}
              className={`shrink-0 w-6 h-6 flex items-center justify-center
                         rounded-lg transition-colors cursor-pointer
                         ${dlState === "done"
                           ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)]"
                           : "bg-card/60 hover:bg-card text-secondary hover:text-primary"
                         }`}
            >
              {dlState === "loading" ? (
                <Loader2 size={11} className="animate-spin" />
              ) : dlState === "done" ? (
                <Check size={11} />
              ) : (
                <Download size={11} />
              )}
            </motion.button>

            {/* Close button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={clearCityFilter}
              className="shrink-0 w-6 h-6 flex items-center justify-center
                         rounded-lg bg-card/60 hover:bg-card
                         text-secondary hover:text-primary
                         transition-colors cursor-pointer"
            >
              <X size={12} />
            </motion.button>
          </div>

          {/* Divider */}
          <div className="mx-3 h-px bg-[var(--border-color)]/20" />

          {/* Scrollable list */}
          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-1.5
                          scrollbar-hide">
            {cityItems.map((item) => (
              <CityItemCard key={item.id} item={item} />
            ))}

            {cityItems.length === 0 && (
              <div className="text-center text-[10px] text-secondary py-8">
                暂无收藏内容
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
