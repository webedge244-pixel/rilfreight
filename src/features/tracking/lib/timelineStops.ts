/**
 * Turns a shipment timeline into ordered map stops, completion state, and the
 * coordinate where the vehicle is pinned. Shared by the live tracker and the
 * shipment planner preview.
 */

import type { RouteWaypoint, TrackingMilestone } from "@/shared/types";
import {
  coordinatesEqual,
  interpolateLinear,
  isValidCoordinate,
  projectOntoRoute,
  sampleRouteAtFraction,
  type Coordinate,
} from "@/features/tracking/lib/geo";

export type TimelineStopStatus = "completed" | "active" | "upcoming";

export interface TimelineStopEvent {
  id: string;
  code: string;
  title: string;
  description: string;
  locationName: string;
  locationCode?: string;
  timestampMs: number;
  isCompleted: boolean;
  isHoldGate: boolean;
  dwellHours?: number;
}

export interface TimelineStop {
  id: string;
  name: string;
  code?: string;
  country?: string;
  coordinates: Coordinate;
  events: TimelineStopEvent[];
  status: TimelineStopStatus;
  isHoldGate: boolean;
  earliestMs: number;
  latestMs: number;
  inferred: boolean;
  isOrigin: boolean;
  isDestination: boolean;
}

export interface TimelineMapState {
  stops: TimelineStop[];
  vehicleCoordinate: Coordinate;
  reachedStopIndex: number;
  activeStopIndex: number;
  completedEvents: number;
  totalEvents: number;
  progressPercentage: number;
  isPaused: boolean;
  isDelivered: boolean;
}

export interface TimelineLocationInput {
  name: string;
  code?: string;
  coordinates: Coordinate;
}

export interface TimelineStopResolverInput {
  milestones: TrackingMilestone[];
  origin: TimelineLocationInput;
  destination: TimelineLocationInput;
  waypoints?: RouteWaypoint[];
  routeCoordinates?: Coordinate[];
  paused?: boolean;
  pausedCoordinates?: Coordinate | null;
  now?: number;
  /** Planner preview: render everything as planned regardless of clock time. */
  preview?: boolean;
}

const ORIGIN_EVENT_CODES = new Set([
  "GTIN",
  "LOAD",
  "DEPA",
  "DISP",
  "RAMP_IN",
  "MOUNTED",
  "TRAIN_DEP",
  "RCS",
  "DEP",
]);

const DESTINATION_EVENT_CODES = new Set([
  "ARRI",
  "ARR",
  "CUSR",
  "DLV",
  "FINAL_DLV",
  "OFD",
  "RAMP_OUT",
  "RCF",
]);

function normalize(value: string | undefined | null): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseTimestamp(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveKnownCoordinate(
  milestone: TrackingMilestone,
  input: TimelineStopResolverInput
): Coordinate | null {
  if (isValidCoordinate(milestone.coordinates)) {
    return milestone.coordinates;
  }

  const milestoneCode = normalize(milestone.locationCode);
  const milestoneName = normalize(milestone.locationName);
  const eventCode = normalize(milestone.code).toUpperCase();

  if (milestoneCode) {
    const waypoint = (input.waypoints || []).find(
      (item) => normalize(item.code) === milestoneCode
    );
    if (waypoint && isValidCoordinate(waypoint.coordinates)) {
      return waypoint.coordinates;
    }
  }

  if (milestoneName) {
    const waypoint = (input.waypoints || []).find(
      (item) => normalize(item.name) === milestoneName
    );
    if (waypoint && isValidCoordinate(waypoint.coordinates)) {
      return waypoint.coordinates;
    }
  }

  if (
    ORIGIN_EVENT_CODES.has(eventCode) ||
    (milestoneCode && milestoneCode === normalize(input.origin.code)) ||
    (milestoneName && milestoneName === normalize(input.origin.name))
  ) {
    return input.origin.coordinates;
  }

  if (
    DESTINATION_EVENT_CODES.has(eventCode) ||
    (milestoneCode && milestoneCode === normalize(input.destination.code)) ||
    (milestoneName && milestoneName === normalize(input.destination.name))
  ) {
    return input.destination.coordinates;
  }

  return null;
}

/**
 * Fills in missing milestone coordinates by interpolating between the nearest
 * resolved neighbours, preferably along the stored corridor polyline.
 */
function inferMissingCoordinates(
  milestones: TrackingMilestone[],
  resolved: Array<Coordinate | null>,
  input: TimelineStopResolverInput
): Array<{ coordinates: Coordinate; inferred: boolean }> {
  const route = (input.routeCoordinates || []).filter((coordinate) =>
    isValidCoordinate(coordinate)
  );
  const times = milestones.map((milestone) => parseTimestamp(milestone.timestamp));

  const output = resolved.map((coordinate, index) => {
    if (coordinate) return { coordinates: coordinate, inferred: false };

    let previousIndex = index - 1;
    while (previousIndex >= 0 && !resolved[previousIndex]) previousIndex--;
    let nextIndex = index + 1;
    while (nextIndex < resolved.length && !resolved[nextIndex]) nextIndex++;

    const previousCoordinate =
      (previousIndex >= 0 ? resolved[previousIndex] : null) || input.origin.coordinates;
    const nextCoordinate =
      (nextIndex < resolved.length ? resolved[nextIndex] : null) ||
      input.destination.coordinates;
    const previousTime = previousIndex >= 0 ? times[previousIndex] : times[index];
    const nextTime = nextIndex < times.length ? times[nextIndex] : times[index];

    let ratio = 0.5;
    if (nextTime > previousTime) {
      ratio = Math.min(1, Math.max(0, (times[index] - previousTime) / (nextTime - previousTime)));
    } else if (index > 0 && times.length > 1) {
      ratio = index / (times.length - 1);
    }

    if (route.length > 1) {
      const from = projectOntoRoute(previousCoordinate, route);
      const to = projectOntoRoute(nextCoordinate, route);
      if (to.fraction >= from.fraction) {
        const fraction = from.fraction + (to.fraction - from.fraction) * ratio;
        return {
          coordinates: sampleRouteAtFraction(route, fraction),
          inferred: true,
        };
      }
    }

    return {
      coordinates: interpolateLinear(previousCoordinate, nextCoordinate, ratio),
      inferred: true,
    };
  });

  return output;
}

function buildStopFromEvents(
  events: TimelineStopEvent[],
  coordinates: Coordinate,
  inferred: boolean,
  isOrigin: boolean,
  isDestination: boolean
): TimelineStop {
  const sorted = [...events].sort((a, b) => a.timestampMs - b.timestampMs);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const allCompleted = sorted.every((event) => event.isCompleted);
  // Events without a recorded coordinate (e.g. "Interstate route") share the
  // next stop's coordinate and would otherwise lend their generic label to it.
  const named = sorted.find((event) => event.locationCode) || first;

  return {
    id: `stop-${first?.id || `${coordinates[0]},${coordinates[1]}`}`,
    name: named?.locationName || (isOrigin ? "Origin" : isDestination ? "Destination" : "Checkpoint"),
    code: named?.locationCode,
    coordinates,
    events: sorted,
    status: allCompleted ? "completed" : "upcoming",
    isHoldGate: sorted.some((event) => event.isHoldGate),
    earliestMs: first?.timestampMs || 0,
    latestMs: last?.timestampMs || 0,
    inferred,
    isOrigin,
    isDestination,
  };
}

export function resolveTimelineMapState(
  input: TimelineStopResolverInput
): TimelineMapState {
  const now = input.now ?? Date.now();
  const paused = Boolean(input.paused);
  const milestones = [...(input.milestones || [])].sort(
    (a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
  );

  const originCoordinate = isValidCoordinate(input.origin.coordinates)
    ? input.origin.coordinates
    : input.destination.coordinates;

  if (milestones.length === 0) {
    const stops: TimelineStop[] = [
      {
        id: "stop-origin",
        name: input.origin.name,
        code: input.origin.code,
        coordinates: originCoordinate,
        events: [],
        status: "upcoming",
        isHoldGate: false,
        earliestMs: 0,
        latestMs: 0,
        inferred: false,
        isOrigin: true,
        isDestination: false,
      },
      {
        id: "stop-destination",
        name: input.destination.name,
        code: input.destination.code,
        coordinates: input.destination.coordinates,
        events: [],
        status: "upcoming",
        isHoldGate: false,
        earliestMs: 0,
        latestMs: 0,
        inferred: false,
        isOrigin: false,
        isDestination: true,
      },
    ];

    return {
      stops,
      vehicleCoordinate: originCoordinate,
      reachedStopIndex: 0,
      activeStopIndex: 0,
      completedEvents: 0,
      totalEvents: 0,
      progressPercentage: 0,
      isPaused: paused,
      isDelivered: false,
    };
  }

  const knownCoordinates = milestones.map((milestone) =>
    resolveKnownCoordinate(milestone, input)
  );
  const resolvedCoordinates = inferMissingCoordinates(milestones, knownCoordinates, input);

  let blocked = false;
  const events: Array<TimelineStopEvent & { inferred: boolean }> = milestones.map(
    (milestone, index) => {
      const timestampMs = parseTimestamp(milestone.timestamp);
      const explicitlyCompleted = Boolean(milestone.isCompleted);
      const completed =
        !input.preview &&
        (explicitlyCompleted ||
          (!paused && !blocked && timestampMs <= now && !milestone.isHoldGate));

      if (!completed) blocked = true;

      return {
        id: milestone.id || `ms-${index}`,
        code: milestone.code,
        title: milestone.title,
        description: milestone.description,
        locationName: milestone.locationName,
        locationCode: milestone.locationCode,
        timestampMs,
        isCompleted: input.preview ? false : completed,
        isHoldGate: Boolean(milestone.isHoldGate),
        dwellHours: milestone.dwellHours,
        inferred: resolvedCoordinates[index]?.inferred ?? false,
      };
    }
  );

  const stops: TimelineStop[] = [];
  let currentStop: TimelineStop | null = null;

  events.forEach((event, index) => {
    const coordinates = resolvedCoordinates[index].coordinates;
    const inferred = resolvedCoordinates[index].inferred;

    if (
      currentStop &&
      coordinatesEqual(currentStop.coordinates, coordinates, 0.02)
    ) {
      currentStop.events.push(event);
      currentStop.latestMs = Math.max(currentStop.latestMs, event.timestampMs);
      currentStop.isHoldGate = currentStop.isHoldGate || event.isHoldGate;
      currentStop.inferred = currentStop.inferred && inferred;
      // A coord-less transit event can open a group at the next stop's
      // coordinate; let the first event with a recorded location name it.
      if (!currentStop.code && event.locationCode) {
        currentStop.name = event.locationName || currentStop.name;
        currentStop.code = event.locationCode;
      }
      return;
    }

    if (currentStop) stops.push(currentStop);

    currentStop = buildStopFromEvents(
      [event],
      coordinates,
      inferred,
      stops.length === 0,
      false
    );
  });

  if (currentStop) stops.push(currentStop);

  // Guarantee the path starts at the origin and ends at the destination even
  // when the admin removed those checkpoints from the timeline.
  if (
    stops.length > 0 &&
    isValidCoordinate(input.origin.coordinates) &&
    !coordinatesEqual(stops[0].coordinates, input.origin.coordinates, 0.05)
  ) {
    stops.unshift({
      id: "stop-origin",
      name: input.origin.name,
      code: input.origin.code,
      coordinates: input.origin.coordinates,
      events: [],
      status: "upcoming",
      isHoldGate: false,
      earliestMs: stops[0].earliestMs,
      latestMs: stops[0].earliestMs,
      inferred: false,
      isOrigin: true,
      isDestination: false,
    });
  }

  if (
    stops.length > 0 &&
    isValidCoordinate(input.destination.coordinates) &&
    !coordinatesEqual(stops[stops.length - 1].coordinates, input.destination.coordinates, 0.05)
  ) {
    stops.push({
      id: "stop-destination",
      name: input.destination.name,
      code: input.destination.code,
      coordinates: input.destination.coordinates,
      events: [],
      status: "upcoming",
      isHoldGate: false,
      earliestMs: stops[stops.length - 1].latestMs,
      latestMs: stops[stops.length - 1].latestMs,
      inferred: false,
      isOrigin: false,
      isDestination: true,
    });
  }

  if (stops.length > 0) {
    stops[0].isOrigin = true;
    stops[stops.length - 1].isDestination = true;
  }

  const activeStopIndex = input.preview
    ? 0
    : stops.findIndex((stop) => stop.events.some((event) => !event.isCompleted));

  let lastCompletedEventStop = -1;
  stops.forEach((stop, stopIndex) => {
    if (stop.events.some((event) => event.isCompleted)) {
      lastCompletedEventStop = stopIndex;
    }
  });

  let reachedStopIndex = lastCompletedEventStop;
  if (paused && activeStopIndex !== -1) {
    reachedStopIndex = activeStopIndex;
  }
  if (reachedStopIndex === -1) reachedStopIndex = 0;

  const totalEvents = events.length;
  const completedEvents = events.filter((event) => event.isCompleted).length;
  const isDelivered =
    !input.preview && totalEvents > 0 && completedEvents === totalEvents;

  stops.forEach((stop, index) => {
    if (stop.events.length === 0) {
      stop.status = index < reachedStopIndex ? "completed" : "upcoming";
      return;
    }
    if (stop.events.every((event) => event.isCompleted)) {
      stop.status = "completed";
    } else if (index === activeStopIndex) {
      stop.status = "active";
    } else {
      stop.status = "upcoming";
    }
  });

  let vehicleCoordinate = stops[reachedStopIndex]?.coordinates || originCoordinate;
  if (paused && isValidCoordinate(input.pausedCoordinates)) {
    vehicleCoordinate = input.pausedCoordinates;
  } else if (isDelivered) {
    vehicleCoordinate = stops[stops.length - 1].coordinates;
  }

  return {
    stops,
    vehicleCoordinate,
    reachedStopIndex,
    activeStopIndex,
    completedEvents,
    totalEvents,
    progressPercentage:
      totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0,
    isPaused: paused,
    isDelivered,
  };
}
