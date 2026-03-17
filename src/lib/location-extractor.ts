import { findCity, PROVINCE_NAMES, CITY_NAMES, PROVINCES } from "./china-divisions";
import { POI_TO_CITY, POI_NAMES } from "./poi-dictionary";
import { findWorldCity, COUNTRY_NAMES, WORLD_CITY_NAMES, COUNTRIES } from "./world-cities";

export interface ExtractedLocation {
  name: string;       // Display name (city or province/country)
  province: string;   // Province (China) or country (international)
  lng: number;
  lat: number;
  confidence: number; // 0-1, higher = more confident
  source: "admin" | "poi"; // Which extraction layer found it
}

/**
 * Extract locations from text (title + intro).
 * Pipeline:
 * A: Chinese administrative region matching (省/市)
 * B: International city / country matching
 * C: POI dictionary lookup
 * Dedup + confidence sort.
 */
export function extractLocations(title: string, intro: string): ExtractedLocation[] {
  const text = `${title} ${intro}`;
  const found = new Map<string, ExtractedLocation>();

  // --- Layer A: Chinese administrative region name matching ---
  // Match city names first (more specific)
  for (const cityName of CITY_NAMES) {
    if (text.includes(cityName)) {
      const city = findCity(cityName);
      if (city && !found.has(city.name)) {
        found.set(city.name, {
          name: city.name,
          province: city.province,
          lng: city.lng,
          lat: city.lat,
          confidence: cityName.length >= 3 ? 0.9 : 0.7,
          source: "admin",
        });
      }
    }
  }

  // Match province names (less specific)
  // Skip province if we already found a city belonging to it
  const foundProvinces = new Set(
    Array.from(found.values()).map((loc) => loc.province)
  );
  for (const prov of PROVINCE_NAMES) {
    if (text.includes(prov) && !found.has(prov) && !foundProvinces.has(prov)) {
      const coords = PROVINCES[prov];
      if (coords) {
        found.set(prov, {
          name: prov,
          province: prov,
          lng: coords[0],
          lat: coords[1],
          confidence: 0.6,
          source: "admin",
        });
      }
    }
  }

  // --- Layer B: International cities & countries ---
  // Match world city names first (more specific)
  for (const cityName of WORLD_CITY_NAMES) {
    if (text.includes(cityName)) {
      const city = findWorldCity(cityName);
      if (city && !found.has(city.name)) {
        found.set(city.name, {
          name: city.name,
          province: city.country,
          lng: city.lng,
          lat: city.lat,
          confidence: cityName.length >= 3 ? 0.9 : 0.7,
          source: "admin",
        });
      }
    }
  }

  // Match country names (less specific)
  // Skip country if we already found a city belonging to it
  const foundCountries = new Set(
    Array.from(found.values()).map((loc) => loc.province)
  );
  for (const country of COUNTRY_NAMES) {
    if (text.includes(country) && !found.has(country) && !foundCountries.has(country)) {
      const coords = COUNTRIES[country];
      if (coords) {
        found.set(country, {
          name: country,
          province: country,
          lng: coords[0],
          lat: coords[1],
          confidence: 0.6,
          source: "admin",
        });
      }
    }
  }

  // --- Layer C: POI dictionary ---
  for (const poi of POI_NAMES) {
    if (text.includes(poi)) {
      const cityName = POI_TO_CITY[poi];
      if (cityName && !found.has(cityName)) {
        const city = findCity(cityName);
        if (city) {
          found.set(cityName, {
            name: cityName,
            province: city.province,
            lng: city.lng,
            lat: city.lat,
            confidence: 0.85,
            source: "poi",
          });
        }
      }
    }
  }

  // Sort by confidence descending
  return Array.from(found.values()).sort((a, b) => b.confidence - a.confidence);
}
