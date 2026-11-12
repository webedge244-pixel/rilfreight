import type { TrackingMilestone } from "@/shared/types";

/**
 * Time window a milestone timeline must live inside: shipment departure → delivery.
 */
export interface MilestoneWindow {
  departureMs: number;
  deliveryMs: number;
}

export type MilestoneIssueCode =
  | "OUT_OF_WINDOW"
  | "OUT_OF_ORDER"
  | "INVALID_DWELL"
  | "LONG_DWELL"
  | "LOCATION_BACKTRACK"
  | "ORIGIN_MISMATCH"
  | "DESTINATION_MISMATCH"
  | "INVALID_WINDOW";

export interface MilestoneIssue {
  index: number;
  code: MilestoneIssueCode;
  level: "error" | "warning";
  message: string;
  /** Automatic correction available for this issue. */
  fixable: boolean;
}

const MAX_REASONABLE_DWELL_HOURS = 72;

/**
 * Dock-in / gate-in / ramp-in checkpoints legitimately precede the formal
 * departure (the ocean corridor books its gate-in 24h out, rail ramp-in 12h).
 * The guardrail therefore allows a lead time before departure before it
 * treats a checkpoint as an inconsistent date.
 */
export const PRE_DEPARTURE_TOLERANCE_MS = 36 * 3600 * 1000;

/**
 * The inclusive window a checkpoint is allowed to sit in.
 */
export function milestoneBounds(win: MilestoneWindow): { lo: number; hi: number } {
  return {
    lo: Math.min(win.departureMs, win.deliveryMs) - PRE_DEPARTURE_TOLERANCE_MS,
    hi: Math.max(win.departureMs, win.deliveryMs),
  };
}

function parseTimestamp(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : NaN;
}

/**
 * Clamps a timestamp into the shipment window.
 */
export function clampToWindow(ms: number, win: MilestoneWindow): number {
  const lo = Math.min(win.departureMs, win.deliveryMs);
  const hi = Math.max(win.departureMs, win.deliveryMs);
  return Math.min(Math.max(ms, lo), hi);
}

/**
 * Normalises a milestone list so it can never contradict the shipment window:
 * every timestamp is clamped into [departure, delivery] and forced to be
 * non-decreasing so the timeline always reads chronologically.
 */
export function normalizeMilestones(
  milestones: TrackingMilestone[],
  win: MilestoneWindow
): TrackingMilestone[] {
  const { lo, hi } = milestoneBounds(win);
  let prev = lo;

  return milestones.map((m) => {
    const parsed = parseTimestamp(m.timestamp);
    let ms = Number.isFinite(parsed) ? parsed : prev;
    ms = Math.min(Math.max(ms, prev), hi);
    prev = ms;
    return { ...m, timestamp: new Date(ms).toISOString() };
  });
}

/**
 * Re-assigns the existing timestamps to the milestones in their current order
 * (earliest time slot → first position). Used after a reorder so the timeline
 * stays chronological no matter how the admin arranges the entries.
 */
export function reassignTimestamps(
  milestones: TrackingMilestone[]
): TrackingMilestone[] {
  const slots = milestones
    .map((m) => parseTimestamp(m.timestamp))
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);

  if (slots.length !== milestones.length) return milestones;

  return milestones.map((m, i) => ({
    ...m,
    timestamp: new Date(slots[i]).toISOString(),
  }));
}

/**
 * Builds the ordered list of location codes along the route so milestone
 * locations can be checked for backtracking ("crisscrossing").
 */
export function buildRouteOrder(
  originCode?: string,
  waypointCodes: string[] = [],
  destinationCode?: string
): string[] {
  const order: string[] = [];
  const push = (code?: string) => {
    if (code && !order.includes(code)) order.push(code);
  };

  push(originCode);
  waypointCodes.forEach(push);
  push(destinationCode);
  return order;
}

/**
 * Returns the index the milestone currently occupies, and the index it should
 * occupy given the route order — used to auto-reconcile a moved location.
 */
export function reconcileLocationOrder(
  milestones: TrackingMilestone[],
  editedIndex: number,
  routeOrder: string[]
): { list: TrackingMilestone[]; moved: boolean } {
  const editedCode = milestones[editedIndex]?.locationCode;
  const rank = editedCode ? routeOrder.indexOf(editedCode) : -1;
  if (rank < 0) return { list: milestones, moved: false };

  const list = [...milestones];
  const [moved] = list.splice(editedIndex, 1);

  let insertAt = 0;
  for (let j = 0; j < list.length; j++) {
    const otherRank = routeOrder.indexOf(list[j].locationCode ?? "");
    if (otherRank >= 0 && otherRank <= rank) insertAt = j + 1;
  }
  list.splice(insertAt, 0, moved);

  return { list, moved: insertAt !== editedIndex };
}

/**
 * Validates a milestone timeline against the shipment window and the route.
 */
export function detectMilestoneIssues(
  milestones: TrackingMilestone[],
  win: MilestoneWindow,
  routeOrder: string[] = [],
  originCode?: string,
  destinationCode?: string
): MilestoneIssue[] {
  const issues: MilestoneIssue[] = [];
  if (!milestones.length) return issues;

  if (win.deliveryMs <= win.departureMs) {
    issues.push({
      index: -1,
      code: "INVALID_WINDOW",
      level: "error",
      message:
        "Estimated delivery must be later than the departure date.",
      fixable: false,
    });
    return issues;
  }

  milestones.forEach((m, i) => {
    const ms = parseTimestamp(m.timestamp);

    if (!Number.isFinite(ms)) {
      issues.push({
        index: i,
        code: "OUT_OF_WINDOW",
        level: "error",
        message: "This checkpoint has no valid timestamp.",
        fixable: true,
      });
    } else {
      const { lo, hi } = milestoneBounds(win);
      if (ms < lo || ms > hi) {
        issues.push({
          index: i,
          code: "OUT_OF_WINDOW",
          level: "error",
          message:
            ms < lo
              ? "Scheduled before the shipment can even be staged at the origin — pulled forward to the departure window."
              : "Scheduled after the estimated delivery — pulled back to delivery.",
          fixable: true,
        });
      }

      if (i > 0) {
        const prevMs = parseTimestamp(milestones[i - 1].timestamp);
        if (Number.isFinite(prevMs) && ms < prevMs) {
          issues.push({
            index: i,
            code: "OUT_OF_ORDER",
            level: "error",
            message:
              "Runs earlier than the checkpoint above it — pushed to keep the timeline chronological.",
            fixable: true,
          });
        }
      }
    }

    if (typeof m.dwellHours === "number") {
      if (m.dwellHours < 0) {
        issues.push({
          index: i,
          code: "INVALID_DWELL",
          level: "error",
          message: "Dwell time cannot be negative.",
          fixable: true,
        });
      } else if (m.dwellHours > MAX_REASONABLE_DWELL_HOURS) {
        issues.push({
          index: i,
          code: "LONG_DWELL",
          level: "warning",
          message: `Dwell of ${m.dwellHours}h exceeds the usual ${MAX_REASONABLE_DWELL_HOURS}h operational turnaround.`,
          fixable: false,
        });
      }
    }

    if (routeOrder.length > 1 && m.locationCode) {
      const rank = routeOrder.indexOf(m.locationCode);
      if (rank >= 0 && i > 0) {
        const prevRank = routeOrder.indexOf(milestones[i - 1].locationCode ?? "");
        if (prevRank >= 0 && rank < prevRank) {
          issues.push({
            index: i,
            code: "LOCATION_BACKTRACK",
            level: "error",
            message:
              "Location sits earlier on the route than the checkpoint above it — the corridor would double back.",
            fixable: true,
          });
        }
      }
    }
  });

  const first = milestones[0];
  if (originCode && first?.locationCode && first.locationCode !== originCode) {
    issues.push({
      index: 0,
      code: "ORIGIN_MISMATCH",
      level: "warning",
      message: `First checkpoint is not at the origin (${originCode}).`,
      fixable: false,
    });
  }

  const last = milestones[milestones.length - 1];
  if (
    destinationCode &&
    last?.locationCode &&
    last.locationCode !== destinationCode
  ) {
    issues.push({
      index: milestones.length - 1,
      code: "DESTINATION_MISMATCH",
      level: "warning",
      message: `Last checkpoint is not at the destination (${destinationCode}).`,
      fixable: false,
    });
  }

  return issues;
}
