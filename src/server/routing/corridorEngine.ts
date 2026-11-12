/**
 * RILFREIGHT Trade Corridor Engine
 * 
 * Generates realistic multimodal route trajectories and waypoints:
 * 1. Air Mode: Great Circle geodesic curved flight trajectories via `@turf/great-circle` (>=30 waypoints, cruising speed ~850 km/h).
 * 2. Ocean Mode: Maritime sea routes avoiding landmasses via `searoute-ts` (>=40 points, ~18 knots).
 *    Detects chokepoint passages ('panama', 'suez') and automatically injects intermediate transit waypoints:
 *    - Panama Canal: Balboa Locks (`[-79.57, 8.95]`) & Cristobal Locks (`[-79.91, 9.35]`).
 *    - Suez Canal: Suez South Entry (`[32.55, 29.95]`) & Port Said Exit (`[32.31, 31.26]`).
 * 3. Rail & Road Mode: Continental intermodal graph traversal over `trade_corridors.json`
 *    (`networkNodes` and `networkEdges`) using Dijkstra shortest path and polyline stitching.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import turfGreatCircle from "@turf/great-circle";
import { seaRoute } from "searoute-ts";
import type { TransportMode, RouteWaypoint } from "@/shared/types";
import type { GlobalHub } from "./gatewayMatcher";

export interface CorridorRouteResult {
  mode: TransportMode;
  coordinates: [number, number][]; // High-density [lng, lat] polyline
  distanceKm: number;
  distanceNm: number;
  durationHours: number;
  passages: string[];               // e.g. ['panama', 'suez']
  waypoints: RouteWaypoint[];
  firstMileKm?: number;
  mainLegKm?: number;
  lastMileKm?: number;
  originGateway?: GlobalHub;
  destGateway?: GlobalHub;
}

export interface CorridorRouteOptions {
  originHub?: GlobalHub;
  destHub?: GlobalHub;
  npoints?: number; // For air geodesic interpolation
}

interface NetworkNode {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  countryCode: string;
  coordinates: [number, number];
  modes: string[];
}

interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  distanceKm: number;
  modes: string[];
  path: [number, number][];
}

interface TradeCorridorsData {
  networkNodes?: NetworkNode[];
  networkEdges?: NetworkEdge[];
}

let cachedCorridorData: TradeCorridorsData | null = null;

function getTradeCorridorsData(): TradeCorridorsData {
  if (cachedCorridorData) return cachedCorridorData;

  try {
    let corridorsPath = "";
    try {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      corridorsPath = path.resolve(currentDir, "../data/trade_corridors.json");
    } catch {
      corridorsPath = path.resolve(process.cwd(), "src/server/data/trade_corridors.json");
    }
    if (!fs.existsSync(corridorsPath)) {
      corridorsPath = path.resolve(process.cwd(), "rilfreight/src/server/data/trade_corridors.json");
    }
    if (fs.existsSync(corridorsPath)) {
      const content = fs.readFileSync(corridorsPath, "utf-8");
      cachedCorridorData = JSON.parse(content);
      return cachedCorridorData || {};
    }
  } catch (err) {
    console.warn("Could not load trade_corridors.json:", err);
  }
  return {};
}

/**
 * Spherical Haversine distance calculator.
 */
function haversineKm(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  if (lon1 === lon2 && lat1 === lat2) return 0;
  const R = 6371.0;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

/**
 * Calculates Great-Circle Geodesic flight path using `@turf/great-circle`.
 */
export function calculateAirArc(
  origin: [number, number],
  destination: [number, number],
  npoints: number = 60
): { coordinates: [number, number][]; distanceKm: number } {
  const arcFeature = turfGreatCircle(origin, destination, { npoints });

  let rawCoords: [number, number][] = [];
  if (arcFeature.geometry.type === "LineString") {
    rawCoords = arcFeature.geometry.coordinates as [number, number][];
  } else if (arcFeature.geometry.type === "MultiLineString") {
    // Flatten MultiLineString (happens when crossing the antimeridian)
    const multi = arcFeature.geometry.coordinates as [number, number][][];
    for (const segment of multi) {
      rawCoords.push(...segment);
    }
  }

  // Ensure minimum npoints
  if (rawCoords.length < npoints) {
    const interpolated: [number, number][] = [];
    for (let i = 0; i <= npoints; i++) {
      const t = i / npoints;
      interpolated.push([
        origin[0] + (destination[0] - origin[0]) * t,
        origin[1] + (destination[1] - origin[1]) * t,
      ]);
    }
    rawCoords = interpolated;
  }

  // Calculate cumulative geodesic distance
  let distanceKm = 0;
  for (let i = 0; i < rawCoords.length - 1; i++) {
    distanceKm += haversineKm(rawCoords[i], rawCoords[i + 1]);
  }

  if (distanceKm === 0) {
    distanceKm = haversineKm(origin, destination);
  }

  return {
    coordinates: rawCoords,
    distanceKm: Math.round(distanceKm),
  };
}

/**
 * Calculates ocean route avoiding landmasses with canal detection using `searoute-ts`.
 */
export function calculateOceanRoute(
  origin: [number, number],
  destination: [number, number]
): {
  coordinates: [number, number][];
  distanceKm: number;
  distanceNm: number;
  passages: string[];
} {
  try {
    const route = seaRoute(origin, destination, {
      returnPassages: true,
      units: "nauticalmiles",
    });

    if (route && route.geometry && Array.isArray(route.geometry.coordinates)) {
      const rawCoords = route.geometry.coordinates as [number, number][];
      const distanceNm = Math.round(route.properties?.length || 0);
      const passages = Array.isArray(route.properties?.passages)
        ? (route.properties.passages as string[])
        : [];

      return {
        coordinates: rawCoords,
        distanceKm: Math.round(distanceNm * 1.852),
        distanceNm,
        passages,
      };
    }
  } catch (err) {
    console.warn("searoute-ts calculation fallback:", err);
  }

  // Fallback direct marine line if searoute fails
  const directKm = Math.round(haversineKm(origin, destination));
  const directNm = Math.round(directKm / 1.852);
  const fallbackCoords: [number, number][] = [];
  const steps = 50;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fallbackCoords.push([
      origin[0] + (destination[0] - origin[0]) * t,
      origin[1] + (destination[1] - origin[1]) * t,
    ]);
  }

  return {
    coordinates: fallbackCoords,
    distanceKm: directKm,
    distanceNm: directNm,
    passages: [],
  };
}

/**
 * Dijkstra shortest path routing over intermodal network graph.
 */
function routeOverlandNetwork(
  origin: [number, number],
  destination: [number, number],
  mode: "rail" | "road"
): {
  coordinates: [number, number][];
  distanceKm: number;
  waypoints: RouteWaypoint[];
} {
  const data = getTradeCorridorsData();
  const nodes = data.networkNodes || [];
  const edges = data.networkEdges || [];

  if (nodes.length === 0 || edges.length === 0) {
    // Linear fallback with 15 steps
    const coords: [number, number][] = [];
    for (let i = 0; i <= 15; i++) {
      const t = i / 15;
      coords.push([
        origin[0] + (destination[0] - origin[0]) * t,
        origin[1] + (destination[1] - origin[1]) * t,
      ]);
    }
    const dist = Math.round(haversineKm(origin, destination));
    return { coordinates: coords, distanceKm: dist, waypoints: [] };
  }

  // Find nearest starting and ending network nodes
  let startNode = nodes[0];
  let endNode = nodes[0];
  let minStartDist = Infinity;
  let minEndDist = Infinity;

  for (const node of nodes) {
    const dStart = haversineKm(origin, node.coordinates);
    if (dStart < minStartDist) {
      minStartDist = dStart;
      startNode = node;
    }
    const dEnd = haversineKm(destination, node.coordinates);
    if (dEnd < minEndDist) {
      minEndDist = dEnd;
      endNode = node;
    }
  }

  // Build adjacency graph filtered by mode
  const adj = new Map<string, Array<{ to: string; distanceKm: number; path: [number, number][] }>>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    if (edge.modes && edge.modes.includes(mode)) {
      if (!adj.has(edge.from)) adj.set(edge.from, []);
      if (!adj.has(edge.to)) adj.set(edge.to, []);

      // Forward
      adj.get(edge.from)!.push({
        to: edge.to,
        distanceKm: edge.distanceKm,
        path: edge.path,
      });

      // Backward (edges are bidirectional)
      const reversedPath = [...edge.path].reverse();
      adj.get(edge.to)!.push({
        to: edge.from,
        distanceKm: edge.distanceKm,
        path: reversedPath,
      });
    }
  }

  // Dijkstra algorithm
  const dist = new Map<string, number>();
  const prev = new Map<string, { fromNode: string; path: [number, number][] }>();
  const visited = new Set<string>();

  for (const node of nodes) {
    dist.set(node.id, Infinity);
  }
  dist.set(startNode.id, 0);

  while (visited.size < nodes.length) {
    // Find unvisited node with lowest distance
    let u: string | null = null;
    let minD = Infinity;
    for (const [nodeId, d] of dist.entries()) {
      if (!visited.has(nodeId) && d < minD) {
        minD = d;
        u = nodeId;
      }
    }

    if (!u || minD === Infinity) break;
    if (u === endNode.id) break;

    visited.add(u);

    const neighbors = adj.get(u) || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.to)) {
        const alt = minD + edge.distanceKm;
        if (alt < (dist.get(edge.to) ?? Infinity)) {
          dist.set(edge.to, alt);
          prev.set(edge.to, { fromNode: u, path: edge.path });
        }
      }
    }
  }

  // Reconstruct path
  if (startNode.id !== endNode.id && prev.has(endNode.id)) {
    const pathEdges: Array<{ fromNode: string; path: [number, number][] }> = [];
    let curr = endNode.id;
    while (prev.has(curr)) {
      const step = prev.get(curr)!;
      pathEdges.unshift(step);
      curr = step.fromNode;
    }

    const fullCoords: [number, number][] = [origin];
    let totalKm = Math.round(minStartDist);

    for (const pe of pathEdges) {
      for (const pt of pe.path) {
        const last = fullCoords[fullCoords.length - 1];
        if (!last || last[0] !== pt[0] || last[1] !== pt[1]) {
          fullCoords.push(pt);
        }
      }
    }

    // Connect to destination
    const lastCoord = fullCoords[fullCoords.length - 1];
    if (!lastCoord || lastCoord[0] !== destination[0] || lastCoord[1] !== destination[1]) {
      fullCoords.push(destination);
    }

    totalKm += (dist.get(endNode.id) || 0) + Math.round(minEndDist);

    // Build intermediate waypoints
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const waypoints: RouteWaypoint[] = [];

    let wpIdx = 1;
    curr = endNode.id;
    const visitedNodeIds: string[] = [endNode.id];
    while (prev.has(curr)) {
      curr = prev.get(curr)!.fromNode;
      visitedNodeIds.unshift(curr);
    }

    for (const nId of visitedNodeIds) {
      const n = nodeMap.get(nId);
      if (n) {
        waypoints.push({
          id: `wp-${wpIdx++}`,
          name: n.name,
          code: n.code,
          country: n.country,
          coordinates: n.coordinates,
          isCompleted: false,
        });
      }
    }

    return {
      coordinates: fullCoords,
      distanceKm: totalKm,
      waypoints,
    };
  }

  // If same node or unroutable, generate intermediate coordinates connecting origin & dest
  const fallbackCoords: [number, number][] = [];
  const steps = 15;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fallbackCoords.push([
      origin[0] + (destination[0] - origin[0]) * t,
      origin[1] + (destination[1] - origin[1]) * t,
    ]);
  }
  const directDistance = Math.round(haversineKm(origin, destination));

  return {
    coordinates: fallbackCoords,
    distanceKm: directDistance,
    waypoints: [
      { id: "wp-1", name: startNode.name, code: startNode.code, country: startNode.country, coordinates: startNode.coordinates, isCompleted: false },
      { id: "wp-2", name: endNode.name, code: endNode.code, country: endNode.country, coordinates: endNode.coordinates, isCompleted: false },
    ],
  };
}

/**
 * Calculates a complete trade corridor route across any transport mode.
 */
export function calculateCorridorRoute(
  originCoords: [number, number],
  destCoords: [number, number],
  mode: TransportMode,
  options?: CorridorRouteOptions
): CorridorRouteResult {
  switch (mode) {
    case "air": {
      const npoints = options?.npoints || 60;
      const arc = calculateAirArc(originCoords, destCoords, npoints);
      const durationHours = Math.round((arc.distanceKm / 850) * 10) / 10; // ~850 km/h cruising speed

      const waypoints: RouteWaypoint[] = [
        {
          id: "wp-origin",
          name: options?.originHub?.name || "Origin Air Cargo Hub",
          code: options?.originHub?.code,
          country: options?.originHub?.country || "Origin",
          coordinates: originCoords,
          isCompleted: true,
        },
        {
          id: "wp-dest",
          name: options?.destHub?.name || "Destination Air Cargo Hub",
          code: options?.destHub?.code,
          country: options?.destHub?.country || "Destination",
          coordinates: destCoords,
          isCompleted: false,
        },
      ];

      return {
        mode: "air",
        coordinates: arc.coordinates,
        distanceKm: arc.distanceKm,
        distanceNm: Math.round(arc.distanceKm / 1.852),
        durationHours: Math.max(1, durationHours),
        passages: [],
        waypoints,
        originGateway: options?.originHub,
        destGateway: options?.destHub,
      };
    }

    case "ocean": {
      const ocean = calculateOceanRoute(originCoords, destCoords);
      const durationHours = Math.round((ocean.distanceNm / 18) * 10) / 10; // ~18 knots

      const waypoints: RouteWaypoint[] = [
        {
          id: "wp-origin",
          name: options?.originHub?.name || "Origin Container Terminal",
          code: options?.originHub?.code,
          country: options?.originHub?.country || "Origin",
          coordinates: originCoords,
          isCompleted: true,
        },
      ];

      // Automatic chokepoint / canal transit waypoint injection
      if (ocean.passages.includes("panama")) {
        waypoints.push(
          {
            id: "wp-panama-balboa",
            name: "Panama Canal (Balboa Pacific Locks)",
            country: "Panama",
            coordinates: [-79.57, 8.95],
            isCompleted: false,
            notes: "Vessel convoy locked through Miraflores & Pedro Miguel locks",
          },
          {
            id: "wp-panama-cristobal",
            name: "Panama Canal (Cristobal Atlantic Locks)",
            country: "Panama",
            coordinates: [-79.91, 9.35],
            isCompleted: false,
            notes: "Vessel cleared Gatun locks into Caribbean Sea",
          }
        );
      }

      if (ocean.passages.includes("suez")) {
        waypoints.push(
          {
            id: "wp-suez-south",
            name: "Suez Canal (South Entry - Port Tewfik)",
            country: "Egypt",
            coordinates: [32.55, 29.95],
            isCompleted: false,
            notes: "Vessel joined northbound convoy at Suez",
          },
          {
            id: "wp-suez-port-said",
            name: "Suez Canal (Port Said Convoy Exit)",
            country: "Egypt",
            coordinates: [32.31, 31.26],
            isCompleted: false,
            notes: "Vessel cleared Port Said into Mediterranean Sea",
          }
        );
      }

      waypoints.push({
        id: "wp-dest",
        name: options?.destHub?.name || "Destination Container Terminal",
        code: options?.destHub?.code,
        country: options?.destHub?.country || "Destination",
        coordinates: destCoords,
        isCompleted: false,
      });

      return {
        mode: "ocean",
        coordinates: ocean.coordinates,
        distanceKm: ocean.distanceKm,
        distanceNm: ocean.distanceNm,
        durationHours: Math.max(24, durationHours),
        passages: ocean.passages,
        waypoints,
        originGateway: options?.originHub,
        destGateway: options?.destHub,
      };
    }

    case "rail": {
      const rail = routeOverlandNetwork(originCoords, destCoords, "rail");
      const durationHours = Math.round((rail.distanceKm / 60) * 10) / 10; // ~60 km/h

      return {
        mode: "rail",
        coordinates: rail.coordinates,
        distanceKm: rail.distanceKm,
        distanceNm: Math.round(rail.distanceKm / 1.852),
        durationHours: Math.max(4, durationHours),
        passages: [],
        waypoints: rail.waypoints,
        originGateway: options?.originHub,
        destGateway: options?.destHub,
      };
    }

    case "road": {
      const road = routeOverlandNetwork(originCoords, destCoords, "road");
      const durationHours = Math.round((road.distanceKm / 75) * 10) / 10; // ~75 km/h

      return {
        mode: "road",
        coordinates: road.coordinates,
        distanceKm: road.distanceKm,
        distanceNm: Math.round(road.distanceKm / 1.852),
        durationHours: Math.max(2, durationHours),
        passages: [],
        waypoints: road.waypoints,
        originGateway: options?.originHub,
        destGateway: options?.destHub,
      };
    }
  }
}
