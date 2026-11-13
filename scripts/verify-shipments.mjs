/**
 * Shipment lifecycle verification.
 *
 * Exercises the real data paths against the live Firestore instance:
 *
 *   1. identifier allocation and its uniqueness guarantee;
 *   2. the stored shape (Firestore rejects nested arrays);
 *   3. every read path used by the console — list, point read, live listener;
 *   4. the dashboard aggregates;
 *   5. the pause / release round trip.
 *
 * Every record it creates is removed again at the end.
 *
 * Run with:  node scripts/verify-shipments.mjs
 */

import { registerHooks } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

// Resolve the "@/..." alias the way Next.js does.
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

// Load .env.local the way Next.js does.
for (const line of fs
  .readFileSync(path.join(ROOT, ".env.local"), "utf8")
  .split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

const {
  createShipmentRecord,
  replaceShipmentRecord,
  getShipmentRecord,
  getShipmentByTrackingCode,
  listenToShipments,
  listenToShipmentRecord,
  getShipmentCounts,
  getMonthlyModeBreakdown,
  getPlatformUserCount,
  shipmentsCollection,
  db,
} = await import(pathToFileURL(path.join(SRC, "shared/lib/firebase.ts")).href);

const { doc, deleteDoc, getDoc, getDocs, query, where } = await import(
  "firebase/firestore"
);
const { releaseShipmentGate, triggerShipmentException } = await import(
  pathToFileURL(
    path.join(SRC, "features/tracking/services/trackingService.ts")
  ).href
);

const results = [];
const ok = (label, extra = "") => results.push(`  PASS  ${label}${extra}`);
const bad = (label, extra = "") => results.push(`  FAIL  ${label}${extra}`);
const check = (label, condition, extra = "") =>
  condition ? ok(label, extra) : bad(label, extra);

// ─────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────
const stamp = Date.now();
const unique = `${String(stamp).slice(-4)}${String(stamp).slice(-6, -2)}`;

function buildShipment(overrides = {}) {
  return {
    id: "PENDING",
    trackingCode: "PENDING",
    mode: "ocean",
    status: "in_transit",
    originName: "Port of Shanghai",
    originCode: "CNSHA",
    originCountry: "China",
    originCoordinates: [121.5, 31.0],
    destinationName: "Port of Montreal",
    destinationCode: "CAMTR",
    destinationCountry: "Canada",
    destinationCoordinates: [-73.55, 45.5],
    departureDate: new Date(Date.now() - 86400000).toISOString(),
    estimatedDeliveryDate: new Date(Date.now() + 12 * 86400000).toISOString(),
    isPaused: false,
    conveyanceName: "MV Pacific Trader",
    conveyanceIdentifier: "IMO 9811000",
    voyageNumber: "2403E",
    consignmentReference: "RILU8492019",
    containerNumber: "MSKU 729183-4",
    sealNumber: "RIL-99201",
    totalPieces: 12,
    grossWeightKg: 18450,
    volumeCbm: 33.2,
    goodsDescription: "Industrial machinery parts",
    clientName: "Verification",
    routeCoordinates: [
      [121.5, 31.0],
      [32.3, 31.2],
      [-73.55, 45.5],
    ],
    waypoints: [
      {
        id: "wp-1",
        name: "Port of Shanghai",
        code: "CNSHA",
        country: "China",
        coordinates: [121.5, 31.0],
        isCompleted: true,
      },
      {
        id: "wp-2",
        name: "Port of Montreal",
        code: "CAMTR",
        country: "Canada",
        coordinates: [-73.55, 45.5],
        isCompleted: false,
      },
    ],
    milestones: [
      {
        id: "ms-1",
        code: "GTIN",
        title: "Gate-In Origin",
        description: "Container received at terminal",
        locationName: "Shanghai Yangshan Terminal",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        isCompleted: true,
        coordinates: [121.5, 31.0],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────
// Suite 1 — Identifier allocation
// ─────────────────────────────────────────────────────────
console.log("\n1. Identifier allocation");

const code = `RIL-${unique.slice(0, 4)}-${unique.slice(4, 8)}-ZZ`;
let created;
try {
  created = await createShipmentRecord(buildShipment({ trackingCode: code, id: code }));
  check("first write succeeds", created.id === code, ` -> ${created.id}`);
} catch (error) {
  bad("first write succeeds", ` ${error.message}`);
}

let duplicate;
try {
  duplicate = await createShipmentRecord(
    buildShipment({ trackingCode: code, id: code, goodsDescription: "SECOND" })
  );
  check(
    "duplicate identifier is refused, a new one is allocated",
    duplicate.id !== code,
    ` -> ${duplicate.id}`
  );
} catch (error) {
  bad("duplicate identifier is refused, a new one is allocated", ` ${error.message}`);
}

// ─────────────────────────────────────────────────────────
// Suite 2 — Stored shape
// ─────────────────────────────────────────────────────────
console.log("2. Stored shape");

try {
  const stored = await getDoc(doc(db, "shipments", code));
  const raw = stored.data()?.routeCoordinates;
  const isFlat = Array.isArray(raw) && raw.every((n) => typeof n === "number");
  check("route polyline is stored flat (Firestore rejects nested arrays)", isFlat,
    ` -> ${JSON.stringify(raw)}`);
} catch (error) {
  bad("route polyline is stored flat (Firestore rejects nested arrays)", ` ${error.message}`);
}

try {
  const decoded = await getShipmentRecord(code);
  const pairs =
    Array.isArray(decoded?.routeCoordinates) &&
    decoded.routeCoordinates.length === 3 &&
    decoded.routeCoordinates[0][0] === 121.5 &&
    decoded.routeCoordinates[2][1] === 45.5;
  check("route polyline decodes back into coordinate pairs", pairs);
} catch (error) {
  bad("route polyline decodes back into coordinate pairs", ` ${error.message}`);
}

try {
  const decoded = await getShipmentRecord(code);
  check("waypoints survive the round trip", decoded?.waypoints?.length === 2);
  check("milestones survive the round trip", decoded?.milestones?.length === 1);
  check(
    "nested coordinates inside a waypoint survive",
    decoded?.waypoints?.[0]?.coordinates?.[0] === 121.5
  );
} catch (error) {
  bad("waypoints / milestones survive the round trip", ` ${error.message}`);
}

// ─────────────────────────────────────────────────────────
// Suite 3 — Read paths used by the console
// ─────────────────────────────────────────────────────────
console.log("3. Read paths");

try {
  const found = await getShipmentByTrackingCode(code);
  check("point read by tracking code returns the record", found?.trackingCode === code);
} catch (error) {
  bad("point read by tracking code returns the record", ` ${error.message}`);
}

try {
  const found = await getShipmentByTrackingCode(code.toLowerCase());
  check("point read is case-insensitive", found?.trackingCode === code);
} catch (error) {
  bad("point read is case-insensitive", ` ${error.message}`);
}

try {
  const missing = await getShipmentByTrackingCode("RIL-0000-0000-ZZ");
  check("point read returns null for an unknown code", missing === null);
} catch (error) {
  bad("point read returns null for an unknown code", ` ${error.message}`);
}

try {
  const listed = await new Promise((resolve) => {
    const unsubscribe = listenToShipments(100, (shipments) => {
      unsubscribe();
      resolve(shipments);
    });
  });
  check("collection listener includes the record", listed.some((s) => s.id === code),
    ` (${listed.length} in collection)`);
} catch (error) {
  bad("collection listener includes the record", ` ${error.message}`);
}

try {
  const live = await new Promise((resolve) => {
    const unsubscribe = listenToShipmentRecord(code, (shipment) => {
      unsubscribe();
      resolve(shipment);
    });
  });
  check("document listener delivers the record", live?.trackingCode === code);
} catch (error) {
  bad("document listener delivers the record", ` ${error.message}`);
}

// ─────────────────────────────────────────────────────────
// Suite 4 — Dashboard aggregates
// ─────────────────────────────────────────────────────────
console.log("4. Dashboard aggregates");

try {
  const counts = await getShipmentCounts();
  check("total count includes the record", counts.total >= 1, ` -> ${counts.total}`);
  check("in-transit count includes the record", counts.inTransit >= 1, ` -> ${counts.inTransit}`);
} catch (error) {
  bad("dashboard counts resolve", ` ${error.message}`);
}

try {
  const breakdown = await getMonthlyModeBreakdown();
  check("monthly breakdown counts the record", breakdown.total >= 1, ` -> ${breakdown.total}`);
  check("monthly breakdown classifies the mode", breakdown.ocean >= 1, ` -> ocean ${breakdown.ocean}`);
} catch (error) {
  bad("monthly breakdown resolves", ` ${error.message}`);
}

try {
  const users = await getPlatformUserCount();
  check("platform user count resolves", typeof users === "number", ` -> ${users}`);
} catch (error) {
  bad("platform user count resolves", ` ${error.message}`);
}

// ─────────────────────────────────────────────────────────
// Suite 5 — Pause / release round trip
// ─────────────────────────────────────────────────────────
console.log("5. Pause / release round trip");

try {
  const current = await getShipmentRecord(code);
  const paused = triggerShipmentException(current, "Verification Hold", "customs_hold");
  await replaceShipmentRecord(code, paused);

  const afterPause = await getShipmentRecord(code);
  check("pause is persisted", afterPause?.isPaused === true);
  check("pause status is persisted", afterPause?.status === "customs_hold");
  check("pause reason is persisted", afterPause?.pausedReason === "Verification Hold");
  check("pause position is persisted", Array.isArray(afterPause?.pausedCoordinates));
} catch (error) {
  bad("pause round trip", ` ${error.message}`);
}

try {
  const current = await getShipmentRecord(code);
  const released = releaseShipmentGate(current);
  await replaceShipmentRecord(code, released);

  const afterRelease = await getShipmentRecord(code);
  check("release clears the pause flag", afterRelease?.isPaused === false);
  check("release restores the in-transit status", afterRelease?.status === "in_transit");
  check("release removes the pause reason", !afterRelease?.pausedReason);
  check("release removes the pause position", !afterRelease?.pausedCoordinates);
  check("release keeps the cargo manifest intact", afterRelease?.totalPieces === 12);
  check("release keeps the polyline intact", afterRelease?.routeCoordinates?.length === 3);
} catch (error) {
  bad("release round trip", ` ${error.message}`);
}

// ─────────────────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────────────────
console.log("6. Cleanup");

// Sweep every record this script may have left behind. Test records always
// end in the "-ZZ" suffix and carry the verification consignee.
const sweep = await getDocs(
  query(shipmentsCollection, where("clientName", "==", "Verification"))
);
for (const docSnap of sweep.docs) {
  const id = docSnap.id;
  try {
    await deleteDoc(doc(db, "shipments", id));
    ok(`removed ${id}`);
  } catch (error) {
    bad(`removed ${id}`, ` ${error.message}`);
  }
}

for (const docSnap of (await getDocs(
  query(shipmentsCollection, where("clientName", "==", "Verification"))
)).docs) {
  bad(`${docSnap.id} is gone`);
}
ok("no verification records remain in the collection");

console.log("");
for (const line of results) console.log(line);

const failures = results.filter((r) => r.includes("FAIL")).length;
console.log(`\n  ${results.length - failures} passed, ${failures} failed\n`);
process.exitCode = failures > 0 ? 1 : 0;
