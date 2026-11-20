/**
 * Builds one polyline per consecutive timeline stop. Prefers the stored
 * shipment corridor when the stops actually sit on it (this keeps the map
 * identical to the planned route), and falls back to a fresh free route for
 * any leg the corridor cannot explain.
 */

import {
  calculateAirArc,
  calculateOceanRoute,
  calculateCorridorRoute,
} from "@/server/routing/corridorEngine";
import {
  haversineKm,
  haversinePathKm,
  isValidCoordinate,
  projectOntoRoute,
  sliceRouteBetweenFractions,
  type Coordinate,
} from "@/features/tracking/lib/geo";
import type {
  TimelineLeg,
  TimelineLegSource,
  TimelineLegStop,
  TimelineLegsPayload,
  TimelineLegsResult,
} from "@/shared/types/timeline";
import type { TransportMode } from "@/shared/types";

const LEG_SPEEDS_KMH: Record<TransportMode, number> = {
  ocean: 33.34,
  air: 850,
  rail: 65,
  road: 75,
};

const PROJECTION_TOLERANCE_KM = 75;
const DUPLICATE_STOP_KM = 1;

export class TimelineLegError extends Error {}

export function normalizeTimelinePayload(raw: unknown): TimelineLegsPayload {
  if (!raw || typeof raw !== "object") {
    throw new TimelineLegError("Request body must be a JSON object.");
  }

  const body = raw as Partial<TimelineLegsPayload>;
  const mode = body.mode;
  if (mode !== "ocean" && mode !== "air" && mode !== "rail" && mode !== "road") {
    throw new TimelineLegError("mode must be one of ocean, air, rail, road.");
  }

  if (!Array.isArray(body.stops) || body.stops.length < 2) {
    throw new TimelineLegError("At least two timeline stops are required.");
  }
  if (body.stops.length > 40) {
    throw new TimelineLegError("A timeline may not contain more than 40 stops.");
  }

  const stops: TimelineLegStop[] = body.stops.map((stop, index) => {
    if (!stop || typeof stop !== "object") {
      throw new TimelineLegError(`Stop ${index} is invalid.`);
    }
    if (!isValidCoordinate(stop.coordinates)) {
      throw new TimelineLegError(`Stop ${index} has invalid coordinates.`);
    }
    return {
      id: String(stop.id || `stop-${index}`).slice(0, 120),
      name: String(stop.name || `Stop ${index + 1}`).slice(0, 200),
      code: stop.code ? String(stop.code).slice(0, 40) : undefined,
      coordinates: [stop.coordinates[0], stop.coordinates[1]],
    };
  });

  let routeCoordinates: Coordinate[] | undefined;
  if (Array.isArray(body.routeCoordinates)) {
    routeCoordinates = body.routeCoordinates
      .filter((coordinate) => isValidCoordinate(coordinate))
      .slice(0, 5000)
      .map((coordinate) => [coordinate[0], coordinate[1]] as Coordinate);
    if (routeCoordinates.length < 2) routeCoordinates = undefined;
  }

  return { mode, stops, routeCoordinates };
}

interface CorridorTracker {
  lastFraction: number;
  route: Coordinate[];
}

function buildTimelineSlice(
  from: Coordinate,
  to: Coordinate,
  tracker: CorridorTracker
): Coordinate[] | null {
  const fromProjection = projectOntoRoute(from, tracker.route);
  const toProjection = projectOntoRoute(to, tracker.route);

  if (
    fromProjection.distanceKm > PROJECTION_TOLERANCE_KM ||
    toProjection.distanceKm > PROJECTION_TOLERANCE_KM
  ) {
    return null;
  }

  const startFraction = Math.max(fromProjection.fraction, tracker.lastFraction);
  const endFraction = toProjection.fraction;

  if (endFraction <= startFraction || endFraction < tracker.lastFraction) {
    return null;
  }

  const slice = sliceRouteBetweenFractions(tracker.route, startFraction, endFraction);
  if (slice.length < 2) return null;

  tracker.lastFraction = endFraction;
  return snapEndpoints(slice, from, to);
}

function snapEndpoints(line: Coordinate[], from: Coordinate, to: Coordinate): Coordinate[] {
  const result = [...line];
  result[0] = from;
  result[result.length - 1] = to;
  return result;
}

function directLeg(from: Coordinate, to: Coordinate): Coordinate[] {
  const midpoint: Coordinate = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
  ];
  return [from, midpoint, to];
}

function freshLeg(
  from: Coordinate,
  to: Coordinate,
  mode: TransportMode
): { coordinates: Coordinate[]; source: TimelineLegSource } {
  if (mode === "ocean") {
    const ocean = calculateOceanRoute(from, to);
    return {
      coordinates: snapEndpoints(ocean.coordinates, from, to),
      source: "ocean",
    };
  }

  if (mode === "air") {
    const arc = calculateAirArc(from, to, 48);
    return {
      coordinates: snapEndpoints(arc.coordinates, from, to),
      source: "air",
    };
  }

  const corridor = calculateCorridorRoute(from, to, mode);
  if (corridor.coordinates.length >= 2) {
    return {
      coordinates: snapEndpoints(corridor.coordinates, from, to),
      source: mode,
    };
  }

  return { coordinates: directLeg(from, to), source: "direct" };
}

function makeLeg(
  fromStop: TimelineLegStop,
  toStop: TimelineLegStop,
  coordinates: Coordinate[],
  source: TimelineLegSource,
  mode: TransportMode
): TimelineLeg {
  const distanceKm = Math.max(
    haversinePathKm(coordinates),
    haversineKm(fromStop.coordinates, toStop.coordinates)
  );
  const roundedKm = Math.round(distanceKm * 10) / 10;

  return {
    fromStopId: fromStop.id,
    toStopId: toStop.id,
    coordinates,
    distanceKm: roundedKm,
    distanceNm: Math.round((roundedKm / 1.852) * 10) / 10,
    durationHours: Math.max(
      0.1,
      Math.round((distanceKm / LEG_SPEEDS_KMH[mode]) * 10) / 10
    ),
    source,
  };
}

export function buildTimelineLegs(payload: TimelineLegsPayload): TimelineLegsResult {
  const { mode, stops, routeCoordinates } = payload;
  const tracker: CorridorTracker | null =
    routeCoordinates && routeCoordinates.length > 1
      ? { lastFraction: 0, route: routeCoordinates }
      : null;

  const legs: TimelineLeg[] = [];

  for (let index = 0; index < stops.length - 1; index++) {
    const fromStop = stops[index];
    const toStop = stops[index + 1];
    const from = fromStop.coordinates;
    const to = toStop.coordinates;

    if (haversineKm(from, to) <= DUPLICATE_STOP_KM) {
      legs.push(makeLeg(fromStop, toStop, [from, to], "direct", mode));
      continue;
    }

    const stored = tracker ? buildTimelineSlice(from, to, tracker) : null;
    if (stored) {
      legs.push(makeLeg(fromStop, toStop, stored, "timeline", mode));
      continue;
    }

    // Stored corridor no longer matches this leg; a later leg must not reuse
    // stale fractions, so keep the tracker's lastFraction where it is.
    const fresh = freshLeg(from, to, mode);
    legs.push(makeLeg(fromStop, toStop, fresh.coordinates, fresh.source, mode));
  }

  const totalDistanceKm =
    Math.round(legs.reduce((sum, leg) => sum + leg.distanceKm, 0) * 10) / 10;
  const totalDurationHours =
    Math.round(legs.reduce((sum, leg) => sum + leg.durationHours, 0) * 10) / 10;

  return {
    success: true,
    mode,
    legs,
    totalDistanceKm,
    totalDistanceNm: Math.round((totalDistanceKm / 1.852) * 10) / 10,
    totalDurationHours,
  };
}
