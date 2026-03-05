import { useMemo } from "react";
import { useFavoriteStore } from "../stores/useFavoriteStore";

export interface CityEntry {
  name: string;
  coord: [number, number];
  count: number;
  titles: string[];
  covers: string[];
}

export function useCityAggregation() {
  const items = useFavoriteStore((s) => s.items);

  return useMemo(() => {
    const cityAgg = new Map<
      string,
      {
        coord: [number, number];
        count: number;
        titles: string[];
        covers: string[];
      }
    >();

    for (const item of items) {
      for (const loc of item.locations) {
        const key = loc.name;
        const existing = cityAgg.get(key);
        if (existing) {
          existing.count++;
          if (existing.titles.length < 5) existing.titles.push(item.title);
          if (existing.covers.length < 4 && item.cover)
            existing.covers.push(item.cover);
        } else {
          cityAgg.set(key, {
            coord: [loc.lng, loc.lat],
            count: 1,
            titles: [item.title],
            covers: item.cover ? [item.cover] : [],
          });
        }
      }
    }

    const entries: CityEntry[] = Array.from(cityAgg.entries())
      .map(([name, data]) => ({
        name,
        coord: data.coord,
        count: data.count,
        titles: data.titles,
        covers: data.covers,
      }))
      .sort((a, b) => b.count - a.count);

    const scatterData = entries.map((e) => ({
      name: e.name,
      value: [...e.coord, e.count] as [number, number, number],
      titles: e.titles,
    }));

    const heatmapData = entries.map((e) => [...e.coord, e.count]);

    return { entries, scatterData, heatmapData };
  }, [items]);
}
