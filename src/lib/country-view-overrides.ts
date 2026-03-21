/**
 * Per-country initial viewport overrides.
 *
 * Some countries appear too small or off-center due to remote territories.
 * This config stores the desired initial view (center + zoom) for those countries.
 *
 * Values are normalized fractions of SVG dimensions:
 * - cx, cy: center point (0.5 = geometric center of SVG)
 * - zoom: zoom level (1 = fit all, >1 = zoomed in)
 */

export interface CountryViewOverride {
  cx: number;
  cy: number;
  zoom: number;
}

/**
 * Country name (matching GeoJSON / _registry key) → initial viewport.
 * Countries not listed here use the default view (centered, zoom 1).
 */
const OVERRIDES: Record<string, CountryViewOverride> = {
  China: { cx: 0.5194, cy: 0.3699, zoom: 1 },
  "United States": { cx: 0.204, cy: 0.4429, zoom: 1.57 },
  Australia: { cx: 0.517, cy: 0.3594, zoom: 1 },
  Japan: { cx: 0.5065, cy: 0.3762, zoom: 1 },
};

export function getCountryViewOverride(name: string): CountryViewOverride | undefined {
  return OVERRIDES[name];
}
