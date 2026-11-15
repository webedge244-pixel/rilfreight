#!/usr/bin/env node
/**
 * RILFREIGHT Shipment Business Logic Verification Suite
 *
 * Validates the unified pure functions module `src/shared/lib/shipmentLogic.ts`:
 * 1. Operational Status Derivation (deriveShipmentStatus)
 * 2. Datetime Conversion Helpers (toLocalDatetimeInput, fromLocalDatetimeInput)
 * 3. Milestone Regulation & Hold Gate Invariance (regulateMilestones)
 * 4. Waypoint Synchronization (synchronizeWaypoints)
 * 5. Progress Calculation & Default Schedule (computeProgressPercent, createDefaultSchedule)
 *
 * Run with:
 *   node --no-warnings scripts/verify-shipment-logic.mjs
 */

import { registerHooks } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

// ─────────────────────────────────────────────────────────
// Resolve the "@/..." alias the way Next.js does.
// ─────────────────────────────────────────────────────────
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      let target = path.join(SRC, specifier.slice(2));
      for (const candidate of [".ts", ".tsx", "/index.ts"]) {
        if (fs.existsSync(target + candidate)) {
          target += candidate;
          break;
        }
      }
      return { url: pathToFileURL(target).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

// Import the module under test
const {
  deriveShipmentStatus,
  regulateMilestones,
  synchronizeWaypoints,
  approveMilestoneHold,
  advanceMilestoneImmediately,
  cascadeMilestoneGaps,
  swapMilestonesWithTimestampInheritance,
  toLocalDatetimeInput,
  fromLocalDatetimeInput,
  computeProgressPercent,
  createDefaultSchedule,
} = await import("@/shared/lib/shipmentLogic");

// Terminal styling
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

let totalAssertions = 0;
let passedAssertions = 0;
const errors = [];

function pass(msg) {
  console.log(`  ${colors.green}✓ PASS${colors.reset} ${msg}`);
}

function fail(msg, details = null) {
  console.error(`  ${colors.red}✗ FAIL${colors.reset} ${msg}`);
  if (details) {
    console.error(`    ${colors.gray}Detail: ${details}${colors.reset}`);
  }
}

function header(title) {
  console.log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`);
}

function assert(condition, message, details = null) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    pass(message);
    return true;
  } else {
    fail(message, details);
    errors.push({ message, details });
    return false;
  }
}

async function runShipmentLogicVerification() {
  console.log(`${colors.bold}RILFREIGHT Unified Shipment Logic Verification Suite${colors.reset}`);
  console.log(`${colors.dim}Project Root: ${ROOT}${colors.reset}\n`);

  // Fixed test timeline anchors
  const T_DEP = new Date("2026-11-15T10:00:00.000Z").getTime();
  const T_DEL = new Date("2026-11-20T10:00:00.000Z").getTime(); // +5 days = 120 hours

  // =============================================================================
  // Suite 1: Status Derivation (deriveShipmentStatus)
  // =============================================================================
  header("Suite 1: Operational Status Derivation (deriveShipmentStatus)");

  // 1.1 Future schedule -> pending
  const statusFuture = deriveShipmentStatus(T_DEP, T_DEL, {
    now: T_DEP - 3600000, // 1 hour before departure
  });
  assert(statusFuture === "pending", 'now < departureDate -> "pending"');

  // 1.2 Boundary: now === departure -> in_transit
  const statusDepBoundary = deriveShipmentStatus(T_DEP, T_DEL, {
    now: T_DEP,
  });
  assert(statusDepBoundary === "in_transit", 'now === departureDate -> "in_transit"');

  // 1.3 Active transit -> in_transit
  const statusMid = deriveShipmentStatus(T_DEP, T_DEL, {
    now: T_DEP + 3600000 * 24, // 24 hours into transit
  });
  assert(statusMid === "in_transit", 'departureDate <= now < deliveryDate -> "in_transit"');

  // 1.4 Boundary: 1ms before delivery -> in_transit
  const statusBeforeDel = deriveShipmentStatus(T_DEP, T_DEL, {
    now: T_DEL - 1,
  });
  assert(statusBeforeDel === "in_transit", 'now === deliveryDate - 1ms -> "in_transit"');

  // 1.5 Boundary: now === delivery -> delivered
  const statusDelBoundary = deriveShipmentStatus(T_DEP, T_DEL, {
    now: T_DEL,
  });
  assert(statusDelBoundary === "delivered", 'now === deliveryDate -> "delivered"');

  // 1.6 Past delivery -> delivered
  const statusPast = deriveShipmentStatus(T_DEP, T_DEL, {
    now: T_DEL + 86400000,
  });
  assert(statusPast === "delivered", 'now > deliveryDate -> "delivered"');

  // 1.7 Hold Gate: isPaused: true with customs_hold preserved
  const statusCustoms = deriveShipmentStatus(T_DEP, T_DEL, {
    isPaused: true,
    currentStatus: "customs_hold",
    now: T_DEL + 86400000, // even though delivery has passed!
  });
  assert(
    statusCustoms === "customs_hold",
    'isPaused: true with currentStatus "customs_hold" is preserved'
  );

  // 1.8 Hold Gate: isPaused: true with weather_delay preserved
  const statusWeather = deriveShipmentStatus(T_DEP, T_DEL, {
    isPaused: true,
    currentStatus: "weather_delay",
    now: T_DEP + 1000,
  });
  assert(
    statusWeather === "weather_delay",
    'isPaused: true with currentStatus "weather_delay" is preserved'
  );

  // 1.9 Hold Gate: isPaused: true with unspecified hold status defaults to customs_hold
  const statusDefaultHold = deriveShipmentStatus(T_DEP, T_DEL, {
    isPaused: true,
    currentStatus: "in_transit",
  });
  assert(
    statusDefaultHold === "customs_hold",
    'isPaused: true with non-hold status defaults safely to "customs_hold"'
  );

  // 1.10 Invalid dates fallback
  const statusInvalid = deriveShipmentStatus("invalid-date", "invalid-date", {
    currentStatus: "pending",
  });
  assert(
    statusInvalid === "pending",
    'Invalid dates safely fallback to currentStatus or "pending"'
  );

  // =============================================================================
  // Suite 2: Datetime Conversion Helpers (toLocalDatetimeInput, fromLocalDatetimeInput)
  // =============================================================================
  header("Suite 2: Datetime Formatting & Timezone Helpers");

  const sampleUtc = "2026-11-15T14:30:00.000Z";
  const localFormatted = toLocalDatetimeInput(sampleUtc);
  assert(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localFormatted),
    `toLocalDatetimeInput returns YYYY-MM-DDTHH:mm format (${localFormatted})`
  );

  // Already formatted string returned as-is
  const alreadyLocal = "2026-11-15T15:30";
  assert(
    toLocalDatetimeInput(alreadyLocal) === alreadyLocal,
    "toLocalDatetimeInput preserves already formatted local datetime strings"
  );

  // Date instance support
  const dateObj = new Date(sampleUtc);
  assert(
    toLocalDatetimeInput(dateObj) === localFormatted,
    "toLocalDatetimeInput handles Date instances identically to ISO strings"
  );

  // Numeric timestamp support
  assert(
    toLocalDatetimeInput(dateObj.getTime()) === localFormatted,
    "toLocalDatetimeInput handles numeric epoch milliseconds"
  );

  // Null, undefined, empty, invalid
  assert(toLocalDatetimeInput(null) === "", "toLocalDatetimeInput(null) returns empty string");
  assert(toLocalDatetimeInput(undefined) === "", "toLocalDatetimeInput(undefined) returns empty string");
  assert(toLocalDatetimeInput("") === "", "toLocalDatetimeInput('') returns empty string");
  assert(toLocalDatetimeInput("not-a-date") === "", "toLocalDatetimeInput(invalid) returns empty string");

  // fromLocalDatetimeInput
  const parsedIso = fromLocalDatetimeInput("2026-11-15T15:30");
  assert(
    typeof parsedIso === "string" && parsedIso.endsWith("Z"),
    `fromLocalDatetimeInput parses local input to valid ISO UTC string (${parsedIso})`
  );

  assert(fromLocalDatetimeInput(null) === null, "fromLocalDatetimeInput(null) returns null");
  assert(fromLocalDatetimeInput(undefined) === null, "fromLocalDatetimeInput(undefined) returns null");
  assert(fromLocalDatetimeInput("  ") === null, "fromLocalDatetimeInput whitespace returns null");
  assert(fromLocalDatetimeInput("invalid") === null, "fromLocalDatetimeInput invalid returns null");

  // Roundtrip preservation
  const testIso = new Date(2026, 10, 15, 12, 0, 0).toISOString();
  const testLocal = toLocalDatetimeInput(testIso);
  const backToIso = fromLocalDatetimeInput(testLocal);
  const backToLocal = toLocalDatetimeInput(backToIso);
  assert(
    backToLocal === testLocal,
    `Roundtrip fidelity: toLocal(fromLocal("${testLocal}")) === "${testLocal}"`
  );

  // =============================================================================
  // Suite 3: Milestone Regulation & Hold Gate Invariance (regulateMilestones)
  // =============================================================================
  header("Suite 3: Milestone Regulation & Hold Gate Invariance (regulateMilestones)");

  const syntheticMilestones = [
    {
      id: "ms-1",
      code: "DEP",
      title: "Departed Origin Facility",
      timestamp: "",
      isCompleted: false,
    },
    {
      id: "ms-2",
      code: "CUSR",
      title: "Import Customs Clearance Entry",
      timestamp: "",
      isCompleted: false,
      isHoldGate: true, // Hold gate!
    },
    {
      id: "ms-3",
      code: "ARR",
      title: "Arrived at Destination Facility",
      timestamp: "",
      isCompleted: false,
    },
  ];

  // 3.1 Proportional distribution on 3 milestones
  const regulatedMid = regulateMilestones(syntheticMilestones, T_DEP, T_DEL, {
    now: T_DEP + (T_DEL - T_DEP) / 2, // At 50%
    outputFormat: "iso",
  });

  assert(regulatedMid.length === 3, "Regulated milestones preserve length");

  const ms0Time = new Date(regulatedMid[0].timestamp).getTime();
  const ms1Time = new Date(regulatedMid[1].timestamp).getTime();
  const ms2Time = new Date(regulatedMid[2].timestamp).getTime();

  assert(ms0Time === T_DEP, "First milestone placed exactly at departure date");
  assert(ms1Time === Math.round(T_DEP + (T_DEL - T_DEP) / 2), "Second milestone placed exactly at midpoint");
  assert(ms2Time === T_DEL, "Third milestone placed exactly at delivery date");

  // 3.2 Completion evaluation: elapsed milestones complete, future milestones remain upcoming
  assert(regulatedMid[0].isCompleted === true, "Elapsed milestone ms-1 isCompleted === true");
  assert(regulatedMid[1].isCompleted === true, "Elapsed hold gate milestone ms-2 isCompleted === true (passed has passed)");
  assert(regulatedMid[2].isCompleted === false, "Future milestone ms-3 isCompleted === false");

  assert(
    regulatedMid[1].isHoldGate === false,
    "Elapsed hold gate milestone ms-2 has isHoldGate cleared to false (the one that has passed has passed)"
  );

  // 3.3 Future hold gate retains isHoldGate: true and isCompleted: false
  const futureWithHoldGate = [
    { id: "ms-1", code: "DEP", title: "Departed", timestamp: "", isCompleted: false },
    { id: "ms-2", code: "CUSR", title: "Future Customs Hold Gate", timestamp: "", isCompleted: false, isHoldGate: true },
    { id: "ms-3", code: "ARR", title: "Arrival", timestamp: "", isCompleted: false },
  ];
  const regulatedFuture = regulateMilestones(futureWithHoldGate, T_DEP, T_DEL, {
    now: T_DEP - 3600000, // before departure, so all are in future
    outputFormat: "iso",
  });
  assert(
    regulatedFuture[1].isHoldGate === true && regulatedFuture[1].isCompleted === false,
    "Future milestone with isHoldGate retains isHoldGate: true and isCompleted: false"
  );

  // 3.4 At 100% (after delivery): all elapsed milestones are completed
  const regulatedAfter = regulateMilestones(syntheticMilestones, T_DEP, T_DEL, {
    now: T_DEL + 3600000,
    outputFormat: "iso",
  });
  assert(regulatedAfter[0].isCompleted === true, "After delivery: ms-1 completed");
  assert(regulatedAfter[1].isCompleted === true, "After delivery: hold gate ms-2 completed");
  assert(regulatedAfter[2].isCompleted === true, "After delivery: ms-3 completed");

  // 3.4b approveMilestoneHold: Case 1 — Milestone Approval before scheduled next
  // Milestone 2 scheduled at T_DEP + 1h, next at T_DEP + 5h (planned interval = 4h).
  // Approved at T_DEP + 2h.
  const sampleShipmentPlaytime = {
    id: "TEST-SHIPMENT-1",
    trackingCode: "TEST-SHIPMENT-1",
    departureDate: new Date(T_DEP).toISOString(),
    estimatedDeliveryDate: new Date(T_DEL).toISOString(),
    status: "customs_hold",
    isPaused: true,
    milestones: [
      { id: "m-1", code: "DEP", title: "Departed", timestamp: new Date(T_DEP).toISOString(), isCompleted: true },
      { id: "m-2", code: "CUSR", title: "Customs Hold Gate", timestamp: new Date(T_DEP + 3600000).toISOString(), isCompleted: false, isHoldGate: true },
      { id: "m-3", code: "ARR", title: "Arrival", timestamp: new Date(T_DEP + 5 * 3600000).toISOString(), isCompleted: false },
    ],
    waypoints: [{ id: "wp-1", name: "Waypoint 1", isCompleted: false }],
  };
  const approvalTimePlaytime = T_DEP + 2 * 3600000;
  const approvedWithPlaytime = approveMilestoneHold(sampleShipmentPlaytime, "m-2", approvalTimePlaytime);
  assert(approvedWithPlaytime.isPaused === false, "approveMilestoneHold unpauses shipment");
  assert(approvedWithPlaytime.status === "in_transit", "approveMilestoneHold resumes in_transit");
  assert(approvedWithPlaytime.milestones[1].isCompleted === true, "Approved milestone marks completed immediately");
  assert(approvedWithPlaytime.milestones[1].isHoldGate === false, "approveMilestoneHold clears isHoldGate flag");
  assert(
    new Date(approvedWithPlaytime.milestones[2].timestamp).getTime() === T_DEP + 5 * 3600000,
    "Next milestone preserves future schedule if approval happened before scheduled time"
  );

  // 3.4c approveMilestoneHold: Case 2 — Approval after scheduled duration (elapsed)
  // Planned interval = 4h (1h to 5h). Approved at T_DEP + 7h (elapsed past original next schedule).
  const approvalTimeExhausted = T_DEP + 7 * 3600000;
  const approvedExhausted = approveMilestoneHold(sampleShipmentPlaytime, "m-2", approvalTimeExhausted);
  assert(approvedExhausted.isPaused === false, "approveMilestoneHold (elapsed) unpauses shipment");
  assert(approvedExhausted.milestones[1].isCompleted === true, "Elapsed milestone marks completed immediately");
  assert(approvedExhausted.milestones[1].isHoldGate === false, "Elapsed milestone clears isHoldGate flag");
  assert(
    new Date(approvedExhausted.milestones[2].timestamp).getTime() === approvalTimeExhausted,
    "Next milestone starts immediately at approvalTime when pause time exceeded schedule"
  );
  assert(
    new Date(approvedExhausted.estimatedDeliveryDate).getTime() === approvalTimeExhausted,
    "estimatedDeliveryDate shifts forward to match final recalculated milestone"
  );

  // 3.4d approveMilestoneHold: Case 3 — Final Milestone Approval
  const finalMilestoneShipment = {
    id: "TEST-SHIPMENT-FINAL",
    trackingCode: "TEST-SHIPMENT-FINAL",
    departureDate: new Date(T_DEP).toISOString(),
    estimatedDeliveryDate: new Date(T_DEL).toISOString(),
    status: "customs_hold",
    isPaused: true,
    milestones: [
      { id: "m-1", code: "DEP", title: "Departed", timestamp: new Date(T_DEP).toISOString(), isCompleted: true },
      { id: "m-2", code: "ARR", title: "Final Gate", timestamp: new Date(T_DEL).toISOString(), isCompleted: false, isHoldGate: true },
    ],
    waypoints: [{ id: "wp-1", name: "Waypoint 1", isCompleted: false }],
  };
  const approvedFinal = approveMilestoneHold(finalMilestoneShipment, "m-2", T_DEL + 1000);
  assert(approvedFinal.milestones[1].isCompleted === true, "Final milestone approved completes immediately");
  assert(approvedFinal.status === "delivered", "Approving final milestone transitions status to delivered");

  // 3.4e advanceMilestoneImmediately: fast-forwards active milestone and shifts future timeline
  const activeShipment = {
    id: "TEST-ACTIVE-1",
    trackingCode: "TEST-ACTIVE-1",
    departureDate: new Date(T_DEP).toISOString(),
    estimatedDeliveryDate: new Date(T_DEP + 10 * 3600000).toISOString(),
    status: "in_transit",
    isPaused: false,
    milestones: [
      { id: "m-1", code: "DEP", title: "Departed", timestamp: new Date(T_DEP).toISOString(), isCompleted: true },
      { id: "m-2", code: "TRANSIT", title: "Active Transit Leg", timestamp: new Date(T_DEP + 2 * 3600000).toISOString(), isCompleted: false },
      { id: "m-3", code: "CUSTOMS", title: "Upcoming Customs", timestamp: new Date(T_DEP + 6 * 3600000).toISOString(), isCompleted: false },
      { id: "m-4", code: "DELV", title: "Final Delivery", timestamp: new Date(T_DEP + 10 * 3600000).toISOString(), isCompleted: false },
    ],
    waypoints: [{ id: "wp-1", name: "Waypoint 1", isCompleted: false }],
  };

  const advanceNow = T_DEP + 3 * 3600000; // Fast-forwarded 1 hour into m-2
  const advancedShipment = advanceMilestoneImmediately(activeShipment, "m-2", advanceNow);

  assert(advancedShipment.milestones[1].isCompleted === true, "advanceMilestoneImmediately marks active milestone completed");
  assert(
    new Date(advancedShipment.milestones[2].timestamp).getTime() === advanceNow + 4 * 3600000,
    "Next milestone (m-3) retains the original 4-hour gap from active milestone (advanceNow + 4h, no identical dates)"
  );
  assert(
    new Date(advancedShipment.milestones[3].timestamp).getTime() === advanceNow + 8 * 3600000,
    "Subsequent milestone (m-4) shifts preserving its 4-hour interval from m-3 (advanceNow + 8h)"
  );
  assert(
    new Date(advancedShipment.estimatedDeliveryDate).getTime() === advanceNow + 8 * 3600000,
    "estimatedDeliveryDate shifts forward to match new final delivery milestone"
  );

  // Advancing the final milestone completes delivery
  const advanceFinalShipment = advanceMilestoneImmediately(activeShipment, "m-4", advanceNow + 1000);
  assert(advanceFinalShipment.milestones[3].isCompleted === true, "Advancing final milestone marks it completed");
  assert(advanceFinalShipment.status === "delivered", "Advancing final milestone transitions shipment status to delivered");

  // 3.5 Single milestone handling
  const single = regulateMilestones(
    [{ id: "s-1", code: "SINGLE", title: "Single Checkpoint", timestamp: "", isCompleted: false }],
    T_DEP,
    T_DEL,
    { now: T_DEP + 1000 }
  );
  assert(
    single.length === 1 && new Date(single[0].timestamp).getTime() === T_DEP && single[0].isCompleted === true,
    "Single milestone positioned at departure and completed when elapsed"
  );

  // 3.6 Empty array
  assert(
    regulateMilestones([], T_DEP, T_DEL).length === 0,
    "Empty milestones array returns empty array"
  );

  // 3.7 Inverted dates safely handled without NaN or crashes
  const inverted = regulateMilestones(syntheticMilestones, T_DEL, T_DEP, {
    now: T_DEP,
  });
  assert(
    inverted.length === 3 && !inverted.some((m) => m.timestamp.includes("NaN")),
    "Inverted dates safely handled without throwing or generating NaN timestamps"
  );

  // 3.8 Local output format support
  const localRegulated = regulateMilestones(syntheticMilestones, T_DEP, T_DEL, {
    now: T_DEP,
    outputFormat: "local",
  });
  assert(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localRegulated[0].timestamp),
    "outputFormat: 'local' produces valid datetime-local strings"
  );

  // =============================================================================
  // Suite 4: Waypoint Progression Synchronization (synchronizeWaypoints)
  // =============================================================================
  header("Suite 4: Waypoint Progression Synchronization (synchronizeWaypoints)");

  const waypoints = [
    { id: "wp-0", name: "Origin Port", coordinates: [0, 0], isCompleted: false },
    { id: "wp-1", name: "Canal Passage", coordinates: [10, 10], isCompleted: false },
    { id: "wp-2", name: "Midway Checkpoint", coordinates: [20, 20], isCompleted: false },
    { id: "wp-3", name: "Approaching Bay", coordinates: [30, 30], isCompleted: false },
    { id: "wp-4", name: "Destination Berth", coordinates: [40, 40], isCompleted: false },
  ];

  // 4.1 Before departure (0% progress)
  const wpBefore = synchronizeWaypoints(waypoints, T_DEP, T_DEL, {
    now: T_DEP - 3600000,
  });
  assert(
    wpBefore.every((w) => w.isCompleted === false),
    "Before departure (now < departure): 0 waypoints completed"
  );

  // 4.2 Exact departure boundary
  const wpAtDep = synchronizeWaypoints(waypoints, T_DEP, T_DEL, {
    now: T_DEP,
  });
  assert(
    wpAtDep.every((w) => w.isCompleted === false),
    "At departure boundary (progressRatio === 0): 0 waypoints completed"
  );

  // 4.3 50% progression (waypoints with wpRatio <= 0.5 are completed: idx 0, 1, 2)
  const wpHalf = synchronizeWaypoints(waypoints, T_DEP, T_DEL, {
    now: T_DEP + (T_DEL - T_DEP) * 0.5,
  });
  assert(
    wpHalf[0].isCompleted === true &&
    wpHalf[1].isCompleted === true &&
    wpHalf[2].isCompleted === true &&
    wpHalf[3].isCompleted === false &&
    wpHalf[4].isCompleted === false,
    "At 50% progression: waypoints 0, 1, 2 completed, waypoints 3, 4 upcoming"
  );

  // 4.4 100% progression (at or past delivery)
  const wpFull = synchronizeWaypoints(waypoints, T_DEP, T_DEL, {
    now: T_DEL + 1000,
  });
  assert(
    wpFull.every((w) => w.isCompleted === true),
    "At 100% progression (now >= delivery): all waypoints marked completed"
  );

  // 4.5 Empty array
  assert(
    synchronizeWaypoints([], T_DEP, T_DEL).length === 0,
    "Empty waypoints array returns empty array"
  );

  // =============================================================================
  // Suite 5: Progress Calculation & Default Schedule Helpers
  // =============================================================================
  header("Suite 5: Progress Percent & Default Schedule (computeProgressPercent, createDefaultSchedule)");

  // 5.1 Progress before departure -> 0
  assert(
    computeProgressPercent(T_DEP, T_DEL, T_DEP - 1000) === 0,
    "computeProgressPercent before departure returns 0"
  );

  // 5.2 Progress at 50% -> 50
  assert(
    computeProgressPercent(T_DEP, T_DEL, T_DEP + (T_DEL - T_DEP) * 0.5) === 50,
    "computeProgressPercent at exact midpoint returns 50"
  );

  // 5.3 Progress at or after delivery -> 100
  assert(
    computeProgressPercent(T_DEP, T_DEL, T_DEL + 10000) === 100,
    "computeProgressPercent after delivery returns 100"
  );

  // 5.4 Object signature ({ departureDate, estimatedDeliveryDate })
  const mockShipment = {
    departureDate: new Date(T_DEP).toISOString(),
    estimatedDeliveryDate: new Date(T_DEL).toISOString(),
  };
  assert(
    computeProgressPercent(mockShipment, T_DEP + (T_DEL - T_DEP) * 0.75) === 75,
    "computeProgressPercent accepts shipment object signature"
  );

  // 5.5 Inverted dates safe clamp
  assert(
    computeProgressPercent(T_DEL, T_DEP, T_DEP) === 0,
    "computeProgressPercent handles inverted dates safely returning 0"
  );

  // 5.6 createDefaultSchedule
  const fixedNow = new Date("2026-11-15T08:00:00.000Z");
  const sched = createDefaultSchedule(fixedNow);
  assert(
    typeof sched.departure === "string" && typeof sched.delivery === "string",
    "createDefaultSchedule returns departure and delivery strings"
  );
  assert(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(sched.departure) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(sched.delivery),
    "createDefaultSchedule formats in local datetime-local format"
  );

  // =============================================================================
  // Suite 6: Dynamic Adjacent Time-Gap Retention & Milestone Swap
  // =============================================================================
  header("Suite 6: Dynamic Adjacent Time-Gap Retention & Milestone Swap");

  // 6.1 Test user exact scenario: A (10:00), B (11:30 = +1h30m), C (12:00 = +30m)
  const baseTimeline = [
    { id: "A", title: "Milestone A", timestamp: "2026-11-15T10:00" },
    { id: "B", title: "Milestone B", timestamp: "2026-11-15T11:30" },
    { id: "C", title: "Milestone C", timestamp: "2026-11-15T12:00" },
  ];

  const cascadedTimeline = cascadeMilestoneGaps(baseTimeline, 0, "2026-11-15T14:00", {
    outputFormat: "local",
  });

  assert(
    cascadedTimeline[0].timestamp === "2026-11-15T14:00",
    "Milestone A updated to new timestamp 14:00"
  );
  assert(
    cascadedTimeline[1].timestamp === "2026-11-15T15:30",
    "Milestone B retains exact 1h 30m gap from A (14:00 + 90m = 15:30)"
  );
  assert(
    cascadedTimeline[2].timestamp === "2026-11-15T16:00",
    "Milestone C retains exact 30m gap from B (15:30 + 30m = 16:00)"
  );

  // 6.2 Test editing an intermediate milestone: B edited from 11:30 to 13:00
  const cascadedMid = cascadeMilestoneGaps(baseTimeline, 1, "2026-11-15T13:00", {
    outputFormat: "local",
  });
  assert(
    cascadedMid[0].timestamp === "2026-11-15T10:00",
    "Milestone A before index 1 remains untouched at 10:00"
  );
  assert(
    cascadedMid[1].timestamp === "2026-11-15T13:00",
    "Milestone B updated to 13:00"
  );
  assert(
    cascadedMid[2].timestamp === "2026-11-15T13:30",
    "Milestone C retains exact 30m gap from B (13:00 + 30m = 13:30)"
  );

  // 6.3 Test advanceMilestoneImmediately eliminates identical dates bug
  const advanceShipment = {
    id: "SHIP-ADV-1",
    departureDate: "2026-11-15T10:00:00.000Z",
    estimatedDeliveryDate: "2026-11-15T14:00:00.000Z",
    milestones: [
      { id: "M1", title: "Departure", timestamp: "2026-11-15T10:00:00.000Z", isCompleted: true },
      { id: "M2", title: "Customs Gate", timestamp: "2026-11-15T11:30:00.000Z", isCompleted: false },
      { id: "M3", title: "Destination Port", timestamp: "2026-11-15T12:00:00.000Z", isCompleted: false },
    ],
    waypoints: [],
  };

  const advanceNowMs = new Date("2026-11-15T10:45:00.000Z").getTime();
  const advanced = advanceMilestoneImmediately(advanceShipment, "M2", advanceNowMs);

  assert(
    advanced.milestones[1].isCompleted === true,
    "Fast-forwarded milestone M2 marked completed"
  );
  assert(
    new Date(advanced.milestones[1].timestamp).getTime() === advanceNowMs,
    "Fast-forwarded milestone M2 timestamp set to nowMs"
  );
  assert(
    new Date(advanced.milestones[2].timestamp).getTime() > advanceNowMs,
    "Next milestone M3 timestamp is strictly ahead of nowMs (no identical timestamps)"
  );
  const m2Tom3Gap = new Date(advanced.milestones[2].timestamp).getTime() - advanceNowMs;
  assert(
    m2Tom3Gap === 30 * 60 * 1000,
    "Next milestone M3 preserves the exact 30-minute original gap from M2"
  );
  assert(
    advanced.estimatedDeliveryDate === advanced.milestones[2].timestamp,
    "estimatedDeliveryDate automatically matches the new final milestone timestamp"
  );

  // 6.4 Test swapMilestonesWithTimestampInheritance
  const swapList = [
    { id: "A", title: "Step A", timestamp: "2026-11-15T10:00" },
    { id: "B", title: "Step B", timestamp: "2026-11-15T11:30" },
    { id: "C", title: "Step C", timestamp: "2026-11-15T14:00" },
  ];

  // Move B up to index 0 (swap index 1 and index 0)
  const swappedUp = swapMilestonesWithTimestampInheritance(swapList, 1, 0);
  assert(
    swappedUp[0].id === "B" && swappedUp[0].timestamp === "2026-11-15T10:00",
    "B moved up to index 0 and inherited time 10:00 from A going down"
  );
  assert(
    swappedUp[1].id === "A" && swappedUp[1].timestamp === "2026-11-15T11:30",
    "A moved down to index 1 and inherited time 11:30 from B going up"
  );
  assert(
    swappedUp[2].id === "C" && swappedUp[2].timestamp === "2026-11-15T14:00",
    "Milestone C at index 2 remained untouched"
  );

  // Verification Summary
  header("Verification Summary & Verdict");
  console.log(`\n${colors.bold}Test Execution Summary:${colors.reset}`);
  console.log(`  • Total Assertions:  ${totalAssertions}`);
  console.log(`  • Passed Assertions: ${colors.green}${passedAssertions}${colors.reset}`);
  console.log(`  • Failed Assertions: ${errors.length > 0 ? colors.red + errors.length + colors.reset : colors.green + "0" + colors.reset}`);

  if (errors.length > 0) {
    console.error(`\n${colors.red}${colors.bold}====================================================${colors.reset}`);
    console.error(`${colors.red}${colors.bold}  ✗ SHIPMENT LOGIC VERIFICATION FAILED               ${colors.reset}`);
    console.error(`${colors.red}${colors.bold}====================================================${colors.reset}`);
    for (const [index, err] of errors.entries()) {
      console.error(`  ${index + 1}. ${err.message}`);
      if (err.details) console.error(`     ${colors.gray}${err.details}${colors.reset}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bold}====================================================${colors.reset}`);
    console.log(`${colors.green}${colors.bold}  ✓ ALL SHIPMENT LOGIC UNIT TESTS PASSED (100%)      ${colors.reset}`);
    console.log(`${colors.green}${colors.bold}====================================================${colors.reset}\n`);
    process.exit(0);
  }
}

runShipmentLogicVerification().catch((err) => {
  console.error(`\n${colors.red}Unhandled Exception in Shipment Logic Verifier:${colors.reset}`, err);
  process.exit(1);
});
