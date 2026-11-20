/**
 * Client-side fallback when the timeline leg API cannot be reached. Reuses the
 * stored corridor when stops sit on it, otherwise draws a geodesic/straight leg
 * so the map never goes blank.
 */

import {
  haversineKm,
  haversinePathKm,
  interpolateGreatCircle,
  interpolateLinear,
  isValidCoordinate,
  projectOntoRoute,
  sliceRouteBetweenFractions,
  type Coordinate,
} from "@/features/tracking/lib/geo";
import type {
  TimelineLeg,
  TimelineLegSource,
  TimelineLegsPayload,
} from "@/shared/types/timeline";

const FALLBACK_SPEEDS_KMH = { ocean: 33.34, air: 850, rail: 65, road: 75 } as const;
const ROUTE_TOLERANCE_KM = 120;

function densify(from: Coordinate, to: Coordinate, steps: number): Coordinate[] {
  const line: Coordinate[] = [];
  for (let index = 0; index <= steps; index++) {
    line.push(interpolateLinear(from, to, index / steps));
  }
  return line;
}

export function buildFallbackLegs(payload: TimelineLegsPayload): TimelineLeg[] {
  const { mode, stops } = payload;
  const route = (payload.routeCoordinates || []).filter((coordinate) =>
    isValidCoordinate(coordinate)
  );
  const legs: TimelineLeg[] = [];
  let lastFraction = 0;

  for (let index = 0; index < stops.length - 1; index++) {
    const fromStop = stops[index];
    const toStop = stops[index + 1];
    const from = fromStop.coordinates;
    const to = toStop.coordinates;
    const directKm = haversineKm(from, to);

    let coordinates: Coordinate[] | null = null;
    let source: TimelineLegSource = "direct";

    if (directKm <= 1) {
      coordinates = [from, to];
    } else if (route.length > 1) {
      const fromProjection = projectOntoRoute(from, route);
      const toProjection = projectOntoRoute(to, route);
      if (
        fromProjection.distanceKm <= ROUTE_TOLERANCE_KM &&
        toProjection.distanceKm <= ROUTE_TOLERANCE_KM &&
        toProjection.fraction >= Math.max(fromProjection.fraction, lastFraction) &&
        toProjection.fraction > fromProjection.fraction
      ) {
        const slice = sliceRouteBetweenFractions(
          route,
          Math.max(fromProjection.fraction, lastFraction),
          toProjection.fraction
        );
        if (slice.length >= 2) {
          slice[0] = from;
          slice[slice.length - 1] = to;
          coordinates = slice;
          source = "timeline";
          lastFraction = toProjection.fraction;
        }
      }
    }

    if (!coordinates) {
      coordinates =
        mode === "rail" || mode === "road"
          ? densify(from, to, 24)
          : interpolateGreatCircle(from, to, 48);
    }

    const distanceKm = Math.max(haversinePathKm(coordinates), directKm);
    const roundedKm = Math.round(distanceKm * 10) / 10;

    legs.push({
      fromStopId: fromStop.id,
      toStopId: toStop.id,
      coordinates,
      distanceKm: roundedKm,
      distanceNm: Math.round((roundedKm / 1.852) * 10) / 10,
      durationHours: Math.max(
        0.1,
        Math.round((distanceKm / FALLBACK_SPEEDS_KMH[mode]) * 10) / 10
      ),
      source,
    });
  }

  return legs;
}
