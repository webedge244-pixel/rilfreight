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
  const targetTimeMs = new Date(targetMilestone.timestamp).getTime();

  // 1. Calculate the exact elapsed pause duration
  const pausedAtMs = shipment.pausedAtTimestamp
    ? new Date(shipment.pausedAtTimestamp).getTime()
    : targetTimeMs;
  const pausedDurationMs = Math.max(0, nowMs - pausedAtMs);

  // 2. Mark the held milestone completed and clear the hold gate flag
  milestones[targetIndex] = {
    ...targetMilestone,
    isCompleted: true,
    status: "completed",
    isHoldGate: false,
  };

  // 3. Displace all subsequent uncompleted milestones forward by pausedDurationMs
  const shiftedMilestones = milestones.map((m, idx) => {
    if (idx <= targetIndex) {
      return m; // Historical completed milestones remain untouched
    }
    const origMs = new Date(m.timestamp).getTime();
    const newMs = !Number.isNaN(origMs) ? origMs + pausedDurationMs : origMs;
    return {
      ...m,
      timestamp: new Date(newMs).toISOString(),
      isCompleted: false,
      status: "pending",
    };
  });

  // 4. Displace estimated delivery date by the same paused duration
  const origDelMs = new Date(shipment.estimatedDeliveryDate).getTime();
  const newDelMs = !Number.isNaN(origDelMs)
    ? origDelMs + pausedDurationMs
    : (shiftedMilestones[shiftedMilestones.length - 1]
        ? new Date(shiftedMilestones[shiftedMilestones.length - 1].timestamp).getTime()
        : nowMs);

  const progressRatio = newDelMs > depMs ? Math.min(1, Math.max(0, (nowMs - depMs) / (newDelMs - depMs))) : 0;
  const updatedWaypoints = (shipment.waypoints || []).map((wp, idx, arr) => {
    const wpRatio = arr.length > 1 ? idx / (arr.length - 1) : 0;
    return { ...wp, isCompleted: progressRatio >= wpRatio && progressRatio > 0 };
  });

  const allCompleted = shiftedMilestones.every((m) => m.isCompleted);
  const accumulatedPausedMs = (shipment.totalPausedDurationMs || 0) + pausedDurationMs;

  return {
    ...shipment,
    isPaused: false,
    pausedReason: null,
    pausedLocationName: null,
    pausedAtTimestamp: null,
    pausedCoordinates: null,
    totalPausedDurationMs: accumulatedPausedMs,
    status: allCompleted ? "delivered" : "in_transit",
    estimatedDeliveryDate: new Date(newDelMs).toISOString(),
    milestones: shiftedMilestones,
    waypoints: updatedWaypoints,
    updatedAt: new Date(nowMs).toISOString(),
  };
}

/**
 * Cascades time gaps sequentially down a milestone list starting from a given index.
 * Dynamically computes original adjacent time gaps:
 *   Δ_k = Time(orig[k]) - Time(orig[k-1])
 * And applies them sequentially:
 *   Time(next[k]) = Time(next[k-1]) + Δ_k
 * 
 * Never stores gaps in database; calculated dynamically on changes.
 */
export function cascadeMilestoneGaps<T extends { timestamp: string }>(
  milestones: T[],
  startIndex: number,
  newStartTime: string | number | Date,
  options?: {
    outputFormat?: "iso" | "local";
    minGapMs?: number;
  }
): T[] {
  if (!milestones || milestones.length === 0 || startIndex < 0 || startIndex >= milestones.length) {
    return milestones;
  }

  const minGapMs = options?.minGapMs ?? 30 * 60 * 1000; // 30 min minimum fallback
  const isLocalOutput =
    options?.outputFormat === "local" ||
    (typeof newStartTime === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(newStartTime));

  const formatTimestamp = (ms: number): string => {
    return isLocalOutput ? toLocalDatetimeInput(ms) : new Date(ms).toISOString();
  };

  const parseMs = (val: string | number | Date | undefined | null): number => {
    if (val === null || val === undefined) return NaN;
    if (typeof val === "number") return val;
    if (val instanceof Date) return val.getTime();
    const str = String(val);
    const converted = fromLocalDatetimeInput(str);
    const ms = new Date(converted || str).getTime();
    return Number.isFinite(ms) ? ms : NaN;
  };

  const newStartMs = parseMs(newStartTime);
  if (Number.isNaN(newStartMs)) return milestones;

  // 1. Measure dynamic relative gaps between adjacent milestones from original array
  const adjacentGaps: number[] = [];
  for (let k = startIndex + 1; k < milestones.length; k++) {
    const prevOrigMs = parseMs(milestones[k - 1].timestamp);
    const currOrigMs = parseMs(milestones[k].timestamp);
    const rawGap = !Number.isNaN(currOrigMs) && !Number.isNaN(prevOrigMs) ? currOrigMs - prevOrigMs : minGapMs;
    adjacentGaps.push(rawGap > 0 ? rawGap : minGapMs);
  }

  // 2. Clone and update milestones sequentially
  const updated = [...milestones];
  updated[startIndex] = {
    ...updated[startIndex],
    timestamp: formatTimestamp(newStartMs),
  };

  let cursorMs = newStartMs;
  for (let i = 0; i < adjacentGaps.length; i++) {
    const nextIdx = startIndex + 1 + i;
    cursorMs += adjacentGaps[i];
    updated[nextIdx] = {
      ...updated[nextIdx],
      timestamp: formatTimestamp(cursorMs),
    };
  }

  return updated;
}

/**
 * Swaps two adjacent milestones in an array while swapping their timestamps:
 * The milestone moving up inherits the timestamp of the milestone going down,
 * and the milestone going down inherits the timestamp of the milestone going up.
 */
export function swapMilestonesWithTimestampInheritance<T extends { timestamp: string }>(
  milestones: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (
    !milestones ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= milestones.length ||
    toIndex >= milestones.length ||
    fromIndex === toIndex
  ) {
    return milestones;
  }

  const next = [...milestones];
  const fromTime = next[fromIndex].timestamp;
  const toTime = next[toIndex].timestamp;

  const itemFrom = { ...next[fromIndex], timestamp: toTime };
  const itemTo = { ...next[toIndex], timestamp: fromTime };

  next[fromIndex] = itemTo;
  next[toIndex] = itemFrom;
  return next;
}

/**
 * Fast-forwards milestone progression:
 * Immediately completes the active milestone at nowMs, and cascades all subsequent milestones
 * forward preserving the dynamic original time gap between each adjacent pair of checkpoints.
 */
export function advanceMilestoneImmediately(
  shipment: Shipment,
  milestoneId: string,
  now: number | Date = Date.now()
): Shipment {
  const nowMs = typeof now === "number" ? now : new Date(now).getTime();
  const depMs = new Date(shipment.departureDate).getTime();

  const originalMilestones = shipment.milestones || [];
  const targetIndex = originalMilestones.findIndex((m) => m.id === milestoneId);
  if (targetIndex === -1) return shipment;

  const targetMilestone = originalMilestones[targetIndex];
  const targetIsHoldGate = Boolean(targetMilestone?.isHoldGate);

  // 1. Cascade all downstream milestone gaps starting from targetIndex at nowMs
  const cascaded = cascadeMilestoneGaps(originalMilestones, targetIndex, nowMs, {
    outputFormat: "iso",
  });

  // 2. Mark preceding milestones completed.
  // If the target milestone is a hold gate, it holds at nowMs until admin approves.
  const updatedMilestones = cascaded.map((m, idx) => {
    if (idx < targetIndex) {
      return {
        ...m,
        isCompleted: true,
        status: "completed",
        isHoldGate: false,
      };
    }
    if (idx === targetIndex) {
      return {
        ...m,
        isCompleted: targetIsHoldGate ? false : true,
        status: targetIsHoldGate ? "pending" : "completed",
        isHoldGate: targetIsHoldGate,
      };
    }
    return {
      ...m,
      isCompleted: false,
      status: "pending",
    };
  });

  // 3. Update estimatedDeliveryDate to match the final milestone's new timestamp
  const finalMilestone = updatedMilestones[updatedMilestones.length - 1];
  const newDelMs = finalMilestone
    ? new Date(finalMilestone.timestamp).getTime()
    : Math.max(nowMs + 24 * 3600 * 1000, new Date(shipment.estimatedDeliveryDate).getTime());

  const allCompleted = updatedMilestones.every((m) => m.isCompleted);
  const progressRatio = newDelMs > depMs ? Math.min(1, Math.max(0, (nowMs - depMs) / (newDelMs - depMs))) : 0;
  const updatedWaypoints = (shipment.waypoints || []).map((wp, idx, arr) => {
    const wpRatio = arr.length > 1 ? idx / (arr.length - 1) : 0;
    return { ...wp, isCompleted: progressRatio >= wpRatio && progressRatio > 0 };
  });

  // If this target milestone was flagged as a hold gate, engage the hold gate at this checkpoint
  if (targetIsHoldGate) {
    return {
      ...shipment,
      isPaused: true,
      status: "customs_hold",
      pausedReason: targetMilestone.description || "Awaiting administrative clearance",
      pausedLocationName: targetMilestone.locationName || null,
      pausedCoordinates: targetMilestone.coordinates || null,
      pausedAtTimestamp: new Date(nowMs).toISOString(),
      estimatedDeliveryDate: new Date(newDelMs).toISOString(),
      actualDeliveryDate: null,
      milestones: updatedMilestones,
      waypoints: updatedWaypoints,
      updatedAt: new Date(nowMs).toISOString(),
    };
  }

  return {
    ...shipment,
    isPaused: false,
    pausedReason: null,
    pausedLocationName: null,
    pausedAtTimestamp: null,
    pausedCoordinates: null,
    status: allCompleted ? "delivered" : "in_transit",
    estimatedDeliveryDate: new Date(newDelMs).toISOString(),
    actualDeliveryDate: allCompleted ? new Date(nowMs).toISOString() : shipment.actualDeliveryDate,
    milestones: updatedMilestones,
    waypoints: updatedWaypoints,
    updatedAt: new Date(nowMs).toISOString(),
  };
}
