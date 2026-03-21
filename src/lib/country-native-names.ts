/**
 * GeoJSON English country name → native-language display name.
 *
 * Independent utility — no coupling with any specific feature.
 * Falls back to the input name if no mapping is found.
 */

const NATIVE_NAMES: Record<string, string> = {
  // 东亚
  Japan: "日本",
  Korea: "한국",
  "Dem. Rep. Korea": "조선",
  Mongolia: "Монгол",
  China: "中国",
  Taiwan: "台湾",
  // 东南亚
  Thailand: "ไทย",
  Vietnam: "Việt Nam",
  Singapore: "Singapore",
  Malaysia: "Malaysia",
  Indonesia: "Indonesia",
  Philippines: "Pilipinas",
  Cambodia: "កម្ពុជា",
  Myanmar: "မြန်မာ",
  "Lao PDR": "ລາວ",
  Brunei: "Brunei",
  // 南亚
  India: "भारत",
  "Sri Lanka": "Sri Lanka",
  Nepal: "नेपाल",
  Pakistan: "Pakistan",
  Bangladesh: "বাংলাদেশ",
  Maldives: "Maldives",
  // 中亚 / 西亚
  Turkey: "Türkiye",
  "United Arab Emirates": "الإمارات",
  Israel: "ישראל",
  "Saudi Arabia": "السعودية",
  Iran: "ایران",
  Qatar: "قطر",
  Jordan: "الأردن",
  Oman: "عُمان",
  Georgia: "საქართველო",
  Armenia: "Հայաստան",
  Azerbaijan: "Azərbaycan",
  // 欧洲
  "United Kingdom": "UK",
  France: "France",
  Germany: "Deutschland",
  Italy: "Italia",
  Spain: "España",
  Portugal: "Portugal",
  Netherlands: "Nederland",
  Belgium: "België",
  Switzerland: "Schweiz",
  Austria: "Österreich",
  "Czech Rep.": "Česko",
  Hungary: "Magyarország",
  Poland: "Polska",
  Greece: "Ελλάδα",
  Sweden: "Sverige",
  Norway: "Norge",
  Finland: "Suomi",
  Denmark: "Danmark",
  Iceland: "Ísland",
  Ireland: "Ireland",
  Russia: "Россия",
  Croatia: "Hrvatska",
  Serbia: "Србија",
  Romania: "România",
  Bulgaria: "България",
  Slovenia: "Slovenija",
  Slovakia: "Slovensko",
  Estonia: "Eesti",
  Latvia: "Latvija",
  Lithuania: "Lietuva",
  Montenegro: "Crna Gora",
  Monaco: "Monaco",
  Malta: "Malta",
  // 北美
  "United States": "USA",
  Canada: "Canada",
  Mexico: "México",
  Cuba: "Cuba",
  // 南美
  Brazil: "Brasil",
  Argentina: "Argentina",
  Peru: "Perú",
  Chile: "Chile",
  Colombia: "Colombia",
  // 大洋洲
  Australia: "Australia",
  "New Zealand": "New Zealand",
  Fiji: "Fiji",
  // 非洲
  Egypt: "مصر",
  Morocco: "المغرب",
  "South Africa": "South Africa",
  Kenya: "Kenya",
  Tanzania: "Tanzania",
  Tunisia: "تونس",
  Mauritius: "Mauritius",
  Ethiopia: "ኢትዮጵያ",
  Ghana: "Ghana",
  Nigeria: "Nigeria",
  Namibia: "Namibia",
  Madagascar: "Madagasikara",
};

/** Get native-language display name for a country. Returns original if unmapped. */
export function getNativeName(enName: string): string {
  return NATIVE_NAMES[enName] ?? enName;
}
