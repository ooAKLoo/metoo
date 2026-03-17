import { useCallback, useRef, useState, lazy, Suspense } from "react";
import { useMapStore, type MapLevel } from "../stores/useMapStore";
import { WorldMap } from "./WorldMap";
import { ChinaMap } from "./ChinaMap";

const CountryMap = lazy(() => import("./CountryMap"));

export function MapView() {
  const mapLevel = useMapStore((s) => s.mapLevel);
  const setMapLevel = useMapStore((s) => s.setMapLevel);

  const [mapOpacity, setMapOpacity] = useState(1);
  const transitioningRef = useRef(false);

  /** Fade-transition to any map level */
  const transitionTo = useCallback(
    (level: MapLevel) => {
      if (transitioningRef.current) return;
      transitioningRef.current = true;

      setMapOpacity(0);

      setTimeout(() => {
        setMapLevel(level);
        requestAnimationFrame(() => {
          setTimeout(() => {
            setMapOpacity(1);
            transitioningRef.current = false;
          }, 50);
        });
      }, 280);
    },
    [setMapLevel],
  );

  const drillDown = useCallback(
    (countryName?: string) => {
      const level = countryName === "China" ? "china" : `country:${countryName}`;
      transitionTo(level as MapLevel);
    },
    [transitionTo],
  );

  const drillUp = useCallback(() => {
    transitionTo("world");
  }, [transitionTo]);

  const renderMap = () => {
    if (mapLevel === "world") return <WorldMap onDrillDown={drillDown} />;
    if (mapLevel === "china") return <ChinaMap />;
    if (mapLevel.startsWith("country:")) {
      const name = mapLevel.slice("country:".length);
      return (
        <Suspense fallback={null}>
          <CountryMap countryName={name} onBack={drillUp} />
        </Suspense>
      );
    }
    return <WorldMap onDrillDown={drillDown} />;
  };

  return (
    <div
      className="absolute inset-0 transition-opacity duration-[280ms] ease-in-out"
      style={{ opacity: mapOpacity }}
    >
      {renderMap()}
    </div>
  );
}
