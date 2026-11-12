/**
 * RILFREIGHT Spatial Gateway Matcher
 * 
 * Snaps arbitrary GPS coordinates to authoritative global logistics hubs
 * (225 certified hubs in `global_hubs.json`) using spherical Haversine trigonometry
 * and modal facility filtering.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TransportMode } from "@/shared/types";

export interface GlobalHub {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  coordinates: [number, number]; // [longitude, latitude]
  type: string;                  // "seaport" | "airport" | "rail_terminal" | "road_hub"
  tier?: number;
  source?: string;
  iataCode?: string;
  icaoCode?: string;
  unlocode?: string;
  timezone?: string;
  continent?: string;
  modesSupported: TransportMode[];
  customsFacility?: boolean;
  averageDwellHours?: number;
}

export type GlobalHubRecord = GlobalHub;

export interface GatewayMatchResult {
  hub: GlobalHub;
  distanceKm: number;
  distanceNm: number;
  mode: TransportMode;
  modeMatched?: TransportMode;
  drayageRequired?: boolean;
}

export interface GatewayMatchOptions {
  maxDistanceKm?: number;
  tierFilter?: number;
  excludeCodes?: string[];
  preferredCountryCode?: string;
  allowFallbackMode?: boolean;
}

// Built-in baseline fallback hubs if JSON file is missing
const BASELINE_HUBS: GlobalHub[] = [
  { id: "hub-seaport-HKHKG", code: "HKHKG", name: "Port of Hong Kong", city: "Hong Kong", country: "Hong Kong", countryCode: "HK", coordinates: [114.169, 22.319], type: "seaport", tier: 1, modesSupported: ["ocean"], customsFacility: true, averageDwellHours: 18 },
  { id: "hub-airport-HKG", code: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong", countryCode: "HK", coordinates: [113.9145, 22.308], type: "airport", tier: 1, modesSupported: ["air"], customsFacility: true, averageDwellHours: 6 },
  { id: "hub-seaport-USMIA", code: "USMIA", name: "PortMiami", city: "Miami", country: "United States", countryCode: "US", coordinates: [-80.191, 25.761], type: "seaport", tier: 1, modesSupported: ["ocean"], customsFacility: true, averageDwellHours: 20 },
  { id: "hub-airport-MIA", code: "MIA", name: "Miami International Airport", city: "Miami", country: "United States", countryCode: "US", coordinates: [-80.2905, 25.7958], type: "airport", tier: 1, modesSupported: ["air"], customsFacility: true, averageDwellHours: 8 },
  { id: "hub-seaport-CNSHA", code: "CNSHA", name: "Port of Shanghai", city: "Shanghai", country: "China", countryCode: "CN", coordinates: [121.5, 31.0], type: "seaport", tier: 1, modesSupported: ["ocean"], customsFacility: true, averageDwellHours: 24 },
  { id: "hub-airport-PVG", code: "PVG", name: "Shanghai Pudong International Airport", city: "Shanghai", country: "China", countryCode: "CN", coordinates: [121.805, 31.143], type: "airport", tier: 1, modesSupported: ["air"], customsFacility: true, averageDwellHours: 8 },
  { id: "hub-seaport-NLRTM", code: "NLRTM", name: "Port of Rotterdam", city: "Rotterdam", country: "Netherlands", countryCode: "NL", coordinates: [4.42, 51.88], type: "seaport", tier: 1, modesSupported: ["ocean"], customsFacility: true, averageDwellHours: 22 },
  { id: "hub-airport-FRA", code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", countryCode: "DE", coordinates: [8.57, 50.033], type: "airport", tier: 1, modesSupported: ["air"], customsFacility: true, averageDwellHours: 7 },
  { id: "hub-rail-USCWI", code: "USCWI", name: "Chicago Intermodal Hub", city: "Chicago", country: "United States", countryCode: "US", coordinates: [-87.65, 41.85], type: "rail_terminal", tier: 1, modesSupported: ["rail", "road"], customsFacility: false, averageDwellHours: 12 },
  { id: "hub-rail-DEDUI", code: "DEDUI", name: "Duisburg Intermodal Terminal", city: "Duisburg", country: "Germany", countryCode: "DE", coordinates: [6.75, 51.45], type: "rail_terminal", tier: 1, modesSupported: ["rail", "road"], customsFacility: false, averageDwellHours: 10 },
  { id: "hub-rail-CNXIA", code: "CNXIA", name: "Xi'an Dry Port", city: "Xi'an", country: "China", countryCode: "CN", coordinates: [109.055, 34.38], type: "rail_terminal", tier: 1, modesSupported: ["rail", "road"], customsFacility: true, averageDwellHours: 14 },
];

let globalHubsCache: GlobalHub[] | null = null;

/**
 * Loads all 225 global hubs from `src/server/data/global_hubs.json`.
 */
export function getAllGlobalHubs(): GlobalHub[] {
  if (globalHubsCache) return globalHubsCache;

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
      const content = fs.readFileSync(hubsPath, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalHubsCache = parsed;
        return globalHubsCache;
      }
    }
  } catch (err) {
    console.warn("Could not load global_hubs.json:", err);
  }

  globalHubsCache = BASELINE_HUBS;
  return globalHubsCache;
}

/**
 * Calculates Great-Circle Haversine distance in kilometers between two [lon, lat] coordinates.
 * Earth mean radius R = 6371.0 km.
 */
export function calculateHaversineKm(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  if (lon1 === lon2 && lat1 === lat2) return 0;

  const R = 6371.0; // Mean Earth radius in km
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;

  const lat1Rad = lat1 * toRad;
  const lat2Rad = lat2 * toRad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return R * c;
}

/**
 * Converts kilometers to nautical miles (1 NM = 1.852 km).
 */
export function kmToNauticalMiles(km: number): number {
  return km / 1.852;
}

/**
 * Checks if a hub supports the specified transport mode.
 */
function hubSupportsMode(hub: GlobalHub, mode: TransportMode): boolean {
  if (hub.modesSupported && hub.modesSupported.includes(mode)) {
    return true;
  }
  switch (mode) {
    case "ocean":
      return hub.type === "seaport";
    case "air":
      return hub.type === "airport";
    case "rail":
      return hub.type === "rail_terminal" || hub.type === "road_hub";
    case "road":
      return hub.type === "road_hub" || hub.type === "rail_terminal";
    default:
      return false;
  }
}

/**
 * Matches a spatial coordinate [lon, lat] to the nearest logistics hub gateway supporting the transport mode.
 */
export function matchGateway(
  coordinates: [number, number],
  mode: TransportMode,
  options?: GatewayMatchOptions
): GatewayMatchResult {
  const ranked = matchTopGateways(coordinates, mode, 1, options);
  if (ranked.length > 0) {
    return ranked[0];
  }

  // Fallback if no hub matched filters
  const allHubs = getAllGlobalHubs();
  const fallbackHub = allHubs.find((h) => hubSupportsMode(h, mode)) || allHubs[0];
  const distanceKm = calculateHaversineKm(coordinates, fallbackHub.coordinates);

  return {
    hub: fallbackHub,
    distanceKm,
    distanceNm: kmToNauticalMiles(distanceKm),
    mode,
    modeMatched: mode,
    drayageRequired: distanceKm > 50,
  };
}

/**
 * Finds and ranks the top K gateways closest to the coordinate supporting the transport mode.
 * Results are sorted strictly ascending by distanceKm.
 */
export function matchTopGateways(
  coordinates: [number, number],
  mode: TransportMode,
  limit: number = 5,
  options?: GatewayMatchOptions
): GatewayMatchResult[] {
  const allHubs = getAllGlobalHubs();
  const excludeCodes = new Set(options?.excludeCodes || []);

  // Filter candidates by mode and constraints
  let candidates = allHubs.filter((hub) => {
    if (excludeCodes.has(hub.code)) return false;
    if (options?.tierFilter && hub.tier !== options.tierFilter) return false;
    if (options?.preferredCountryCode && hub.countryCode !== options.preferredCountryCode) {
      // Keep preferred country or allow all if empty
    }
    return hubSupportsMode(hub, mode);
  });

  // If no candidate in mode and allowFallbackMode is true
  if (candidates.length === 0 && options?.allowFallbackMode !== false) {
    if (mode === "rail") {
      candidates = allHubs.filter((h) => h.type === "road_hub" || h.modesSupported?.includes("road"));
    } else {
      candidates = allHubs;
    }
  }

  // Calculate distances and sort
  const scored = candidates.map((hub) => {
    const distanceKm = calculateHaversineKm(coordinates, hub.coordinates);
    return {
      hub,
      distanceKm,
      distanceNm: kmToNauticalMiles(distanceKm),
      mode,
      modeMatched: mode,
      drayageRequired: distanceKm > 50,
    };
  });

  scored.sort((a, b) => a.distanceKm - b.distanceKm);

  if (options?.maxDistanceKm) {
    const filtered = scored.filter((item) => item.distanceKm <= options.maxDistanceKm!);
    if (filtered.length > 0) return filtered.slice(0, limit);
  }

  return scored.slice(0, limit);
}

/**
 * Finds the N nearest logistics hubs to a coordinate, optionally filtered by mode.
 */
export function findNearestHubs(
  coordinates: [number, number],
  mode?: TransportMode,
  limit: number = 5
): Array<{ hub: GlobalHub; distanceKm: number }> {
  const allHubs = getAllGlobalHubs();
  const candidates = mode ? allHubs.filter((h) => hubSupportsMode(h, mode)) : allHubs;

  const mapped = candidates.map((hub) => ({
    hub,
    distanceKm: calculateHaversineKm(coordinates, hub.coordinates),
  }));

  mapped.sort((a, b) => a.distanceKm - b.distanceKm);
  return mapped.slice(0, limit);
}

/**
 * Matches both origin and destination coordinates to their respective gateways.
 */
export function matchBimodalGateways(
  originCoord: [number, number],
  destCoord: [number, number],
  mode: TransportMode
): {
  originGateway: GatewayMatchResult;
  destGateway: GatewayMatchResult;
} {
  const originGateway = matchGateway(originCoord, mode);
  const destGateway = matchGateway(destCoord, mode, {
    excludeCodes: [originGateway.hub.code],
  });

  return { originGateway, destGateway };
}
