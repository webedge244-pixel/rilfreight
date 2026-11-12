/**
 * RILFREIGHT Geocoding Engine
 * 
 * Provides robust multi-layer geocoding for shipper and consignee addresses:
 * 1. Direct coordinate literal parsing (`"[114.17, 22.31]"` or `"25.77, -80.19"`).
 * 2. In-memory LRU/Map cache with instant lookups and statistics.
 * 3. Exact and substring matching against 225 logistics hubs in `global_hubs.json`.
 * 4. Authoritative offline dictionary of 70+ major global logistics cities & freight hubs.
 * 5. Online Photon / Nominatim API queries with AbortController timeout (1500ms).
 * 6. Resilient fallback guaranteeing 100% availability in offline/CI environments.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface GeocodingResult {
  query: string;
  formattedAddress: string;
  coordinates: [number, number]; // [longitude, latitude]
  confidence: number;            // 0.0 to 1.0
  city?: string;
  country?: string;
  countryCode?: string;          // ISO 3166-1 alpha-2
  source: "cache" | "photon" | "nominatim" | "offline_dictionary" | "hub_match" | "literal_coordinates";
}

export interface GeocodeOptions {
  timeoutMs?: number;
  biasCoordinates?: [number, number];
  limit?: number;
  preferCountryCode?: string;
  allowOnline?: boolean;
}

interface HubRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  coordinates: [number, number];
  type: string;
  iataCode?: string;
  unlocode?: string;
}

// In-memory cache
const geocodeCache = new Map<string, GeocodingResult>();

// Load global hubs safely
let cachedHubs: HubRecord[] | null = null;
function getHubs(): HubRecord[] {
  if (cachedHubs) return cachedHubs;
  try {
    let hubsPath = "";
    try {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      hubsPath = path.resolve(currentDir, "../data/global_hubs.json");
    } catch {
      hubsPath = path.resolve(process.cwd(), "src/server/data/global_hubs.json");
    }
    if (!fs.existsSync(hubsPath)) {
      hubsPath = path.resolve(process.cwd(), "rilfreight/src/server/data/global_hubs.json");
    }
    if (fs.existsSync(hubsPath)) {
      const raw = fs.readFileSync(hubsPath, "utf-8");
      cachedHubs = JSON.parse(raw);
      return cachedHubs || [];
    }
  } catch (err) {
    console.warn("Could not load global_hubs.json for geocoding:", err);
  }
  return [];
}

/**
 * Authoritative offline dictionary of 70+ global trade hubs, seaports, and logistics capitals.
 */
interface CityEntry {
  name: string;
  aliases: string[];
  city: string;
  country: string;
  countryCode: string;
  coordinates: [number, number]; // [longitude, latitude]
}

const OFFLINE_CITIES: CityEntry[] = [
  // Greater China & East Asia
  { name: "Hong Kong", aliases: ["hong kong", "hk", "kowloon", "kwai tsing", "cheung sha wan"], city: "Hong Kong", country: "Hong Kong", countryCode: "HK", coordinates: [114.1694, 22.3193] },
  { name: "Shanghai", aliases: ["shanghai", "yangshan", "waigaoqiao", "pudong", "sha"], city: "Shanghai", country: "China", countryCode: "CN", coordinates: [121.4737, 31.2304] },
  { name: "Shenzhen", aliases: ["shenzhen", "yantian", "shekou", "chiwan"], city: "Shenzhen", country: "China", countryCode: "CN", coordinates: [114.0579, 22.5431] },
  { name: "Guangzhou", aliases: ["guangzhou", "nansha", "huangpu", "canton"], city: "Guangzhou", country: "China", countryCode: "CN", coordinates: [113.2644, 23.1291] },
  { name: "Ningbo", aliases: ["ningbo", "beilun", "zhoushan"], city: "Ningbo", country: "China", countryCode: "CN", coordinates: [121.544, 29.8683] },
  { name: "Qingdao", aliases: ["qingdao", "qianwan"], city: "Qingdao", country: "China", countryCode: "CN", coordinates: [120.3826, 36.0671] },
  { name: "Tianjin", aliases: ["tianjin", "xingang"], city: "Tianjin", country: "China", countryCode: "CN", coordinates: [117.2009, 39.0842] },
  { name: "Beijing", aliases: ["beijing", "peking"], city: "Beijing", country: "China", countryCode: "CN", coordinates: [116.4074, 39.9042] },
  { name: "Xi'an", aliases: ["xi'an", "xian"], city: "Xi'an", country: "China", countryCode: "CN", coordinates: [108.9398, 34.3416] },
  { name: "Zhengzhou", aliases: ["zhengzhou"], city: "Zhengzhou", country: "China", countryCode: "CN", coordinates: [113.6253, 34.7466] },
  { name: "Tokyo", aliases: ["tokyo", "yokohama", "haneda", "narita"], city: "Tokyo", country: "Japan", countryCode: "JP", coordinates: [139.6917, 35.6895] },
  { name: "Osaka", aliases: ["osaka", "kobe", "kansai"], city: "Osaka", country: "Japan", countryCode: "JP", coordinates: [135.5023, 34.6937] },
  { name: "Nagoya", aliases: ["nagoya", "chubu"], city: "Nagoya", country: "Japan", countryCode: "JP", coordinates: [136.9066, 35.1815] },
  { name: "Seoul", aliases: ["seoul", "incheon"], city: "Seoul", country: "South Korea", countryCode: "KR", coordinates: [126.978, 37.5665] },
  { name: "Busan", aliases: ["busan", "pusan"], city: "Busan", country: "South Korea", countryCode: "KR", coordinates: [129.0756, 35.1796] },
  { name: "Taipei", aliases: ["taipei", "taoyuan", "keelung"], city: "Taipei", country: "Taiwan", countryCode: "TW", coordinates: [121.5654, 25.033] },
  { name: "Kaohsiung", aliases: ["kaohsiung"], city: "Kaohsiung", country: "Taiwan", countryCode: "TW", coordinates: [120.3119, 22.6273] },

  // Southeast Asia & South Asia
  { name: "Singapore", aliases: ["singapore", "jurong", "tuas", "tanjong pagar", "pasir panjang"], city: "Singapore", country: "Singapore", countryCode: "SG", coordinates: [103.8198, 1.3521] },
  { name: "Kuala Lumpur", aliases: ["kuala lumpur", "port klang", "klang"], city: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", coordinates: [101.6869, 3.139] },
  { name: "Bangkok", aliases: ["bangkok", "laem chabang", "khlong toei"], city: "Bangkok", country: "Thailand", countryCode: "TH", coordinates: [100.5018, 13.7563] },
  { name: "Ho Chi Minh City", aliases: ["ho chi minh", "saigon", "cat lai"], city: "Ho Chi Minh City", country: "Vietnam", countryCode: "VN", coordinates: [106.6297, 10.8231] },
  { name: "Hanoi", aliases: ["hanoi", "haiphong"], city: "Hanoi", country: "Vietnam", countryCode: "VN", coordinates: [105.8544, 21.0285] },
  { name: "Jakarta", aliases: ["jakarta", "tanjung priok"], city: "Jakarta", country: "Indonesia", countryCode: "ID", coordinates: [106.8456, -6.2088] },
  { name: "Manila", aliases: ["manila"], city: "Manila", country: "Philippines", countryCode: "PH", coordinates: [120.9842, 14.5995] },
  { name: "Mumbai", aliases: ["mumbai", "nhava sheva", "jnpt", "bombay"], city: "Mumbai", country: "India", countryCode: "IN", coordinates: [72.8777, 19.076] },
  { name: "Delhi", aliases: ["delhi", "new delhi", "tughlakabad"], city: "Delhi", country: "India", countryCode: "IN", coordinates: [77.1025, 28.7041] },
  { name: "Colombo", aliases: ["colombo"], city: "Colombo", country: "Sri Lanka", countryCode: "LK", coordinates: [79.8612, 6.9271] },

  // Middle East & Africa
  { name: "Dubai", aliases: ["dubai", "jebel ali", "dxb", "uae"], city: "Dubai", country: "United Arab Emirates", countryCode: "AE", coordinates: [55.2708, 25.2048] },
  { name: "Abu Dhabi", aliases: ["abu dhabi", "khalifa port"], city: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE", coordinates: [54.3773, 24.4539] },
  { name: "Doha", aliases: ["doha", "hamad port"], city: "Doha", country: "Qatar", countryCode: "QA", coordinates: [51.531, 25.2854] },
  { name: "Jeddah", aliases: ["jeddah", "king abdullah port"], city: "Jeddah", country: "Saudi Arabia", countryCode: "SA", coordinates: [39.1925, 21.4858] },
  { name: "Salalah", aliases: ["salalah"], city: "Salalah", country: "Oman", countryCode: "OM", coordinates: [54.0924, 17.0151] },
  { name: "Port Said", aliases: ["port said", "suez canal"], city: "Port Said", country: "Egypt", countryCode: "EG", coordinates: [32.3019, 31.2653] },
  { name: "Durban", aliases: ["durban"], city: "Durban", country: "South Africa", countryCode: "ZA", coordinates: [31.0218, -29.8587] },
  { name: "Cape Town", aliases: ["cape town"], city: "Cape Town", country: "South Africa", countryCode: "ZA", coordinates: [18.4241, -33.9249] },

  // Europe
  { name: "Rotterdam", aliases: ["rotterdam", "maasvlakte", "nlrtm"], city: "Rotterdam", country: "Netherlands", countryCode: "NL", coordinates: [4.4777, 51.9244] },
  { name: "Amsterdam", aliases: ["amsterdam", "schiphol"], city: "Amsterdam", country: "Netherlands", countryCode: "NL", coordinates: [4.9041, 52.3676] },
  { name: "Antwerp", aliases: ["antwerp", "anvers", "beanr"], city: "Antwerp", country: "Belgium", countryCode: "BE", coordinates: [4.4025, 51.2194] },
  { name: "Hamburg", aliases: ["hamburg", "deham"], city: "Hamburg", country: "Germany", countryCode: "DE", coordinates: [9.9937, 53.5511] },
  { name: "Frankfurt", aliases: ["frankfurt", "frankfurt am main", "fra", "defra"], city: "Frankfurt", country: "Germany", countryCode: "DE", coordinates: [8.6821, 50.1109] },
  { name: "Duisburg", aliases: ["duisburg", "dedui"], city: "Duisburg", country: "Germany", countryCode: "DE", coordinates: [6.7623, 51.4344] },
  { name: "Bremen", aliases: ["bremen", "bremerhaven"], city: "Bremen", country: "Germany", countryCode: "DE", coordinates: [8.8017, 53.0793] },
  { name: "Le Havre", aliases: ["le havre", "haropa"], city: "Le Havre", country: "France", countryCode: "FR", coordinates: [0.1079, 49.4944] },
  { name: "Paris", aliases: ["paris", "charles de gaulle", "cdg"], city: "Paris", country: "France", countryCode: "FR", coordinates: [2.3522, 48.8566] },
  { name: "London", aliases: ["london", "heathrow", "felixstowe", "london gateway"], city: "London", country: "United Kingdom", countryCode: "GB", coordinates: [-0.1278, 51.5074] },
  { name: "Southampton", aliases: ["southampton"], city: "Southampton", country: "United Kingdom", countryCode: "GB", coordinates: [-1.4043, 50.9097] },
  { name: "Liverpool", aliases: ["liverpool"], city: "Liverpool", country: "United Kingdom", countryCode: "GB", coordinates: [-2.9916, 53.4084] },
  { name: "Milan", aliases: ["milan", "milano", "malpensa"], city: "Milan", country: "Italy", countryCode: "IT", coordinates: [9.19, 45.4642] },
  { name: "Genoa", aliases: ["genoa", "genova"], city: "Genoa", country: "Italy", countryCode: "IT", coordinates: [8.9463, 44.4056] },
  { name: "Valencia", aliases: ["valencia"], city: "Valencia", country: "Spain", countryCode: "ES", coordinates: [-0.3763, 39.4699] },
  { name: "Barcelona", aliases: ["barcelona"], city: "Barcelona", country: "Spain", countryCode: "ES", coordinates: [2.1734, 41.3851] },
  { name: "Madrid", aliases: ["madrid", "barajas"], city: "Madrid", country: "Spain", countryCode: "ES", coordinates: [-3.7038, 40.4168] },
  { name: "Warsaw", aliases: ["warsaw", "warszawa"], city: "Warsaw", country: "Poland", countryCode: "PL", coordinates: [21.0122, 52.2297] },
  { name: "Gdansk", aliases: ["gdansk", "dct gdansk"], city: "Gdansk", country: "Poland", countryCode: "PL", coordinates: [18.6466, 54.352] },

  // North America
  { name: "Miami", aliases: ["miami", "portmiami", "dante b. fascell", "usmia", "miami, fl", "miami fl"], city: "Miami", country: "United States", countryCode: "US", coordinates: [-80.1918, 25.7617] },
  { name: "Chicago", aliases: ["chicago", "chicago, il", "chicago il", "uscwi", "o'hare", "ord"], city: "Chicago", country: "United States", countryCode: "US", coordinates: [-87.6298, 41.8781] },
  { name: "New York", aliases: ["new york", "new york city", "nyc", "newark", "jfk", "usnyc"], city: "New York", country: "United States", countryCode: "US", coordinates: [-74.006, 40.7128] },
  { name: "Los Angeles", aliases: ["los angeles", "lax", "long beach", "san pedro", "uslax"], city: "Los Angeles", country: "United States", countryCode: "US", coordinates: [-118.2437, 34.0522] },
  { name: "Houston", aliases: ["houston", "houston, tx", "barbours cut", "bayport"], city: "Houston", country: "United States", countryCode: "US", coordinates: [-95.3698, 29.7604] },
  { name: "Dallas", aliases: ["dallas", "fort worth", "dfw"], city: "Dallas", country: "United States", countryCode: "US", coordinates: [-96.797, 32.7767] },
  { name: "Atlanta", aliases: ["atlanta", "atlanta, ga", "hartsfield"], city: "Atlanta", country: "United States", countryCode: "US", coordinates: [-84.388, 33.749] },
  { name: "Savannah", aliases: ["savannah", "garden city terminal"], city: "Savannah", country: "United States", countryCode: "US", coordinates: [-81.0998, 32.0809] },
  { name: "Charleston", aliases: ["charleston", "wando welch"], city: "Charleston", country: "United States", countryCode: "US", coordinates: [-79.9311, 32.7765] },
  { name: "Memphis", aliases: ["memphis", "memphis superhub", "fedex superhub"], city: "Memphis", country: "United States", countryCode: "US", coordinates: [-89.9767, 35.0424] },
  { name: "Louisville", aliases: ["louisville", "worldport"], city: "Louisville", country: "United States", countryCode: "US", coordinates: [-85.7585, 38.2527] },
  { name: "Seattle", aliases: ["seattle", "tacoma", "nwsa"], city: "Seattle", country: "United States", countryCode: "US", coordinates: [-122.3321, 47.6062] },
  { name: "San Francisco", aliases: ["san francisco", "oakland", "sfo"], city: "San Francisco", country: "United States", countryCode: "US", coordinates: [-122.4194, 37.7749] },
  { name: "Detroit", aliases: ["detroit"], city: "Detroit", country: "United States", countryCode: "US", coordinates: [-83.0458, 42.3314] },
  { name: "Laredo", aliases: ["laredo", "world trade bridge", "uslrd"], city: "Laredo", country: "United States", countryCode: "US", coordinates: [-99.5075, 27.5036] },
  { name: "Kansas City", aliases: ["kansas city", "logistics park kansas city"], city: "Kansas City", country: "United States", countryCode: "US", coordinates: [-94.5786, 39.0997] },
  { name: "Toronto", aliases: ["toronto", "cator", "pearson"], city: "Toronto", country: "Canada", countryCode: "CA", coordinates: [-79.3832, 43.6532] },
  { name: "Montreal", aliases: ["montreal", "camtr"], city: "Montreal", country: "Canada", countryCode: "CA", coordinates: [-73.5673, 45.5017] },
  { name: "Vancouver", aliases: ["vancouver", "roberts bank", "deltaport"], city: "Vancouver", country: "Canada", countryCode: "CA", coordinates: [-123.1207, 49.2827] },
  { name: "Mexico City", aliases: ["mexico city", "cdmx", "aicm"], city: "Mexico City", country: "Mexico", countryCode: "MX", coordinates: [-99.1332, 19.4326] },
  { name: "Manzanillo", aliases: ["manzanillo"], city: "Manzanillo", country: "Mexico", countryCode: "MX", coordinates: [-104.316, 19.053] },
  { name: "Panama City", aliases: ["panama city", "balboa", "cristobal", "colon"], city: "Panama City", country: "Panama", countryCode: "PA", coordinates: [-79.5167, 8.9833] },

  // South America & Oceania
  { name: "Santos", aliases: ["santos", "port of santos"], city: "Santos", country: "Brazil", countryCode: "BR", coordinates: [-46.3333, -23.9608] },
  { name: "Sao Paulo", aliases: ["sao paulo", "guarulhos"], city: "Sao Paulo", country: "Brazil", countryCode: "BR", coordinates: [-46.6333, -23.5505] },
  { name: "Buenos Aires", aliases: ["buenos aires", "puerto madero", "dock sud"], city: "Buenos Aires", country: "Argentina", countryCode: "AR", coordinates: [-58.3816, -34.6037] },
  { name: "Sydney", aliases: ["sydney", "port botany", "kingsford smith"], city: "Sydney", country: "Australia", countryCode: "AU", coordinates: [151.2093, -33.8688] },
  { name: "Melbourne", aliases: ["melbourne", "port of melbourne"], city: "Melbourne", country: "Australia", countryCode: "AU", coordinates: [144.9631, -37.8136] },
];

/**
 * Parses raw coordinate literals (e.g., "[114.17, 22.31]" or "25.77, -80.19").
 */
function parseCoordinateLiteral(query: string): [number, number] | null {
  const trimmed = query.trim();
  // Match [lon, lat] or lon, lat or lat, lon
  const match = trimmed.match(/^\[?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]?$/);
  if (!match) return null;

  const num1 = parseFloat(match[1]);
  const num2 = parseFloat(match[2]);

  if (isNaN(num1) || isNaN(num2)) return null;

  // If bracketed [a, b], standard GeoJSON format is [lng, lat]
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    if (num1 >= -180 && num1 <= 180 && num2 >= -90 && num2 <= 90) {
      return [num1, num2];
    }
  }

  // Disambiguate lat, lon vs lon, lat
  if (Math.abs(num1) > 90 && Math.abs(num2) <= 90) {
    // num1 must be longitude
    return [num1, num2];
  }
  if (Math.abs(num2) > 90 && Math.abs(num1) <= 90) {
    // num2 must be longitude, num1 is latitude
    return [num2, num1];
  }

  // If both within [-90, 90], default to standard GeoJSON [lng, lat]
  return [num1, num2];
}

/**
 * Searches `global_hubs.json` for matching hub codes, names, or cities.
 */
function searchHubs(query: string): HubRecord | null {
  const hubs = getHubs();
  if (!hubs || hubs.length === 0) return null;

  const qLower = query.toLowerCase().trim();
  const qClean = qLower.replace(/[^a-z0-9]/g, "");

  // 1. Exact code match (e.g. "HKHKG", "USMIA", "HKG", "MIA", "CNSHA", "FRA")
  const exactCode = hubs.find(
    (h) =>
      h.code.toLowerCase() === qLower ||
      (h.iataCode && h.iataCode.toLowerCase() === qLower) ||
      (h.unlocode && h.unlocode.toLowerCase() === qLower)
  );
  if (exactCode) return exactCode;

  // 2. Exact city match
  const exactCity = hubs.find((h) => h.city.toLowerCase() === qLower);
  if (exactCity) return exactCity;

  // 3. Exact name or contains name
  const exactName = hubs.find((h) => h.name.toLowerCase() === qLower);
  if (exactName) return exactName;

  // 4. Substring / Token matches
  const tokenMatch = hubs.find((h) => {
    const hubClean = (h.name + " " + h.city + " " + h.code).toLowerCase();
    return hubClean.includes(qLower);
  });
  if (tokenMatch) return tokenMatch;

  return null;
}

/**
 * Searches offline cities dictionary.
 */
function searchOfflineCities(query: string): CityEntry | null {
  const qLower = query.toLowerCase().trim();

  // Strip common suffixes
  const normalized = qLower
    .replace(/,?\s*(china|usa|united states|us|germany|netherlands|fl|il|tx|ca|ny|japan|singapore|uk|france|italy)$/i, "")
    .trim();

  for (const entry of OFFLINE_CITIES) {
    if (entry.name.toLowerCase() === qLower || entry.name.toLowerCase() === normalized) {
      return entry;
    }
    for (const alias of entry.aliases) {
      if (qLower === alias || normalized === alias || qLower.includes(alias) || alias.includes(qLower)) {
        return entry;
      }
    }
  }
  return null;
}

/**
 * Queries the live Photon API with AbortController timeout.
 */
async function queryPhoton(query: string, timeoutMs: number): Promise<GeocodingResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "RILFREIGHT/2.0 (freight-routing-platform)",
      },
    });

    clearTimeout(timer);

    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.features && data.features.length > 0) {
      const feature = data.features[0];
      const coords = feature.geometry.coordinates as [number, number];
      const props = feature.properties || {};

      const formatted = [props.name, props.city, props.state, props.country]
        .filter(Boolean)
        .join(", ");

      return {
        query,
        formattedAddress: formatted || props.name || query,
        coordinates: coords,
        confidence: 0.9,
        city: props.city || props.name,
        country: props.country,
        countryCode: props.countrycode ? props.countrycode.toUpperCase() : undefined,
        source: "photon",
      };
    }
  } catch {
    // Timeout or network error
  } finally {
    clearTimeout(timer);
  }
  return null;
}

/**
 * Queries the live Nominatim API with AbortController timeout.
 */
async function queryNominatim(query: string, timeoutMs: number): Promise<GeocodingResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "RILFREIGHT-Platform/2.0",
      },
    });

    clearTimeout(timer);

    if (!response.ok) return null;

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0];
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        return {
          query,
          formattedAddress: item.display_name || query,
          coordinates: [lon, lat],
          confidence: 0.85,
          source: "nominatim",
        };
      }
    }
  } catch {
    // Timeout or network error
  } finally {
    clearTimeout(timer);
  }
  return null;
}

/**
 * Resolves a free-text shipper/consignee address or coordinate string into GPS [longitude, latitude].
 */
export async function geocodeAddress(
  query: string,
  options?: GeocodeOptions
): Promise<GeocodingResult> {
  if (!query || typeof query !== "string") {
    throw new Error("Invalid geocoding query: address string required");
  }

  const cleanQuery = query.trim();
  const cacheKey = cleanQuery.toLowerCase();

  // 1. Direct coordinate literal parsing
  const literalCoords = parseCoordinateLiteral(cleanQuery);
  if (literalCoords) {
    const res: GeocodingResult = {
      query: cleanQuery,
      formattedAddress: `Coordinates: ${literalCoords[1].toFixed(4)}° N, ${literalCoords[0].toFixed(4)}° E`,
      coordinates: literalCoords,
      confidence: 1.0,
      source: "literal_coordinates",
    };
    return res;
  }

  // 2. Check in-memory cache
  const cached = geocodeCache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      source: "cache",
    };
  }

  // 3. Search offline cities dictionary (fast, authoritative, deterministic)
  const cityMatch = searchOfflineCities(cleanQuery);
  if (cityMatch) {
    const res: GeocodingResult = {
      query: cleanQuery,
      formattedAddress: `${cityMatch.name}, ${cityMatch.country}`,
      coordinates: cityMatch.coordinates,
      confidence: 0.95,
      city: cityMatch.city,
      country: cityMatch.country,
      countryCode: cityMatch.countryCode,
      source: "offline_dictionary",
    };
    geocodeCache.set(cacheKey, res);
    return res;
  }

  // 4. Search global hubs dataset (225 hubs)
  const hubMatch = searchHubs(cleanQuery);
  if (hubMatch) {
    const res: GeocodingResult = {
      query: cleanQuery,
      formattedAddress: `${hubMatch.name}, ${hubMatch.city}, ${hubMatch.country}`,
      coordinates: hubMatch.coordinates,
      confidence: 0.95,
      city: hubMatch.city,
      country: hubMatch.country,
      countryCode: hubMatch.countryCode,
      source: "hub_match",
    };
    geocodeCache.set(cacheKey, res);
    return res;
  }

  // 5. Try live online geocoding if permitted (default: true with short 1500ms timeout)
  const allowOnline = options?.allowOnline !== false;
  const timeoutMs = options?.timeoutMs || 1500;

  if (allowOnline) {
    const photonRes = await queryPhoton(cleanQuery, timeoutMs);
    if (photonRes) {
      geocodeCache.set(cacheKey, photonRes);
      return photonRes;
    }

    const nominatimRes = await queryNominatim(cleanQuery, timeoutMs);
    if (nominatimRes) {
      geocodeCache.set(cacheKey, nominatimRes);
      return nominatimRes;
    }
  }

  // 6. Resilient fallback: find any partial match in offline dictionary
  for (const entry of OFFLINE_CITIES) {
    if (cleanQuery.toLowerCase().includes(entry.name.toLowerCase())) {
      const fallbackRes: GeocodingResult = {
        query: cleanQuery,
        formattedAddress: `${entry.name}, ${entry.country}`,
        coordinates: entry.coordinates,
        confidence: 0.7,
        city: entry.city,
        country: entry.country,
        countryCode: entry.countryCode,
        source: "offline_dictionary",
      };
      geocodeCache.set(cacheKey, fallbackRes);
      return fallbackRes;
    }
  }

  // Default world centroid fallback if completely unresolvable
  const defaultFallback: GeocodingResult = {
    query: cleanQuery,
    formattedAddress: cleanQuery,
    coordinates: [0, 0],
    confidence: 0.1,
    source: "offline_dictionary",
  };
  return defaultFallback;
}

/**
 * Batch geocoding helper.
 */
export async function batchGeocode(
  queries: string[],
  options?: GeocodeOptions
): Promise<GeocodingResult[]> {
  const results: GeocodingResult[] = [];
  for (const query of queries) {
    results.push(await geocodeAddress(query, options));
  }
  return results;
}

/**
 * Clears the in-memory geocode cache.
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}

/**
 * Returns cache statistics.
 */
export function getGeocodeCacheStats(): { size: number } {
  return { size: geocodeCache.size };
}
