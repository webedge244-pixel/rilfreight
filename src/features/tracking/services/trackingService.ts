import type { Shipment, ShipmentStatus, TrackingMilestone } from "@/shared/types";

export interface PolylinePartitionResult {
  completedPolyline: [number, number][];
  upcomingPolyline: [number, number][];
  vehicleCoordinate: [number, number];
  progressPercentage: number;
}

/**
 * Calculates the current real-time GPS coordinate of a shipment along its route.
 * If the shipment is paused, returns the paused coordinates.
 * Otherwise, interpolates the coordinate along the route line based on elapsed time.
 */
export function getLiveShipmentCoordinates(
  shipment: Shipment,
  currentTimestamp: number = Date.now()
): [number, number] {
  // If admin has manually paused or pinned the location
  if (shipment.isPaused && shipment.pausedCoordinates) {
    return shipment.pausedCoordinates;
  }

  const route = shipment.routeCoordinates;
  if (!route || route.length === 0) {
    return shipment.originCoordinates;
  }
  if (route.length === 1) {
    return route[0];
  }

  const start = new Date(shipment.departureDate).getTime();
  const end = new Date(shipment.estimatedDeliveryDate).getTime();

  if (currentTimestamp <= start) return route[0];
  if (currentTimestamp >= end) return route[route.length - 1];

  const progressRatio = (currentTimestamp - start) / (end - start);
  const fractionalIdx = progressRatio * (route.length - 1);
  const baseIdx = Math.floor(fractionalIdx);
  const nextIdx = Math.min(route.length - 1, baseIdx + 1);
  const segmentRatio = fractionalIdx - baseIdx;

  const lon = route[baseIdx][0] + segmentRatio * (route[nextIdx][0] - route[baseIdx][0]);
  const lat = route[baseIdx][1] + segmentRatio * (route[nextIdx][1] - route[baseIdx][1]);

  return [Math.round(lon * 10000) / 10000, Math.round(lat * 10000) / 10000];
}

/**
 * Evaluates which milestones are completed based on the current timestamp.
 */
export function getEvaluatedMilestones(
  milestones: TrackingMilestone[],
  currentTimestamp: number = Date.now()
): TrackingMilestone[] {
  return (milestones || []).map((milestone) => {
    const milestoneTime = new Date(milestone.timestamp).getTime();
    return {
      ...milestone,
      isCompleted: milestoneTime <= currentTimestamp,
    };
  });
}

/**
 * Partitions route coordinates into completed (solid) and upcoming (dashed) legs.
 * Enforces strict junction continuity: completedPolyline[last] == upcomingPolyline[0] == vehicleCoordinate.
 */
export function partitionRoutePolyline(
  shipment: Shipment,
  currentTimestamp: number = Date.now()
): PolylinePartitionResult {
  const route = shipment.routeCoordinates || [];
  if (route.length === 0) {
    const fallback = shipment.originCoordinates || [0, 0];
    return {
      completedPolyline: [fallback],
      upcomingPolyline: [fallback],
      vehicleCoordinate: fallback,
      progressPercentage: 0,
    };
  }
  if (route.length === 1) {
    return {
      completedPolyline: [route[0]],
      upcomingPolyline: [route[0]],
      vehicleCoordinate: route[0],
      progressPercentage: 100,
    };
  }

  const start = new Date(shipment.departureDate).getTime();
  const end = new Date(shipment.estimatedDeliveryDate).getTime();

  // Paused override
  if (shipment.isPaused && shipment.pausedCoordinates) {
    const vehicle = shipment.pausedCoordinates;
    let closestIdx = 0;
    let minD = Infinity;
    for (let i = 0; i < route.length; i++) {
      const d = (route[i][0] - vehicle[0]) ** 2 + (route[i][1] - vehicle[1]) ** 2;
      if (d < minD) {
        minD = d;
        closestIdx = i;
      }
    }
    const completed = [...route.slice(0, closestIdx + 1)];
    if (
      completed[completed.length - 1][0] !== vehicle[0] ||
      completed[completed.length - 1][1] !== vehicle[1]
    ) {
      completed.push(vehicle);
    }
    const upcoming = [vehicle, ...route.slice(closestIdx + 1)];
    const progress = Math.min(
      100,
      Math.max(0, Math.round((closestIdx / (route.length - 1)) * 100))
    );
    return {
      completedPolyline: completed,
      upcomingPolyline: upcoming,
      vehicleCoordinate: vehicle,
      progressPercentage: progress,
    };
  }

  // Time-based progression: Before departure (0%)
  if (currentTimestamp <= start) {
    return {
      completedPolyline: [route[0]],
      upcomingPolyline: route,
      vehicleCoordinate: route[0],
      progressPercentage: 0,
    };
  }

  // Time-based progression: After delivery (100%)
  if (currentTimestamp >= end) {
    return {
      completedPolyline: route,
      upcomingPolyline: [route[route.length - 1]],
      vehicleCoordinate: route[route.length - 1],
      progressPercentage: 100,
    };
  }

  const ratio = (currentTimestamp - start) / (end - start);
  const progressPercentage = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  const fractionalIdx = ratio * (route.length - 1);
  const baseIdx = Math.floor(fractionalIdx);
  const nextIdx = Math.min(route.length - 1, baseIdx + 1);
  const segmentRatio = fractionalIdx - baseIdx;

  const lon = route[baseIdx][0] + segmentRatio * (route[nextIdx][0] - route[baseIdx][0]);
  const lat = route[baseIdx][1] + segmentRatio * (route[nextIdx][1] - route[baseIdx][1]);
  const vehicleCoordinate: [number, number] = [
    Math.round(lon * 10000) / 10000,
    Math.round(lat * 10000) / 10000,
  ];

  const completed = [...route.slice(0, baseIdx + 1), vehicleCoordinate];
  const upcoming = [vehicleCoordinate, ...route.slice(nextIdx)];

  return {
    completedPolyline: completed,
    upcomingPolyline: upcoming,
    vehicleCoordinate,
    progressPercentage,
  };
}

/**
 * Quick Action 1: "Release Gate"
 * Unpauses the shipment, resolves active hold gates to completed, sets status to 'in_transit',
 * and clears pause fields. Returns the clean updated Shipment object.
 */
export function releaseShipmentGate(shipment: Shipment): Shipment {
  const updatedMilestones = (shipment.milestones || []).map((m) => {
    if (m.isHoldGate && !m.isCompleted) {
      return { ...m, isCompleted: true, status: "completed" };
    }
    return m;
  });

  const updated: Shipment = {
    ...shipment,
    isPaused: false,
    status: "in_transit",
    milestones: updatedMilestones,
    updatedAt: new Date().toISOString(),
  };

  // Remove paused fields so Firestore payload has zero undefined values
  delete updated.pausedReason;
  delete updated.pausedAtTimestamp;
  delete updated.pausedCoordinates;
  delete updated.pausedLocationName;

  return updated;
}

/**
 * Quick Action 2: "Trigger Exception"
 * Flags shipment with operational exception / delay, freezes vehicle coordinates,
 * sets status to exception status ('weather_delay' | 'customs_hold'), and records reason.
 */
export function triggerShipmentException(
  shipment: Shipment,
  reason: string,
  status: ShipmentStatus = "weather_delay",
  currentTimestamp: number = Date.now()
): Shipment {
  const currentCoords = getLiveShipmentCoordinates(shipment, currentTimestamp);

  return {
    ...shipment,
    isPaused: true,
    status,
    pausedReason: reason,
    pausedAtTimestamp: new Date(currentTimestamp).toISOString(),
    pausedCoordinates: currentCoords,
    updatedAt: new Date(currentTimestamp).toISOString(),
  };
}
