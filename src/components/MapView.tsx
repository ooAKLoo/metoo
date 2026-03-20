import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { useMapStore, type MapLevel } from "../stores/useMapStore";
import { WorldMap } from "./WorldMap";

const CountryMap = lazy(() => import("./CountryMap"));

/**
 * White-curtain transition: two maps are NEVER simultaneously visible.
 *
 * DrillDown: zoom (400ms) → curtain drops during zoom tail → swap behind curtain → curtain lifts
 * DrillUp:   curtain drops → swap behind curtain → curtain lifts
 */
export function MapView() {
  const mapLevel = useMapStore((s) => s.mapLevel);
  const setMapLevel = useMapStore((s) => s.setMapLevel);

  const [worldVisible, setWorldVisible] = useState(mapLevel === "world");
  const [countryVisible, setCountryVisible] = useState(
    mapLevel.startsWith("country:"),
  );
  const [countryName, setCountryName] = useState(
    mapLevel.startsWith("country:")
      ? mapLevel.slice("country:".length)
      : "",
  );
  const [curtain, setCurtain] = useState(0);
  const transitioningRef = useRef(false);
  const countryVisibleRef = useRef(countryVisible);
  countryVisibleRef.current = countryVisible;

  /**
   * DrillDown timeline (WorldMap zoom starts at t=0 in WorldMap.handleCountryClick):
   *   0ms   zoom starts
   *  200ms   curtain begins dropping (150ms) + CountryMap mounts behind it
   *  350ms   curtain opaque → hide WorldMap
   *  430ms   curtain lifts (150ms) → reveals CountryMap
   *  580ms   done
   */
  const drillDown = useCallback(
    (name?: string) => {
      if (transitioningRef.current || !name) return;
      transitioningRef.current = true;

      setMapLevel(`country:${name}` as MapLevel);
      setCountryName(name);

      // Phase 1: curtain drops during zoom's deceleration + mount CountryMap behind it
      setTimeout(() => {
        setCurtain(1);
        setCountryVisible(true);

        // Phase 2: curtain opaque → remove WorldMap
        setTimeout(() => {
          setWorldVisible(false);

          // Phase 3: brief hold for CountryMap to render, then lift curtain
          setTimeout(() => {
            setCurtain(0);
            setTimeout(() => {
              transitioningRef.current = false;
            }, 150);
          }, 80);
        }, 150);
      }, 200);
    },
    [setMapLevel],
  );

  /**
   * DrillUp timeline:
   *   0ms   curtain drops (150ms)
   * 150ms   curtain opaque → swap maps
   * 250ms   WorldMap rendered, curtain lifts (150ms)
   * 400ms   done
   */
  const performDrillUp = useCallback(() => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;

    setCurtain(1);

    setTimeout(() => {
      setWorldVisible(true);
      setCountryVisible(false);
      setCountryName("");
      setMapLevel("world");

      // Wait for WorldMap to render with cached data, then lift curtain
      setTimeout(() => {
        setCurtain(0);
        setTimeout(() => {
          transitioningRef.current = false;
        }, 150);
      }, 100);
    }, 150);
  }, [setMapLevel]);

  // React to external mapLevel changes (e.g. back button in RightPanel)
  useEffect(() => {
    if (transitioningRef.current) return;
    if (mapLevel === "world" && countryVisibleRef.current) {
      performDrillUp();
    }
  }, [mapLevel, performDrillUp]);

  return (
    <div className="absolute inset-0">
      {worldVisible && (
        <div className="absolute inset-0">
          <WorldMap onDrillDown={drillDown} />
        </div>
      )}
      {countryVisible && countryName && (
        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <CountryMap countryName={countryName} onBack={performDrillUp} />
          </Suspense>
        </div>
      )}
      {/* White curtain — maps swap behind it, never simultaneously visible */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-150 ease-in-out"
        style={{ opacity: curtain, backgroundColor: "#fff", zIndex: 10 }}
      />
    </div>
  );
}
