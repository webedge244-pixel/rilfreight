import { seaRoute } from "searoute-ts";
import turfGreatCircle from "@turf/great-circle";
import type {
  RouteCalculationRequest,
  RouteCalculationResponse,
  RouteWaypoint,
  TransportMode,
  LogisticsDefaults,
} from "@/shared/types";
import { findLocationByCode } from "@/server/data/locations";
import {
  generateOceanBL,
  generateAirAWB,
  generateRailCIM,
  generateRoadCMR,
  generatePublicTrackingCode,
  generateConveyanceDefaults,
} from "@/server/routing/identifiers";
import { generateMilestones } from "@/server/routing/milestones";

/**
 * Calculates the great-circle Haversine distance between two coordinates in kilometers.
 */
export function calculateHaversineKm(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts kilometers to nautical miles.
 */
export function kmToNauticalMiles(km: number): number {
  return km / 1.852;
}

// -----------------------------------------------------------------------------
// Continental Logistics Corridor Network (Rail & Road)
// -----------------------------------------------------------------------------

interface CorridorNode {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  coordinates: [number, number]; // [lng, lat]
}

interface CorridorEdge {
  from: string;
  to: string;
  distanceKm: number;
  modes: ("rail" | "road")[];
  path: [number, number][]; // High-density polyline coordinates
}

const CORRIDOR_NODES: CorridorNode[] = [
  // North America
  { id: "CHI", name: "Chicago Intermodal Hub", code: "USCWI", city: "Chicago", country: "United States", coordinates: [-87.65, 41.85] },
  { id: "LAX", name: "Los Angeles Freight Terminal", code: "USHOB", city: "Los Angeles", country: "United States", coordinates: [-118.195, 34.005] },
  { id: "DET", name: "Detroit Cross-Border Terminal", code: "USDET", city: "Detroit", country: "United States", coordinates: [-83.05, 42.33] },
  { id: "TOR", name: "Toronto Logistics Terminal", code: "CATOR", city: "Toronto", country: "Canada", coordinates: [-79.52, 43.81] },
  { id: "MTR", name: "Montreal Freight Terminal", code: "CAMTR", city: "Montreal", country: "Canada", coordinates: [-73.68, 45.48] },
  { id: "KCK", name: "Kansas City Logistics Park", code: "USKCK", city: "Kansas City", country: "United States", coordinates: [-94.88, 38.83] },
  { id: "DFW", name: "Dallas-Fort Worth Logistics Hub", code: "USDFW", city: "Dallas", country: "United States", coordinates: [-96.75, 32.61] },
  { id: "LRD", name: "Laredo World Trade Bridge", code: "USLRD", city: "Laredo", country: "United States", coordinates: [-99.52, 27.59] },
  { id: "ATL", name: "Atlanta Freight Gateway", code: "USATL", city: "Atlanta", country: "United States", coordinates: [-84.388, 33.749] },
  { id: "MIA", name: "Miami Freight Terminal", code: "USMIA", city: "Miami", country: "United States", coordinates: [-80.25, 25.80] },
  { id: "NYC", name: "New York/New Jersey Gateway", code: "USNYC", city: "New York", country: "United States", coordinates: [-74.072, 40.669] },

  // Europe
  { id: "RTM", name: "Rotterdam Distripark", code: "NLRDP", city: "Rotterdam", country: "Netherlands", coordinates: [4.42, 51.88] },
  { id: "DUI", name: "Duisburg Intermodal Terminal", code: "DEDUI", city: "Duisburg", country: "Germany", coordinates: [6.75, 51.45] },
  { id: "FRA", name: "Frankfurt CargoCity", code: "DEFRA", city: "Frankfurt", country: "Germany", coordinates: [8.58, 50.02] },
  { id: "HAM", name: "Hamburg Rail Terminal", code: "DEHAM", city: "Hamburg", country: "Germany", coordinates: [9.92, 53.52] },
  { id: "WAR", name: "Warsaw Spedcont Hub", code: "PLWSC", city: "Warsaw", country: "Poland", coordinates: [20.95, 52.22] },
  { id: "MIL", name: "Milan Segrate Hub", code: "ITMIL", city: "Milan", country: "Italy", coordinates: [9.29, 45.48] },

  // Asia / Eurasian
  { id: "SHA", name: "Shanghai Intermodal Port", code: "CNSHA", city: "Shanghai", country: "China", coordinates: [121.5, 31.0] },
  { id: "ZGO", name: "Zhengzhou Intermodal Hub", code: "CNZGO", city: "Zhengzhou", country: "China", coordinates: [113.72, 34.72] },
  { id: "XIA", name: "Xi'an Dry Port", code: "CNXIA", city: "Xi'an", country: "China", coordinates: [109.055, 34.38] },
  { id: "ALA", name: "Alashankou Border Terminal", code: "CNALA", city: "Alashankou", country: "China", coordinates: [82.57, 45.18] },
];

const CORRIDOR_EDGES: CorridorEdge[] = [
  // Chicago <-> Detroit
  {
    from: "CHI",
    to: "DET",
    distanceKm: 450,
    modes: ["rail", "road"],
    path: [
      [-87.65, 41.85],
      [-86.2, 41.7],
      [-85.1, 42.3],
      [-83.7, 42.3],
      [-83.05, 42.33],
    ],
  },
  // Detroit <-> Toronto (Cross-border)
  {
    from: "DET",
    to: "TOR",
    distanceKm: 370,
    modes: ["rail", "road"],
    path: [
      [-83.05, 42.33],
      [-82.4, 42.97],
      [-81.25, 42.98],
      [-80.0, 43.3],
      [-79.52, 43.81],
    ],
  },
  // Toronto <-> Montreal
  {
    from: "TOR",
    to: "MTR",
    distanceKm: 540,
    modes: ["rail", "road"],
    path: [
      [-79.52, 43.81],
      [-78.3, 44.0],
      [-76.5, 44.23],
      [-74.5, 45.2],
      [-73.68, 45.48],
    ],
  },
  // Chicago <-> Kansas City
  {
    from: "CHI",
    to: "KCK",
    distanceKm: 700,
    modes: ["rail", "road"],
    path: [
      [-87.65, 41.85],
      [-89.5, 41.2],
      [-91.5, 40.5],
      [-93.5, 39.8],
      [-94.88, 38.83],
    ],
  },
  // Kansas City <-> Dallas
  {
    from: "KCK",
    to: "DFW",
    distanceKm: 820,
    modes: ["rail", "road"],
    path: [
      [-94.88, 38.83],
      [-95.5, 37.0],
      [-96.0, 35.5],
      [-97.0, 33.5],
      [-96.75, 32.61],
    ],
  },
  // Dallas <-> Laredo (NAFTA corridor)
  {
    from: "DFW",
    to: "LRD",
    distanceKm: 690,
    modes: ["rail", "road"],
    path: [
      [-96.75, 32.61],
      [-97.5, 31.0],
      [-98.5, 29.5],
      [-99.52, 27.59],
    ],
  },
  // Los Angeles <-> Kansas City (BNSF Southern Transcon)
  {
    from: "LAX",
    to: "KCK",
    distanceKm: 2750,
    modes: ["rail", "road"],
    path: [
      [-118.195, 34.005],
      [-117.0, 34.8],
      [-114.5, 34.8],
      [-111.5, 35.2],
      [-106.5, 35.1],
      [-101.8, 35.2],
      [-97.5, 37.7],
      [-94.88, 38.83],
    ],
  },
  // Chicago <-> Atlanta
  {
    from: "CHI",
    to: "ATL",
    distanceKm: 1150,
    modes: ["rail", "road"],
    path: [
      [-87.65, 41.85],
      [-86.15, 39.77],
      [-85.75, 38.25],
      [-86.78, 36.16],
      [-85.31, 35.05],
      [-84.388, 33.749],
    ],
  },
  // Atlanta <-> Miami
  {
    from: "ATL",
    to: "MIA",
    distanceKm: 1070,
    modes: ["rail", "road"],
    path: [
      [-84.388, 33.749],
      [-83.6, 32.8],
      [-83.2, 30.8],
      [-81.65, 30.33],
      [-81.0, 29.2],
      [-80.2, 26.7],
      [-80.25, 25.80],
    ],
  },
  // Montreal <-> New York
  {
    from: "MTR",
    to: "NYC",
    distanceKm: 610,
    modes: ["rail", "road"],
    path: [
      [-73.68, 45.48],
      [-73.5, 44.5],
      [-73.8, 42.65],
      [-73.9, 41.5],
      [-74.072, 40.669],
    ],
  },
  // New York <-> Atlanta
  {
    from: "NYC",
    to: "ATL",
    distanceKm: 1400,
    modes: ["rail", "road"],
    path: [
      [-74.072, 40.669],
      [-75.2, 39.95],
      [-76.6, 39.3],
      [-77.4, 37.5],
      [-78.6, 35.8],
      [-80.8, 35.2],
      [-84.388, 33.749],
    ],
  },

  // Europe: Rotterdam <-> Duisburg
  {
    from: "RTM",
    to: "DUI",
    distanceKm: 210,
    modes: ["rail", "road"],
    path: [
      [4.42, 51.88],
      [5.1, 51.8],
      [5.9, 51.8],
      [6.75, 51.45],
    ],
  },
  // Duisburg <-> Frankfurt
  {
    from: "DUI",
    to: "FRA",
    distanceKm: 240,
    modes: ["rail", "road"],
    path: [
      [6.75, 51.45],
      [6.95, 50.93],
      [7.6, 50.35],
      [8.58, 50.02],
    ],
  },
  // Duisburg <-> Hamburg
  {
    from: "DUI",
    to: "HAM",
    distanceKm: 380,
    modes: ["rail", "road"],
    path: [
      [6.75, 51.45],
      [7.5, 52.0],
      [8.8, 53.0],
      [9.92, 53.52],
    ],
  },
  // Duisburg <-> Warsaw
  {
    from: "DUI",
    to: "WAR",
    distanceKm: 1100,
    modes: ["rail", "road"],
    path: [
      [6.75, 51.45],
      [9.0, 52.3],
      [13.4, 52.5],
      [16.9, 52.4],
      [20.95, 52.22],
    ],
  },
  // Frankfurt <-> Milan
  {
    from: "FRA",
    to: "MIL",
    distanceKm: 650,
    modes: ["rail", "road"],
    path: [
      [8.58, 50.02],
      [8.2, 48.0],
      [8.5, 47.37],
      [8.9, 46.2],
      [9.29, 45.48],
    ],
  },

  // Asia / Trans-Eurasian: Shanghai <-> Zhengzhou
  {
    from: "SHA",
    to: "ZGO",
    distanceKm: 920,
    modes: ["rail", "road"],
    path: [
      [121.5, 31.0],
      [118.8, 32.0],
      [115.0, 33.5],
      [113.72, 34.72],
    ],
  },
  // Zhengzhou <-> Xi'an
  {
    from: "ZGO",
    to: "XIA",
    distanceKm: 480,
    modes: ["rail", "road"],
    path: [
      [113.72, 34.72],
      [111.0, 34.5],
      [109.055, 34.38],
    ],
  },
  // Xi'an <-> Alashankou
  {
    from: "XIA",
    to: "ALA",
    distanceKm: 3100,
    modes: ["rail", "road"],
    path: [
      [109.055, 34.38],
      [103.8, 36.0],
      [98.5, 39.7],
      [93.5, 42.8],
      [87.6, 43.8],
      [82.57, 45.18],
    ],
  },
  // Alashankou <-> Warsaw (Trans-Eurasian Silk Road)
  {
    from: "ALA",
    to: "WAR",
    distanceKm: 5200,
    modes: ["rail", "road"],
    path: [
      [82.57, 45.18],
      [76.9, 43.2],
      [71.4, 51.1],
      [60.0, 55.0],
      [37.6, 55.7],
      [27.5, 53.9],
      [20.95, 52.22],
    ],
  },
];

/**
 * Finds the closest corridor node to a given coordinate.
 */
function findClosestNode(
  coord: [number, number],
  nodes: CorridorNode[]
): { node: CorridorNode; distanceKm: number } {
  let closest = nodes[0];
  let minDistance = calculateHaversineKm(coord, closest.coordinates);
  for (let i = 1; i < nodes.length; i++) {
    const d = calculateHaversineKm(coord, nodes[i].coordinates);
    if (d < minDistance) {
      minDistance = d;
      closest = nodes[i];
    }
  }
  return { node: closest, distanceKm: minDistance };
}

/**
 * Dijkstra shortest path routing over the continental corridor graph.
 */
function routeCorridorDijkstra(
  origin: [number, number],
  destination: [number, number],
  mode: "rail" | "road"
): {
  coordinates: [number, number][];
  distanceKm: number;
  intermediateNodes: CorridorNode[];
} {
  const startSnap = findClosestNode(origin, CORRIDOR_NODES);
  const endSnap = findClosestNode(destination, CORRIDOR_NODES);

  // If both snap to the same node, draw straight leg through node
  if (startSnap.node.id === endSnap.node.id) {
    const coords: [number, number][] = [origin, startSnap.node.coordinates, destination];
    const dist =
      calculateHaversineKm(origin, startSnap.node.coordinates) +
      calculateHaversineKm(startSnap.node.coordinates, destination);
    return {
      coordinates: coords,
      distanceKm: dist,
      intermediateNodes: [startSnap.node],
    };
  }

  // Build adjacency list for mode
  const adj: Map<string, Array<{ to: string; edge: CorridorEdge }>> = new Map();
  for (const node of CORRIDOR_NODES) {
    adj.set(node.id, []);
  }

  for (const edge of CORRIDOR_EDGES) {
    if (edge.modes.includes(mode)) {
      adj.get(edge.from)?.push({ to: edge.to, edge });
      // Graph is bidirectional
      const revEdge: CorridorEdge = {
        from: edge.to,
        to: edge.from,
        distanceKm: edge.distanceKm,
        modes: edge.modes,
        path: [...edge.path].reverse(),
      };
      adj.get(edge.to)?.push({ to: edge.from, edge: revEdge });
    }
  }

  // Priority queue / distances
  const distances = new Map<string, number>();
  const previous = new Map<string, { nodeId: string; edge: CorridorEdge }>();
  const visited = new Set<string>();

  for (const node of CORRIDOR_NODES) {
    distances.set(node.id, Infinity);
  }
  distances.set(startSnap.node.id, 0);

  while (visited.size < CORRIDOR_NODES.length) {
    let currentId: string | null = null;
    let minD = Infinity;

    for (const [id, d] of distances.entries()) {
      if (!visited.has(id) && d < minD) {
        minD = d;
        currentId = id;
      }
    }

    if (!currentId || minD === Infinity || currentId === endSnap.node.id) {
      break;
    }

    visited.add(currentId);

    const neighbors = adj.get(currentId) || [];
    for (const { to, edge } of neighbors) {
      if (visited.has(to)) continue;
      const newDist = minD + edge.distanceKm;
      if (newDist < (distances.get(to) ?? Infinity)) {
        distances.set(to, newDist);
        previous.set(to, { nodeId: currentId, edge });
      }
    }
  }

  // Reconstruct path
  if (!previous.has(endSnap.node.id) && startSnap.node.id !== endSnap.node.id) {
    // No connected corridor found, fallback to direct line
    const directDist = calculateHaversineKm(origin, destination);
    return {
      coordinates: [origin, destination],
      distanceKm: directDist,
      intermediateNodes: [],
    };
  }

  const pathEdges: CorridorEdge[] = [];
  let curr = endSnap.node.id;
  while (curr !== startSnap.node.id) {
    const prev = previous.get(curr);
    if (!prev) break;
    pathEdges.unshift(prev.edge);
    curr = prev.nodeId;
  }

  const assembledCoordinates: [number, number][] = [origin];
  let totalDist = calculateHaversineKm(origin, startSnap.node.coordinates);

  const intermediateNodes: CorridorNode[] = [startSnap.node];

  for (const edge of pathEdges) {
    for (const pt of edge.path) {
      assembledCoordinates.push(pt);
    }
    totalDist += edge.distanceKm;
    const destNode = CORRIDOR_NODES.find((n) => n.id === edge.to);
    if (destNode && !intermediateNodes.includes(destNode)) {
      intermediateNodes.push(destNode);
    }
  }

  assembledCoordinates.push(destination);
  totalDist += calculateHaversineKm(endSnap.node.coordinates, destination);

  return {
    coordinates: assembledCoordinates,
    distanceKm: totalDist,
    intermediateNodes,
  };
}

// -----------------------------------------------------------------------------
// Air Cargo Geodesic Arc Router
// -----------------------------------------------------------------------------

function calculateAirArc(
  origin: [number, number],
  destination: [number, number],
  npoints: number = 50
): { coordinates: [number, number][]; distanceKm: number } {
  const distanceKm = calculateHaversineKm(origin, destination);

  try {
    const gc = (turfGreatCircle as any).default
      ? (turfGreatCircle as any).default(origin, destination, { npoints })
      : (turfGreatCircle as any)(origin, destination, { npoints });

    if (gc?.geometry) {
      if (gc.geometry.type === "LineString") {
        return {
          coordinates: gc.geometry.coordinates as [number, number][],
          distanceKm,
        };
      }
      if (gc.geometry.type === "MultiLineString") {
        const flattened = (gc.geometry.coordinates.flat(1) as [number, number][]);
        return {
          coordinates: flattened,
          distanceKm,
        };
      }
    }
  } catch (err) {
    console.error("Air geodesic arc calculation fallback to direct line:", err);
  }

  // Fallback to interpolated great circle points
  const points: [number, number][] = [];
  for (let i = 0; i <= npoints; i++) {
    const frac = i / npoints;
    const lng = origin[0] + frac * (destination[0] - origin[0]);
    const lat = origin[1] + frac * (destination[1] - origin[1]);
    points.push([lng, lat]);
  }
  return { coordinates: points, distanceKm };
}

// -----------------------------------------------------------------------------
// Ocean Freight Router (searoute-ts with Panama / Suez chokepoint handling)
// -----------------------------------------------------------------------------

function calculateOceanRoute(
  origin: [number, number],
  destination: [number, number]
): {
  coordinates: [number, number][];
  distanceKm: number;
  distanceNm: number;
  passages: string[];
} {
  try {
    const result = seaRoute(origin, destination, {
      returnPassages: true,
      units: "nauticalmiles",
      appendOriginDestination: true,
      antimeridian: "unwrap",
    });

    const passages = (result.properties?.passages as string[]) || [];
    const distanceNm = Number(result.properties?.length || 0);
    const distanceKm = distanceNm * 1.852;
    const rawCoords = (result.geometry?.coordinates || []) as [number, number][];

    return {
      coordinates: rawCoords.length > 0 ? rawCoords : [origin, destination],
      distanceKm,
      distanceNm,
      passages,
    };
  } catch (err) {
    console.error("Ocean routing error in seaRoute:", err);
    const distKm = calculateHaversineKm(origin, destination);
    return {
      coordinates: [origin, destination],
      distanceKm: distKm,
      distanceNm: kmToNauticalMiles(distKm),
      passages: [],
    };
  }
}

// -----------------------------------------------------------------------------
// Unified Multimodal Routing Engine
// -----------------------------------------------------------------------------

/**
 * Calculates a complete multimodal route, generating real-time coordinates,
 * intermediate chokepoints/waypoints, chronological operational milestones,
 * authentic carrier tracking numbers, and logistics defaults.
 */
export async function calculateMultimodalRoute(
  request: RouteCalculationRequest
): Promise<RouteCalculationResponse> {
  const { mode, origin, destination, departureDate, estimatedDeliveryDate } = request;

  // Resolve coordinates from locations master if needed
  let originCoords = origin.coordinates;
  if (!originCoords && origin.code) {
    const loc = findLocationByCode(origin.code);
    if (loc) originCoords = loc.coordinates;
  }

  let destCoords = destination.coordinates;
  if (!destCoords && destination.code) {
    const loc = findLocationByCode(destination.code);
    if (loc) destCoords = loc.coordinates;
  }

  if (!originCoords || !destCoords) {
    throw new Error(
      `Cannot calculate route: missing coordinates for origin (${origin.name}) or destination (${destination.name})`
    );
  }

  let coordinates: [number, number][] = [];
  let distanceKm = 0;
  let distanceNm = 0;
  let durationHours = 0;
  let passages: string[] = [];
  const waypoints: RouteWaypoint[] = [];

  // Generate origin waypoint
  waypoints.push({
    id: "wp-1",
    name: origin.name,
    code: origin.code,
    country: origin.country,
    coordinates: originCoords,
    estimatedDeparture: departureDate,
    isCompleted: new Date(departureDate).getTime() <= Date.now(),
  });

  switch (mode) {
    case "ocean": {
      const seaRes = calculateOceanRoute(originCoords, destCoords);
      coordinates = seaRes.coordinates;
      distanceKm = seaRes.distanceKm;
      distanceNm = seaRes.distanceNm;
      passages = seaRes.passages;
      durationHours = distanceNm / 18; // ~18 knots

      // Inject transit waypoints for detected canals
      if (passages.includes("panama")) {
        waypoints.push({
          id: `wp-${waypoints.length + 1}`,
          name: "Panama Canal (Pacific Entrance / Balboa)",
          code: "PAPOB",
          country: "Panama",
          coordinates: [-79.57, 8.95],
          isCompleted: false,
          notes: "Maritime lock entry at Miraflores Locks",
        });
        waypoints.push({
          id: `wp-${waypoints.length + 1}`,
          name: "Panama Canal (Atlantic Entrance / Cristobal)",
          code: "PACRI",
          country: "Panama",
          coordinates: [-79.91, 9.35],
          isCompleted: false,
          notes: "Maritime lock exit into Caribbean Sea",
        });
      }

      if (passages.includes("suez")) {
        waypoints.push({
          id: `wp-${waypoints.length + 1}`,
          name: "Suez Canal (South Entry)",
          code: "EGSUE",
          country: "Egypt",
          coordinates: [32.55, 29.95],
          isCompleted: false,
          notes: "Northbound convoy transit entry",
        });
        waypoints.push({
          id: `wp-${waypoints.length + 1}`,
          name: "Port Said (Suez Canal Gateway)",
          code: "EGPSD",
          country: "Egypt",
          coordinates: [32.31, 31.26],
          isCompleted: false,
          notes: "Northbound convoy exit into Mediterranean Sea",
        });
      }
      break;
    }

    case "air": {
      const airRes = calculateAirArc(originCoords, destCoords, 50);
      coordinates = airRes.coordinates;
      distanceKm = airRes.distanceKm;
      distanceNm = kmToNauticalMiles(distanceKm);
      durationHours = distanceKm / 850; // ~850 km/h cruising speed
      break;
    }

    case "rail": {
      const railRes = routeCorridorDijkstra(originCoords, destCoords, "rail");
      coordinates = railRes.coordinates;
      distanceKm = railRes.distanceKm;
      distanceNm = kmToNauticalMiles(distanceKm);
      durationHours = distanceKm / 60; // ~60 km/h average intermodal rail speed

      for (const node of railRes.intermediateNodes) {
        if (node.code !== origin.code && node.code !== destination.code) {
          waypoints.push({
            id: `wp-${waypoints.length + 1}`,
            name: node.name,
            code: node.code,
            country: node.country,
            coordinates: node.coordinates,
            isCompleted: false,
            notes: "Intermodal rail corridor terminal",
          });
        }
      }
      break;
    }

    case "road": {
      const roadRes = routeCorridorDijkstra(originCoords, destCoords, "road");
      coordinates = roadRes.coordinates;
      distanceKm = roadRes.distanceKm;
      distanceNm = kmToNauticalMiles(distanceKm);
      durationHours = distanceKm / 75; // ~75 km/h commercial truck speed

      for (const node of roadRes.intermediateNodes) {
        if (node.code !== origin.code && node.code !== destination.code) {
          waypoints.push({
            id: `wp-${waypoints.length + 1}`,
            name: node.name,
            code: node.code,
            country: node.country,
            coordinates: node.coordinates,
            isCompleted: false,
            notes: "Commercial highway corridor hub",
          });
        }
      }
      break;
    }
  }

  // Inject destination waypoint
  waypoints.push({
    id: `wp-${waypoints.length + 1}`,
    name: destination.name,
    code: destination.code,
    country: destination.country,
    coordinates: destCoords,
    estimatedArrival: estimatedDeliveryDate,
    isCompleted: new Date(estimatedDeliveryDate).getTime() <= Date.now(),
  });

  // Generate logistics identifiers and defaults
  let carrierTrackingCode = "";
  switch (mode) {
    case "ocean":
      carrierTrackingCode = generateOceanBL("RILU");
      break;
    case "air":
      carrierTrackingCode = generateAirAWB("920");
      break;
    case "rail":
      carrierTrackingCode = generateRailCIM();
      break;
    case "road":
      carrierTrackingCode = generateRoadCMR();
      break;
  }

  const destCountryCode = destination.country.slice(0, 2).toUpperCase() || "US";
  const trackingNumber = generatePublicTrackingCode(destCountryCode);

  const deltaLng = destCoords[0] - originCoords[0];
  const logisticsDefaults: LogisticsDefaults = generateConveyanceDefaults(
    mode,
    origin.country,
    destination.country,
    departureDate,
    deltaLng
  );

  // Generate milestones
  const milestones = generateMilestones({
    mode,
    origin: {
      name: origin.name,
      code: origin.code,
      city: origin.city || origin.name,
      country: origin.country,
      coordinates: originCoords,
    },
    destination: {
      name: destination.name,
      code: destination.code,
      city: destination.city || destination.name,
      country: destination.country,
      coordinates: destCoords,
    },
    departureDate,
    estimatedDeliveryDate,
    waypoints,
    passages,
    conveyanceName: logisticsDefaults.conveyanceName,
  });

  return {
    success: true,
    mode,
    distanceKm: Math.round(distanceKm),
    distanceNm: Math.round(distanceNm),
    durationHours: Math.round(durationHours),
    coordinates,
    waypoints,
    milestones,
    carrierTrackingCode,
    trackingNumber,
    logisticsDefaults,
    passages,
  };
}
