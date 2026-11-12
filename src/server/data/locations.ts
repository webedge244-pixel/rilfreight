import type { LocationData, LocationType, TransportMode } from "@/shared/types";

/**
 * Authoritative Global Seaports Database (UN/LOCODE standards)
 */
export const SEAPORTS: LocationData[] = [
  {
    code: "HKHKG",
    name: "Port of Hong Kong (Victoria Harbour)",
    city: "Hong Kong",
    country: "Hong Kong",
    countryCode: "HK",
    coordinates: [114.169, 22.319],
    type: "seaport",
    tier: 1,
  },
  {
    code: "USMIA",
    name: "PortMiami (Dante B. Fascell Port)",
    city: "Miami",
    country: "United States",
    countryCode: "US",
    coordinates: [-80.191, 25.761],
    type: "seaport",
    tier: 1,
  },
  {
    code: "CNSHA",
    name: "Port of Shanghai (Yangshan Deepwater)",
    city: "Shanghai",
    country: "China",
    countryCode: "CN",
    coordinates: [121.5, 31.0],
    type: "seaport",
    tier: 1,
  },
  {
    code: "SGSIN",
    name: "Port of Singapore (PSA Pasir Panjang)",
    city: "Singapore",
    country: "Singapore",
    countryCode: "SG",
    coordinates: [103.85, 1.29],
    type: "seaport",
    tier: 1,
  },
  {
    code: "NLRTM",
    name: "Port of Rotterdam (Maasvlakte)",
    city: "Rotterdam",
    country: "Netherlands",
    countryCode: "NL",
    coordinates: [4.5, 51.9],
    type: "seaport",
    tier: 1,
  },
  {
    code: "USLAX",
    name: "Port of Los Angeles (San Pedro Bay)",
    city: "Los Angeles",
    country: "United States",
    countryCode: "US",
    coordinates: [-118.261, 33.743],
    type: "seaport",
    tier: 1,
  },
  {
    code: "USLGB",
    name: "Port of Long Beach",
    city: "Long Beach",
    country: "United States",
    countryCode: "US",
    coordinates: [-118.214, 33.754],
    type: "seaport",
    tier: 1,
  },
  {
    code: "AEJEA",
    name: "Port of Jebel Ali (DP World)",
    city: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    coordinates: [55.027, 24.985],
    type: "seaport",
    tier: 1,
  },
  {
    code: "BRSSZ",
    name: "Port of Santos",
    city: "Santos",
    country: "Brazil",
    countryCode: "BR",
    coordinates: [-46.315, -23.967],
    type: "seaport",
    tier: 1,
  },
  {
    code: "PAPOB",
    name: "Port of Balboa (Panama Pacific Entry)",
    city: "Panama City",
    country: "Panama",
    countryCode: "PA",
    coordinates: [-79.57, 8.95],
    type: "seaport",
    tier: 1,
  },
  {
    code: "PACRI",
    name: "Port of Cristobal (Panama Atlantic Exit)",
    city: "Colon",
    country: "Panama",
    countryCode: "PA",
    coordinates: [-79.91, 9.35],
    type: "seaport",
    tier: 1,
  },
  {
    code: "EGPSD",
    name: "Port Said (Suez Canal Gateway)",
    city: "Port Said",
    country: "Egypt",
    countryCode: "EG",
    coordinates: [32.31, 31.26],
    type: "seaport",
    tier: 1,
  },
  {
    code: "CAMTR",
    name: "Port of Montreal",
    city: "Montreal",
    country: "Canada",
    countryCode: "CA",
    coordinates: [-73.55, 45.5],
    type: "seaport",
    tier: 2,
  },
  {
    code: "CAHAL",
    name: "Port of Halifax",
    city: "Halifax",
    country: "Canada",
    countryCode: "CA",
    coordinates: [-63.57, 44.65],
    type: "seaport",
    tier: 2,
  },
  {
    code: "DEHAM",
    name: "Port of Hamburg",
    city: "Hamburg",
    country: "Germany",
    countryCode: "DE",
    coordinates: [9.967, 53.533],
    type: "seaport",
    tier: 1,
  },
  {
    code: "BEANR",
    name: "Port of Antwerp-Bruges",
    city: "Antwerp",
    country: "Belgium",
    countryCode: "BE",
    coordinates: [4.402, 51.221],
    type: "seaport",
    tier: 1,
  },
  {
    code: "JPTYO",
    name: "Port of Tokyo",
    city: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    coordinates: [139.771, 35.619],
    type: "seaport",
    tier: 1,
  },
  {
    code: "KRPUS",
    name: "Port of Busan (New Port)",
    city: "Busan",
    country: "South Korea",
    countryCode: "KR",
    coordinates: [129.04, 35.102],
    type: "seaport",
    tier: 1,
  },
  {
    code: "USNYC",
    name: "Port of New York and New Jersey",
    city: "New York",
    country: "United States",
    countryCode: "US",
    coordinates: [-74.072, 40.669],
    type: "seaport",
    tier: 1,
  },
  {
    code: "INNSA",
    name: "Jawaharlal Nehru Port (Nhava Sheva)",
    city: "Navi Mumbai",
    country: "India",
    countryCode: "IN",
    coordinates: [72.95, 18.95],
    type: "seaport",
    tier: 1,
  },
  {
    code: "CNNGB",
    name: "Port of Ningbo-Zhoushan",
    city: "Ningbo",
    country: "China",
    countryCode: "CN",
    coordinates: [121.56, 29.87],
    type: "seaport",
    tier: 1,
  },
  {
    code: "GBFXT",
    name: "Port of Felixstowe",
    city: "Felixstowe",
    country: "United Kingdom",
    countryCode: "GB",
    coordinates: [1.31, 51.95],
    type: "seaport",
    tier: 1,
  },
  {
    code: "AUSYD",
    name: "Port Botany (Sydney)",
    city: "Sydney",
    country: "Australia",
    countryCode: "AU",
    coordinates: [151.21, -33.97],
    type: "seaport",
    tier: 2,
  },
];

/**
 * Authoritative Global Cargo Airports Database (IATA standards)
 */
export const AIRPORTS: LocationData[] = [
  {
    code: "HKG",
    name: "Hong Kong International Airport (SuperTerminal 1)",
    city: "Hong Kong",
    country: "Hong Kong",
    countryCode: "HK",
    coordinates: [113.915, 22.309],
    type: "airport",
    tier: 1,
  },
  {
    code: "MIA",
    name: "Miami International Airport (Cargo Gateway of the Americas)",
    city: "Miami",
    country: "United States",
    countryCode: "US",
    coordinates: [-80.29, 25.795],
    type: "airport",
    tier: 1,
  },
  {
    code: "PVG",
    name: "Shanghai Pudong International Airport (PACTL)",
    city: "Shanghai",
    country: "China",
    countryCode: "CN",
    coordinates: [121.805, 31.144],
    type: "airport",
    tier: 1,
  },
  {
    code: "FRA",
    name: "Frankfurt Airport (CargoCity)",
    city: "Frankfurt",
    country: "Germany",
    countryCode: "DE",
    coordinates: [8.57, 50.03],
    type: "airport",
    tier: 1,
  },
  {
    code: "DXB",
    name: "Dubai International Airport (Emirates SkyCargo)",
    city: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    coordinates: [55.364, 25.253],
    type: "airport",
    tier: 1,
  },
  {
    code: "JFK",
    name: "John F. Kennedy International Airport Cargo Hub",
    city: "New York",
    country: "United States",
    countryCode: "US",
    coordinates: [-73.778, 40.641],
    type: "airport",
    tier: 1,
  },
  {
    code: "SIN",
    name: "Singapore Changi Airport (Airfreight Centre)",
    city: "Singapore",
    country: "Singapore",
    countryCode: "SG",
    coordinates: [103.991, 1.364],
    type: "airport",
    tier: 1,
  },
  {
    code: "ORD",
    name: "Chicago O'Hare International Airport Cargo Area",
    city: "Chicago",
    country: "United States",
    countryCode: "US",
    coordinates: [-87.905, 41.974],
    type: "airport",
    tier: 1,
  },
  {
    code: "AMS",
    name: "Amsterdam Airport Schiphol Cargo Hub",
    city: "Amsterdam",
    country: "Netherlands",
    countryCode: "NL",
    coordinates: [4.764, 52.308],
    type: "airport",
    tier: 1,
  },
  {
    code: "YUL",
    name: "Montreal-Trudeau International Airport Cargo Terminal",
    city: "Montreal",
    country: "Canada",
    countryCode: "CA",
    coordinates: [-73.74, 45.47],
    type: "airport",
    tier: 2,
  },
  {
    code: "YYZ",
    name: "Toronto Pearson International Airport Cargo West",
    city: "Toronto",
    country: "Canada",
    countryCode: "CA",
    coordinates: [-79.63, 43.68],
    type: "airport",
    tier: 2,
  },
  {
    code: "YVR",
    name: "Vancouver International Airport Cargo Terminal",
    city: "Vancouver",
    country: "Canada",
    countryCode: "CA",
    coordinates: [-123.18, 49.19],
    type: "airport",
    tier: 2,
  },
  {
    code: "LAX",
    name: "Los Angeles International Airport (Imperial Cargo Complex)",
    city: "Los Angeles",
    country: "United States",
    countryCode: "US",
    coordinates: [-118.408, 33.942],
    type: "airport",
    tier: 1,
  },
  {
    code: "MEM",
    name: "Memphis International Airport (FedEx SuperHub)",
    city: "Memphis",
    country: "United States",
    countryCode: "US",
    coordinates: [-89.976, 35.042],
    type: "airport",
    tier: 1,
  },
  {
    code: "ANC",
    name: "Ted Stevens Anchorage International Airport (Transpacific Hub)",
    city: "Anchorage",
    country: "United States",
    countryCode: "US",
    coordinates: [-149.996, 61.174],
    type: "airport",
    tier: 1,
  },
  {
    code: "NRT",
    name: "Narita International Airport Cargo Gateway",
    city: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    coordinates: [140.392, 35.765],
    type: "airport",
    tier: 1,
  },
  {
    code: "ICN",
    name: "Incheon International Airport Cargo Terminal",
    city: "Seoul",
    country: "South Korea",
    countryCode: "KR",
    coordinates: [126.44, 37.46],
    type: "airport",
    tier: 1,
  },
  {
    code: "LHR",
    name: "London Heathrow Airport (World Cargo Centre)",
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    coordinates: [-0.454, 51.47],
    type: "airport",
    tier: 1,
  },
];

/**
 * Authoritative Intermodal Rail Terminals Database
 */
export const RAIL_TERMINALS: LocationData[] = [
  {
    code: "USCWI",
    name: "Chicago Corwith Yard (BNSF Railway Intermodal)",
    city: "Chicago",
    country: "United States",
    countryCode: "US",
    coordinates: [-87.65, 41.85],
    type: "rail_terminal",
    tier: 1,
  },
  {
    code: "USHOB",
    name: "Los Angeles Hobart Yard (BNSF Southern Transcon)",
    city: "Los Angeles",
    country: "United States",
    countryCode: "US",
    coordinates: [-118.195, 34.005],
    type: "rail_terminal",
    tier: 1,
  },
  {
    code: "DEDUI",
    name: "Duisburg Intermodal Terminal (DIT / Rhine-Alpine Hub)",
    city: "Duisburg",
    country: "Germany",
    countryCode: "DE",
    coordinates: [6.75, 51.45],
    type: "rail_terminal",
    tier: 1,
  },
  {
    code: "CNXIA",
    name: "Xi'an Dry Port (China-Europe Railway Express Hub)",
    city: "Xi'an",
    country: "China",
    countryCode: "CN",
    coordinates: [109.055, 34.38],
    type: "rail_terminal",
    tier: 1,
  },
  {
    code: "PLWSC",
    name: "Warsaw Spedcont Intermodal Terminal",
    city: "Warsaw",
    country: "Poland",
    countryCode: "PL",
    coordinates: [20.95, 52.22],
    type: "rail_terminal",
    tier: 1,
  },
  {
    code: "CAMTR-R",
    name: "Montreal Taschereau Yard (CN Railway Intermodal)",
    city: "Montreal",
    country: "Canada",
    countryCode: "CA",
    coordinates: [-73.68, 45.48],
    type: "rail_terminal",
    tier: 1,
  },
  {
    code: "CATOR-R",
    name: "Toronto MacMillan Intermodal Yard (CN Rail)",
    city: "Toronto",
    country: "Canada",
    countryCode: "CA",
    coordinates: [-79.52, 43.81],
    type: "rail_terminal",
    tier: 1,
  },
  {
    code: "USKCK",
    name: "Kansas City Logistics Park (BNSF Intermodal)",
    city: "Kansas City",
    country: "United States",
    countryCode: "US",
    coordinates: [-94.88, 38.83],
    type: "rail_terminal",
    tier: 1,
  },
  {
    code: "USDFW-R",
    name: "Dallas Intermodal Facility (UP/BNSF Southern Inland)",
    city: "Dallas",
    country: "United States",
    countryCode: "US",
    coordinates: [-96.75, 32.61],
    type: "rail_terminal",
    tier: 1,
  },
  {
    code: "DEHAM-R",
    name: "Hamburg Waltershof Rail Container Terminal",
    city: "Hamburg",
    country: "Germany",
    countryCode: "DE",
    coordinates: [9.92, 53.52],
    type: "rail_terminal",
    tier: 1,
  },
  {
    code: "CNZGO",
    name: "Zhengzhou Intermodal Rail Port (Belt and Road Hub)",
    city: "Zhengzhou",
    country: "China",
    countryCode: "CN",
    coordinates: [113.72, 34.72],
    type: "rail_terminal",
    tier: 1,
  },
];

/**
 * Authoritative Commercial Road Logistics Hubs Database
 */
export const ROAD_HUBS: LocationData[] = [
  {
    code: "NLRDP",
    name: "Rotterdam Distribution Park (Distripark Botlek)",
    city: "Rotterdam",
    country: "Netherlands",
    countryCode: "NL",
    coordinates: [4.42, 51.88],
    type: "road_hub",
    tier: 1,
  },
  {
    code: "USATL",
    name: "Atlanta Freight & Logistics Hub (I-75/I-85 Freight Nexus)",
    city: "Atlanta",
    country: "United States",
    countryCode: "US",
    coordinates: [-84.388, 33.749],
    type: "road_hub",
    tier: 1,
  },
  {
    code: "DEFRA-C",
    name: "Frankfurt CargoCity Süd Road Logistics Center",
    city: "Frankfurt",
    country: "Germany",
    countryCode: "DE",
    coordinates: [8.58, 50.02],
    type: "road_hub",
    tier: 1,
  },
  {
    code: "USONT",
    name: "Inland Empire Logistics Hub (Ontario / San Bernardino)",
    city: "Ontario",
    country: "United States",
    countryCode: "US",
    coordinates: [-117.57, 34.05],
    type: "road_hub",
    tier: 1,
  },
  {
    code: "USDET",
    name: "Detroit Cross-Border Freight Gateway (Ambassador Corridor)",
    city: "Detroit",
    country: "United States",
    countryCode: "US",
    coordinates: [-83.05, 42.33],
    type: "road_hub",
    tier: 1,
  },
  {
    code: "USLRD",
    name: "Laredo World Trade Bridge Commercial Port of Entry",
    city: "Laredo",
    country: "United States",
    countryCode: "US",
    coordinates: [-99.52, 27.59],
    type: "road_hub",
    tier: 1,
  },
  {
    code: "CATOR-H",
    name: "Toronto Pearson Logistics Corridor (Hwy 401/427)",
    city: "Toronto",
    country: "Canada",
    countryCode: "CA",
    coordinates: [-79.65, 43.7],
    type: "road_hub",
    tier: 1,
  },
  {
    code: "USCHI-H",
    name: "Chicago Freight Logistics Center (I-55 / I-294 Hub)",
    city: "Chicago",
    country: "United States",
    countryCode: "US",
    coordinates: [-87.72, 41.82],
    type: "road_hub",
    tier: 1,
  },
  {
    code: "USMIA-H",
    name: "Miami Free Zone Commercial Cargo Hub",
    city: "Miami",
    country: "United States",
    countryCode: "US",
    coordinates: [-80.35, 25.8],
    type: "road_hub",
    tier: 1,
  },
  {
    code: "MXMTY",
    name: "Monterrey Industrial Logistics Park",
    city: "Monterrey",
    country: "Mexico",
    countryCode: "MX",
    coordinates: [-100.31, 25.68],
    type: "road_hub",
    tier: 2,
  },
];

/**
 * Combined Authoritative Location Master Registry
 */
export const ALL_LOCATIONS: LocationData[] = [
  ...SEAPORTS,
  ...AIRPORTS,
  ...RAIL_TERMINALS,
  ...ROAD_HUBS,
];

/**
 * Finds a location by its exact code (case-insensitive).
 */
export function findLocationByCode(code: string): LocationData | undefined {
  if (!code) return undefined;
  const upperCode = code.trim().toUpperCase();
  return ALL_LOCATIONS.find(
    (loc) => loc.code.toUpperCase() === upperCode
  );
}

/**
 * Returns all locations matching a given type.
 */
export function getLocationsByType(type: LocationType): LocationData[] {
  return ALL_LOCATIONS.filter((loc) => loc.type === type);
}

/**
 * Returns all locations suitable for a specific transport mode.
 */
export function getLocationsForMode(mode: TransportMode): LocationData[] {
  switch (mode) {
    case "ocean":
      return SEAPORTS;
    case "air":
      return AIRPORTS;
    case "rail":
      return RAIL_TERMINALS;
    case "road":
      return ROAD_HUBS;
    default:
      return ALL_LOCATIONS;
  }
}

/**
 * Returns all locations.
 */
export function getAllLocations(): LocationData[] {
  return ALL_LOCATIONS;
}

/**
 * Flexible search across location name, city, country, or code.
 * Optionally filtered by mode and capped by limit.
 */
export function searchLocations(
  queryText: string,
  mode?: TransportMode,
  maxResults: number = 20
): LocationData[] {
  const pool = mode ? getLocationsForMode(mode) : ALL_LOCATIONS;
  if (!queryText || queryText.trim() === "") {
    return pool.slice(0, maxResults);
  }

  const queryClean = queryText.trim().toLowerCase();

  const scored = pool
    .map((loc) => {
      let score = 0;
      const codeLower = loc.code.toLowerCase();
      const nameLower = loc.name.toLowerCase();
      const cityLower = loc.city.toLowerCase();
      const countryLower = loc.country.toLowerCase();

      if (codeLower === queryClean) {
        score += 100;
      } else if (codeLower.startsWith(queryClean)) {
        score += 60;
      } else if (codeLower.includes(queryClean)) {
        score += 40;
      }

      if (cityLower === queryClean) {
        score += 80;
      } else if (cityLower.startsWith(queryClean)) {
        score += 50;
      } else if (cityLower.includes(queryClean)) {
        score += 30;
      }

      if (nameLower.includes(queryClean)) {
        score += 25;
      }

      if (countryLower.includes(queryClean)) {
        score += 20;
      }

      return { loc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map((item) => item.loc);
}
