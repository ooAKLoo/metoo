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
      // ── Guard 1: Shadowed by longer country name already matched ──
      // e.g. "印度" inside "印度尼西亚" — skip the shorter name
      let shadowedByLongerCountry = false;
      for (const [existingName] of found) {
        if (existingName.includes(country) && existingName !== country) {
          shadowedByLongerCountry = true;
          break;
        }
      }
      // Also check if a longer country name in COUNTRY_NAMES contains this one and is in text
      if (!shadowedByLongerCountry) {
        for (const other of COUNTRY_NAMES) {
          if (other.length > country.length && other.includes(country) && text.includes(other)) {
            shadowedByLongerCountry = true;
            break;
          }
        }
      }
      if (shadowedByLongerCountry) continue;

      // ── Guard 2: Shadowed by Chinese province in text ──
      // e.g. "蒙古" inside "内蒙古"
      const shadowedByProvince = PROVINCE_NAMES.some(
        (prov) => prov !== country && prov.includes(country) && text.includes(prov),
      );
      if (shadowedByProvince) continue;

      // ── Guard 3: Ethnic group context → remap to Chinese province ──
      // "朝鲜族" / "蒙古族" = Chinese ethnic terms, not country references
      // Still useful for location: remap to the relevant Chinese region
      if (text.includes(country + "族")) {
        const ETHNIC_REMAP: Record<string, string> = {
          "蒙古": "内蒙古",
          "朝鲜": "吉林",   // 朝鲜族 → 延边朝鲜族自治州 in 吉林
        };
        const remapped = ETHNIC_REMAP[country];
        if (remapped && !found.has(remapped) && !foundProvinces.has(remapped)) {
          const coords = PROVINCES[remapped];
          if (coords) {
            found.set(remapped, {
              name: remapped,
              province: remapped,
              lng: coords[0],
              lat: coords[1],
              confidence: 0.4,
              source: "admin",
            });
          }
        }
        continue;
      }

      // ── Guard 4: "蒙古" defaults to 内蒙古 (Chinese context) ──
      if (country === "蒙古" && !text.includes("蒙古国") && !text.includes("外蒙古")) {
        if (!found.has("内蒙古") && !foundProvinces.has("内蒙古")) {
          const innerCoords = PROVINCES["内蒙古"];
          if (innerCoords) {
            found.set("内蒙古", {
              name: "内蒙古",
              province: "内蒙古",
              lng: innerCoords[0],
              lat: innerCoords[1],
              confidence: 0.5,
              source: "admin",
            });
          }
        }
        continue;
      }

      // ── Guard 5: "朝鲜" in food context → 延边/吉林 ──
      // "朝鲜冷面", "朝鲜拌饭" etc. in Chinese food content = Korean-Chinese food from 延边
      if (country === "朝鲜" && !text.includes("朝鲜半岛") && !text.includes("朝鲜战争")) {
        // If we already have a Chinese location, skip — it's food context
        const hasChinaLoc = Array.from(found.values()).some(
          (loc) => PROVINCE_NAMES.includes(loc.province),
        );
        if (hasChinaLoc) continue;
      }

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
