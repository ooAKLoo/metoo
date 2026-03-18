import { Suspense } from "react";
import { useMapStore } from "../stores/useMapStore";
import { useFavoriteStore } from "../stores/useFavoriteStore";
import { useCityAggregation } from "../hooks/useCityAggregation";
import { getPosterModule, POSTER_RATIOS } from "../lib/poster-modules";

export function PosterPreview() {
  const activePosterModule = useMapStore((s) => s.activePosterModule);
  const selectedCity = useMapStore((s) => s.selectedCity);
  const posterRatio = useMapStore((s) => s.posterRatio);
  const items = useFavoriteStore((s) => s.items);
  const { entries } = useCityAggregation();

  const mod = activePosterModule ? getPosterModule(activePosterModule) : null;
  if (!mod) return null;

  const { w, h } = POSTER_RATIOS[posterRatio];

  return (
    <Suspense fallback={null}>
      <mod.component
        items={items}
        selectedCity={selectedCity}
        cityEntries={entries}
        posterWidth={w}
        posterHeight={h}
      />
    </Suspense>
  );
}
