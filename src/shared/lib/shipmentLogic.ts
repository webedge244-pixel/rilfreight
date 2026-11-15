/**
 * Unified shipment business logic module.
 *
 * Provides pure, deterministic functions for:
 * 1. Operational status derivation (deriveShipmentStatus)
 * 2. Proportional milestone distribution & completion regulation (regulateMilestones)
 * 3. Waypoint progression synchronization along corridors (synchronizeWaypoints)
 * 4. Timezone-aware local datetime formatting for forms (toLocalDatetimeInput, fromLocalDatetimeInput)
 * 5. Schedule progress calculation (computeProgressPercent)
 * 6. Default schedule initialization (createDefaultSchedule)
 *
 * All functions accept an optional `now` parameter to ensure 100% deterministic testing.
 */

import type {
  ShipmentStatus,
  TrackingMilestone,
  RouteWaypoint,
  Shipment,
} from "@/shared/types";

// ── Types ─────────────────────────────────────────────────────────────

export interface StatusDerivationOptions {
  isPaused?: boolean;
  currentStatus?: ShipmentStatus;
  now?: number | Date | string;
}

export interface RegulateMilestonesOptions {
  now?: number | Date | string;
  outputFormat?: "iso" | "local";
}

export interface SynchronizeWaypointsOptions {
  now?: number | Date | string;
}

// ── Datetime Conversion Helpers ───────────────────────────────────────

/**
 * Converts an ISO 8601 UTC timestamp, Date object, or numeric timestamp to a local
 * YYYY-MM-DDTHH:mm string for HTML datetime-local inputs, applying the local timezone offset.
 */
export function toLocalDatetimeInput(
  isoOrDate: string | Date | number | null | undefined
): string {
  if (!isoOrDate && isoOrDate !== 0) return "";
  if (
    typeof isoOrDate === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoOrDate)
  ) {
    return isoOrDate;
  }
  const d =
    typeof isoOrDate === "string" || typeof isoOrDate === "number"
      ? new Date(isoOrDate)
      : isoOrDate;
  if (!d || Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

/**
 * Converts a datetime-local input string (YYYY-MM-DDTHH:mm) back to an ISO 8601 UTC string.
 * Returns null if input is null, undefined, empty/whitespace, or an invalid date.
 */
export function fromLocalDatetimeInput(
  localStr: string | null | undefined
): string | null {
  if (!localStr || !localStr.trim()) return null;
  const d = new Date(localStr);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ── Status Derivation ─────────────────────────────────────────────────

/**
 * Derives operational shipment status from schedule and hold status.
 *
 * Contract:
 * - If isPaused is true:
 *   - If currentStatus is a hold state ("customs_hold" | "weather_delay"), preserve it.
 *   - Otherwise, default to "customs_hold".
 * - If isPaused is false (or undefined):
 *   - deliveryDate <= now -> "delivered"
 *   - departureDate <= now -> "in_transit"
 *   - otherwise -> "pending"
 * - Invalid dates fall back safely to currentStatus || "pending".
 */
export function deriveShipmentStatus(
  departureDate: string | Date | number,
  estimatedDeliveryDate: string | Date | number,
  options?: StatusDerivationOptions
): ShipmentStatus {
  if (options?.isPaused) {
    if (
      options.currentStatus === "customs_hold" ||
      options.currentStatus === "weather_delay"
    ) {
      return options.currentStatus;
    }
    return "customs_hold";
  }

  const depMs = new Date(departureDate).getTime();
  const delMs = new Date(estimatedDeliveryDate).getTime();
  const nowMs =
    options?.now !== undefined ? new Date(options.now).getTime() : Date.now();

  if (Number.isNaN(depMs) || Number.isNaN(delMs) || Number.isNaN(nowMs)) {
    return options?.currentStatus || "pending";
  }

  if (delMs <= nowMs) {
    return "delivered";
  }
  if (depMs <= nowMs) {
    return "in_transit";
  }
  return "pending";
}

// ── Milestone Regulation ──────────────────────────────────────────────

/**
 * Distributes milestone timestamps proportionally across the shipment window
 * and evaluates completion status.
 *
 * Contract:
 * - targetMs = Math.round(depMs + ratio * (delMs - depMs)), where ratio = idx / (total - 1).
 * - isCompleted is true ONLY IF targetMs <= now AND !milestone.isHoldGate.
 * - Hold gates (isHoldGate: true) NEVER auto-complete, even if timestamp <= now.
 * - If delivery <= departure or invalid, milestones retain their existing timestamps
 *   with completion evaluated against now (hold gates protected).
 * - Formats timestamps as ISO 8601 UTC (or local YYYY-MM-DDTHH:mm if outputFormat === "local").
 */
export function regulateMilestones(
  milestones: TrackingMilestone[],
  departure: string | Date | number,
  delivery: string | Date | number,
  options?: RegulateMilestonesOptions
): TrackingMilestone[] {
  if (!milestones || milestones.length === 0) return [];

  const depMs = new Date(departure).getTime();
  const delMs = new Date(delivery).getTime();
  const nowMs =
    options?.now !== undefined ? new Date(options.now).getTime() : Date.now();
  const formatAsLocal = options?.outputFormat === "local";

  if (Number.isNaN(depMs) || Number.isNaN(delMs) || delMs <= depMs) {
    return milestones.map((m) => {
      const rawTime = m.timestamp;
      const mTime = new Date(rawTime).getTime();
      const hasPassed = !Number.isNaN(mTime) && mTime <= nowMs;
      return {
        ...m,
        timestamp: formatAsLocal
          ? toLocalDatetimeInput(rawTime)
          : fromLocalDatetimeInput(rawTime) || rawTime,
        isCompleted: hasPassed || Boolean(m.isCompleted),
        isHoldGate: hasPassed ? false : Boolean(m.isHoldGate),
      };
    });
  }

  const total = milestones.length;

  return milestones.map((m, idx) => {
    const ratio = total > 1 ? idx / (total - 1) : 0;
    const targetMs = Math.round(depMs + ratio * (delMs - depMs));
    const isPast = targetMs <= nowMs;
    const isCompleted = isPast;
    const isHoldGate = isPast ? false : Boolean(m.isHoldGate);

    return {
      ...m,
      timestamp: formatAsLocal
        ? toLocalDatetimeInput(new Date(targetMs))
        : new Date(targetMs).toISOString(),
      isCompleted,
      isHoldGate,
    };
  });
}

// ── Waypoint Synchronization ──────────────────────────────────────────

/**
 * Synchronizes waypoint completion based on overall progress ratio.
 *
 * Contract:
 * - progressRatio = (now - departure) / (delivery - departure), clamped to [0, 1].
 * - wpRatio = idx / (totalWaypoints - 1).
 * - waypoint.isCompleted = progressRatio >= wpRatio && progressRatio > 0.
 * - Before departure or progressRatio === 0: no waypoints marked completed.
 */
export function synchronizeWaypoints(
  waypoints: RouteWaypoint[],
  departure: string | Date | number,
  delivery: string | Date | number,
  options?: SynchronizeWaypointsOptions
): RouteWaypoint[] {
  if (!waypoints || waypoints.length === 0) return [];

  const depMs = new Date(departure).getTime();
  const delMs = new Date(delivery).getTime();
  const nowMs =
    options?.now !== undefined ? new Date(options.now).getTime() : Date.now();

  const progressRatio =
    delMs > depMs
      ? Math.min(1, Math.max(0, (nowMs - depMs) / (delMs - depMs)))
      : 0;

  return waypoints.map((wp, idx, arr) => {
    const wpRatio = arr.length > 1 ? idx / (arr.length - 1) : 0;
    return {
      ...wp,
      isCompleted: progressRatio >= wpRatio && progressRatio > 0,
    };
  });
}

// ── Progress & Default Schedule Helpers ────────────────────────────────

/**
 * Computes progress percentage (0 to 100) between departure and delivery.
 * Accepts either (departure, delivery, now) or ({ departureDate, estimatedDeliveryDate }, now).
 */
export function computeProgressPercent(
  departureOrShipment:
    | string
    | Date
    | number
    | {
        departureDate: string | Date | number;
        estimatedDeliveryDate: string | Date | number;
      },
  deliveryOrNow?: string | Date | number,
  explicitNow?: number | Date | string
): number {
  let dep: string | Date | number;
  let del: string | Date | number;
  let nowVal: number | Date | string | undefined;

  if (
    typeof departureOrShipment === "object" &&
    departureOrShipment !== null &&
    "departureDate" in departureOrShipment
  ) {
    dep = departureOrShipment.departureDate;
    del = departureOrShipment.estimatedDeliveryDate;
    nowVal = deliveryOrNow ?? explicitNow;
  } else {
    dep = departureOrShipment;
    del = deliveryOrNow!;
    nowVal = explicitNow;
  }

  const depMs = new Date(dep).getTime();
  const delMs = new Date(del).getTime();
  const nowMs =
    nowVal !== undefined ? new Date(nowVal).getTime() : Date.now();

  if (Number.isNaN(depMs) || Number.isNaN(delMs) || delMs <= depMs) return 0;
  if (nowMs <= depMs) return 0;
  if (nowMs >= delMs) return 100;
  return Math.round(((nowMs - depMs) / (delMs - depMs)) * 100);
}

/**
 * Generates default schedule for new shipment creation (departure tomorrow, delivery +15 days)
 * in local datetime input format.
 */
export function createDefaultSchedule(now?: number | Date): {
  departure: string;
  delivery: string;
} {
  const baseMs = now !== undefined ? new Date(now).getTime() : Date.now();
  const departureDate = new Date(baseMs + 24 * 3600 * 1000);
  const deliveryDate = new Date(baseMs + 15 * 24 * 3600 * 1000);

  return {
    departure: toLocalDatetimeInput(departureDate),
    delivery: toLocalDatetimeInput(deliveryDate),
  };
}

/**
 * Approves a hold gate milestone, recalculates timeline based on planned playtime vs elapsed time,
 * unpauses the shipment, and dynamically recalculates remaining future milestone dates.
 *
 * Operational contract:
 * 1. Calculate planned playtime: duration between this milestone and the next milestone.
 * 2. Calculate elapsed time: nowMs - targetStartMs.
 * 3. Remaining playtime = plannedDurationMs - elapsedMs.
 * 4. If remainingPlaytime > 0:
 *    - Milestone plays out its remaining time (isCompleted = false, isHoldGate = false).
 *    - Next milestone starts at nowMs + remainingPlaytime.
 * 5. If remainingPlaytime <= 0 (playtime exhausted during hold):
 *    - Milestone completes immediately (isCompleted = true, isHoldGate = false, timestamp = now).
 *    - Next milestone starts immediately at nowMs.
 * 6. In both cases, subsequent milestones maintain their original relative durations/intervals.
 * 7. Recalculates estimatedDeliveryDate to match the final milestone's new timestamp.
 * 8. Synchronizes waypoints with the new delivery date.
 */
export function approveMilestoneHold(
  shipment: Shipment,
  milestoneId: string,
  now: number | Date = Date.now()
): Shipment {
  const nowMs = typeof now === "number" ? now : new Date(now).getTime();
  const depMs = new Date(shipment.departureDate).getTime();

  const milestones = [...(shipment.milestones || [])];
  const targetIndex = milestones.findIndex((m) => m.id === milestoneId);
  if (targetIndex === -1) return shipment;

  const targetMilestone = milestones[targetIndex];
  const targetStartMs = new Date(targetMilestone.timestamp).getTime();

  // Planned playtime (duration) for this milestone until the next milestone starts
  let plannedDurationMs = 0;
  if (targetIndex < milestones.length - 1) {
    const nextStartMs = new Date(milestones[targetIndex + 1].timestamp).getTime();
    if (!Number.isNaN(nextStartMs) && !Number.isNaN(targetStartMs)) {
      plannedDurationMs = Math.max(0, nextStartMs - targetStartMs);
    }
  }

  // Elapsed time since this milestone was scheduled to start
  const elapsedMs = Math.max(0, nowMs - targetStartMs);
  const remainingPlaytimeMs = plannedDurationMs - elapsedMs;

  // Measure original intervals between all subsequent milestones
  const intervals: number[] = [];
  for (let i = targetIndex + 1; i < milestones.length; i++) {
    const prevMs = new Date(milestones[i - 1].timestamp).getTime();
    const currMs = new Date(milestones[i].timestamp).getTime();
    intervals.push(!Number.isNaN(currMs) && !Number.isNaN(prevMs) ? Math.max(0, currMs - prevMs) : 3600000);
  }

  let nextMilestoneStartMs: number;

  if (targetIndex === milestones.length - 1) {
    // Target is the final milestone in the shipment
    milestones[targetIndex] = {
      ...targetMilestone,
      timestamp: new Date(nowMs).toISOString(),
      isCompleted: true,
      isHoldGate: false,
    };
    nextMilestoneStartMs = nowMs;
  } else if (remainingPlaytimeMs > 0) {
    // Case 1: Playtime remains. Milestone plays remaining time before moving to next.
    milestones[targetIndex] = {
      ...targetMilestone,
      isCompleted: false,
      isHoldGate: false,
    };
    nextMilestoneStartMs = nowMs + remainingPlaytimeMs;
  } else {
    // Case 2: Playtime exhausted. Milestone completes immediately and next starts now.
    milestones[targetIndex] = {
      ...targetMilestone,
      timestamp: new Date(nowMs).toISOString(),
      isCompleted: true,
      isHoldGate: false,
    };
    nextMilestoneStartMs = nowMs;
  }

  // Recalculate timestamps for all future milestones shifted from nextMilestoneStartMs
  if (targetIndex < milestones.length - 1) {
    let cursorMs = nextMilestoneStartMs;
    milestones[targetIndex + 1] = {
      ...milestones[targetIndex + 1],
      timestamp: new Date(cursorMs).toISOString(),
      isCompleted: false,
    };

    for (let j = 1; j < intervals.length; j++) {
      const idx = targetIndex + 1 + j;
      cursorMs += intervals[j];
      milestones[idx] = {
        ...milestones[idx],
        timestamp: new Date(cursorMs).toISOString(),
        isCompleted: false,
      };
    }
  }

  // Update estimated delivery date to match the final milestone's recalculated timestamp
  const finalMilestone = milestones[milestones.length - 1];
  const newDelMs = finalMilestone
    ? new Date(finalMilestone.timestamp).getTime()
    : Math.max(nowMs + 24 * 3600 * 1000, new Date(shipment.estimatedDeliveryDate).getTime());

  const progressRatio = newDelMs > depMs ? Math.min(1, Math.max(0, (nowMs - depMs) / (newDelMs - depMs))) : 0;
  const updatedWaypoints = (shipment.waypoints || []).map((wp, idx, arr) => {
    const wpRatio = arr.length > 1 ? idx / (arr.length - 1) : 0;
    return { ...wp, isCompleted: progressRatio >= wpRatio && progressRatio > 0 };
  });

  const allCompleted = milestones.every((m) => m.isCompleted);

  return {
    ...shipment,
    isPaused: false,
    pausedReason: null,
    pausedLocationName: null,
    pausedAtTimestamp: null,
    pausedCoordinates: null,
    status: allCompleted ? "delivered" : "in_transit",
    estimatedDeliveryDate: new Date(newDelMs).toISOString(),
    milestones,
    waypoints: updatedWaypoints,
    updatedAt: new Date(nowMs).toISOString(),
  };
}
