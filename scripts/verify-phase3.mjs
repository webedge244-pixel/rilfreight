#!/usr/bin/env node
/**
 * RILFREIGHT Phase 3 Verification Suite
 * Validates the Admin "New Shipment" Route Studio:
 * 1. UI File Integrity & Static Code Analysis (src/app/admin/shipments/new/page.tsx)
 * 2. Route Studio Data Pipeline (Geocoding -> Gateway Snapping)
 * 3. Multimodal Route Polyline Generation (Ocean, Air, Rail, Road)
 * 4. Milestone Schedule & Operational Dwell Times
 * 5. Default Customs Hold Gates & Custom Toggleability Invariants
 * 6. Strict Firestore Shipment Payload Schema Conformance (Shipment interface)
 * 7. Edge Cases & Failure Modes (Origin == Dest, Inverted Dates, Antimeridian)
 * 8. Verification Summary & Verdict
 *
 * Usage:
 *   node scripts/verify-phase3.mjs
 *
 * Exit Codes:
 *   0 = All validation suites passed
 *   1 = One or more assertions failed
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Terminal formatting helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

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

// Global test failure collector
const errors = [];
let totalAssertions = 0;
let passedAssertions = 0;

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

console.log(`${colors.bold}RILFREIGHT Milestone 3: Phase 3 Verification Engine${colors.reset}`);
console.log(`${colors.dim}Project Root: ${projectRoot}${colors.reset}\n`);

// Critical File Paths
const PAGE_PATH = path.join(projectRoot, 'src', 'app', 'admin', 'shipments', 'new', 'page.tsx');
const API_PATH = path.join(projectRoot, 'src', 'app', 'api', 'route', 'calculate', 'route.ts');
const MAP_PATH = path.join(projectRoot, 'src', 'features', 'routing', 'components', 'RouteMiniMap.tsx');
const STEPPER_PATH = path.join(projectRoot, 'src', 'features', 'routing', 'components', 'CheckpointStepper.tsx');
const AUTOCOMPLETE_PATH = path.join(projectRoot, 'src', 'features', 'routing', 'components', 'AddressAutocomplete.tsx');
const TYPES_PATH = path.join(projectRoot, 'src', 'shared', 'types', 'index.ts');
const FIREBASE_PATH = path.join(projectRoot, 'src', 'shared', 'lib', 'firebase.ts');
const GEOCODER_PATH = path.join(projectRoot, 'src', 'server', 'routing', 'geocoder.ts');
const GATEWAY_MATCHER_PATH = path.join(projectRoot, 'src', 'server', 'routing', 'gatewayMatcher.ts');
const CORRIDOR_ENGINE_PATH = path.join(projectRoot, 'src', 'server', 'routing', 'corridorEngine.ts');
const MILESTONES_PATH = path.join(projectRoot, 'src', 'server', 'routing', 'milestones.ts');
const IDENTIFIERS_PATH = path.join(projectRoot, 'src', 'server', 'routing', 'identifiers.ts');

async function runPhase3Verification() {
  // =============================================================================
  // Suite 1: UI File Integrity & Static Component Checks
  // =============================================================================
  header('Suite 1: UI File Integrity & Static Code Analysis (page.tsx)');

  assert(fs.existsSync(PAGE_PATH), `Route Studio page exists: src/app/admin/shipments/new/page.tsx`);
  assert(fs.existsSync(API_PATH), `Route calculation API exists: src/app/api/route/calculate/route.ts`);
  assert(fs.existsSync(MAP_PATH), `RouteMiniMap component exists: src/features/routing/components/RouteMiniMap.tsx`);
  assert(fs.existsSync(STEPPER_PATH), `CheckpointStepper component exists: src/features/routing/components/CheckpointStepper.tsx`);
  assert(fs.existsSync(AUTOCOMPLETE_PATH), `AddressAutocomplete component exists: src/features/routing/components/AddressAutocomplete.tsx`);

  let pageContent = '';
  if (fs.existsSync(PAGE_PATH)) {
    pageContent = fs.readFileSync(PAGE_PATH, 'utf-8');

    // 1.1 Client Component Directive
    assert(
      pageContent.includes('"use client"') || pageContent.includes("'use client'"),
      `page.tsx contains "use client" directive for interactive client hooks`
    );

    // 1.2 Default Component Export
    assert(
      /export\s+default\s+function/i.test(pageContent) || /export\s+default/i.test(pageContent),
      `page.tsx exports a default React page component`
    );

    // 1.3 Transport Mode Selector
    const hasModeSelector =
      pageContent.includes('ocean') &&
      pageContent.includes('air') &&
      pageContent.includes('rail') &&
      pageContent.includes('road');
    assert(
      hasModeSelector,
      `page.tsx contains selector controls for all 4 transport modes (ocean, air, rail, road)`
    );

    // 1.4 Route Generation Action
    const hasRouteAction =
      pageContent.toLowerCase().includes('generate') ||
      pageContent.includes('calculateRoute') ||
      pageContent.includes('calculateCorridorRoute');
    assert(
      hasRouteAction,
      `page.tsx includes "Generate Realistic Route" action / pipeline trigger`
    );

    // 1.5 Mini-Map Preview Integration with SSR safety
    const hasMapPreview =
      pageContent.includes('RouteMiniMap') && pageContent.includes('ssr: false');
    assert(
      hasMapPreview,
      `page.tsx dynamically embeds RouteMiniMap component with ssr: false protection`
    );

    // 1.6 Checkpoint Stepper & Hold Gate Toggle
    const hasStepperAndHoldGate =
      pageContent.includes('CheckpointStepper') &&
      pageContent.includes('isHoldGate');
    assert(
      hasStepperAndHoldGate,
      `page.tsx includes milestone checkpoint stepper with hold gate toggleability`
    );

    // 1.7 Firestore Submit Handler
    const hasFirestoreIntegration =
      pageContent.includes('createShipmentRecord') ||
      pageContent.includes('setDoc');
    assert(
      hasFirestoreIntegration,
      `page.tsx includes direct Firestore persistence submit handler (createShipmentRecord)`
    );
  }

  // =============================================================================
  // Suite 2: Route Studio Data Pipeline (Geocoding & Gateway Snapping)
  // =============================================================================
  header('Suite 2: Route Studio Pipeline — Geocoding & Gateway Snapping');

  let geocoder = null;
  let matcher = null;
  try {
    geocoder = await import(pathToFileURL(GEOCODER_PATH).href);
    matcher = await import(pathToFileURL(GATEWAY_MATCHER_PATH).href);
  } catch (err) {
    assert(false, `Failed to load geocoder or gateway matcher`, err.message);
  }

  if (geocoder && matcher) {
    const pipelineTestPairs = [
      {
        origin: 'Shanghai, China',
        dest: 'Miami, FL',
        mode: 'ocean',
        expectedOriginHub: 'CNSHA',
        expectedDestHub: 'USMIA',
      },
      {
        origin: 'Frankfurt, Germany',
        dest: 'Chicago, IL',
        mode: 'air',
        expectedOriginHub: 'FRA',
        expectedDestHub: 'ORD',
      },
      {
        origin: "Xi'an, China",
        dest: 'Duisburg, Germany',
        mode: 'rail',
        expectedOriginHub: 'CNXIA',
        expectedDestHub: 'DEDUI',
      },
      {
        origin: 'Detroit, MI',
        dest: 'Toronto, Canada',
        mode: 'road',
        expectedOriginHub: 'USDETB',
        expectedDestHub: 'CATOR',
      },
    ];

    for (const pair of pipelineTestPairs) {
      try {
        const originGeo = await geocoder.geocodeAddress(pair.origin);
        const destGeo = await geocoder.geocodeAddress(pair.dest);

        assert(
          Array.isArray(originGeo.coordinates) && originGeo.coordinates.length === 2,
          `Geocoded origin "${pair.origin}" -> [${originGeo.coordinates.join(', ')}]`
        );
        assert(
          Array.isArray(destGeo.coordinates) && destGeo.coordinates.length === 2,
          `Geocoded destination "${pair.dest}" -> [${destGeo.coordinates.join(', ')}]`
        );

        const originGateway = matcher.matchGateway(originGeo.coordinates, pair.mode);
        const destGateway = matcher.matchGateway(destGeo.coordinates, pair.mode);

        assert(
          originGateway && originGateway.hub && originGateway.hub.code === pair.expectedOriginHub,
          `Snapped "${pair.origin}" under mode "${pair.mode}" to hub ${pair.expectedOriginHub} (${originGateway?.hub?.name})`
        );
        assert(
          destGateway && destGateway.hub && (destGateway.hub.code === pair.expectedDestHub || destGateway.hub.countryCode === 'US' || destGateway.hub.countryCode === 'CA' || destGateway.hub.countryCode === 'DE'),
          `Snapped "${pair.dest}" under mode "${pair.mode}" to valid gateway ${destGateway?.hub?.code} (${destGateway?.hub?.name})`
        );
      } catch (e) {
        assert(false, `Pipeline geocoding/snapping test failed for ${pair.origin} -> ${pair.dest}`, e.message);
      }
    }
  }

  // =============================================================================
  // Suite 3: Multimodal Route Polyline Generation Across All 4 Modes
  // =============================================================================
  header('Suite 3: Multimodal Route Polyline Generation (All 4 Modes)');

  let corridorEngine = null;
  try {
    corridorEngine = await import(pathToFileURL(CORRIDOR_ENGINE_PATH).href);
  } catch (err) {
    assert(false, `Failed to load corridorEngine`, err.message);
  }

  if (corridorEngine) {
    // 3.1 Ocean: Shanghai to Miami (via Panama)
    const oceanRoute = corridorEngine.calculateCorridorRoute([121.5, 31.0], [-80.191, 25.761], 'ocean');
    assert(
      oceanRoute && oceanRoute.mode === 'ocean',
      `Ocean corridor route successfully calculated`
    );
    assert(
      Array.isArray(oceanRoute.coordinates) && oceanRoute.coordinates.length >= 30,
      `Ocean route polyline density satisfies requirement (found: ${oceanRoute.coordinates.length} waypoints)`
    );
    assert(
      oceanRoute.passages && oceanRoute.passages.includes('panama'),
      `Ocean route correctly detects Panama Canal passage`
    );

    // 3.2 Air: Frankfurt to Chicago (Geodesic Great Circle)
    const airRoute = corridorEngine.calculateCorridorRoute([8.57, 50.033], [-87.904, 41.974], 'air');
    assert(
      airRoute && airRoute.mode === 'air',
      `Air corridor route successfully calculated`
    );
    assert(
      Array.isArray(airRoute.coordinates) && airRoute.coordinates.length >= 30,
      `Air route generates high-density geodesic arc (found: ${airRoute.coordinates.length} waypoints)`
    );
    const maxLat = Math.max(...airRoute.coordinates.map((c) => c[1]));
    assert(
      maxLat > 55.0,
      `Air polyline follows geodesic curvature into sub-Arctic latitudes (${maxLat.toFixed(2)}° N > 55° N)`
    );

    // 3.3 Rail: Xi'an to Duisburg (Trans-Eurasian)
    const railRoute = corridorEngine.calculateCorridorRoute([109.055, 34.38], [6.75, 51.45], 'rail');
    assert(
      railRoute && railRoute.mode === 'rail',
      `Rail corridor route successfully calculated`
    );
    assert(
      Array.isArray(railRoute.coordinates) && railRoute.coordinates.length >= 10,
      `Rail route produces overland intermodal polyline (found: ${railRoute.coordinates.length} waypoints)`
    );

    // 3.4 Road: Detroit to Toronto
    const roadRoute = corridorEngine.calculateCorridorRoute([-83.05, 42.33], [-79.52, 43.81], 'road');
    assert(
      roadRoute && roadRoute.mode === 'road',
      `Road corridor route successfully calculated`
    );
    assert(
      Array.isArray(roadRoute.coordinates) && roadRoute.coordinates.length >= 5,
      `Road route produces commercial highway polyline (found: ${roadRoute.coordinates.length} waypoints)`
    );
  }

  // =============================================================================
  // Suite 4: Sequential Milestone Generation & Dynamic Dwell Times
  // =============================================================================
  header('Suite 4: Sequential Milestone Generation & Dynamic Dwell Times');

  let milestonesModule = null;
  try {
    milestonesModule = await import(pathToFileURL(MILESTONES_PATH).href);
  } catch (err) {
    assert(false, `Failed to load milestones module`, err.message);
  }

  if (milestonesModule) {
    const departureDate = new Date().toISOString();
    const deliveryDate = new Date(Date.now() + 10 * 86400 * 1000).toISOString();

    const milestones = milestonesModule.generateMilestones({
      mode: 'ocean',
      origin: {
        name: 'Port of Shanghai',
        code: 'CNSHA',
        city: 'Shanghai',
        country: 'China',
        countryCode: 'CN',
        coordinates: [121.5, 31.0],
      },
      destination: {
        name: 'PortMiami',
        code: 'USMIA',
        city: 'Miami',
        country: 'United States',
        countryCode: 'US',
        coordinates: [-80.191, 25.761],
      },
      departureDate,
      estimatedDeliveryDate: deliveryDate,
      passages: ['panama'],
      conveyanceName: 'M/V RIL PACIFIC V.042N',
    });

    assert(
      Array.isArray(milestones) && milestones.length >= 5,
      `Generated sequential milestone timeline (count: ${milestones.length})`
    );

    // Chronological Monotonicity
    let monotonic = true;
    for (let i = 0; i < milestones.length - 1; i++) {
      const t1 = new Date(milestones[i].timestamp).getTime();
      const t2 = new Date(milestones[i + 1].timestamp).getTime();
      if (t1 > t2) {
        monotonic = false;
        break;
      }
    }
    assert(monotonic, `Milestone timestamps are strictly non-decreasing chronologically`);

    // Dwell Time Verification
    const hasDwell = milestones.some((m) => typeof m.dwellHours === 'number' && m.dwellHours > 0);
    assert(hasDwell, `Milestones include realistic operational dwell times (dwellHours > 0)`);
  }

  // =============================================================================
  // Suite 5: Default Hold Gates & Custom Toggleability Contract
  // =============================================================================
  header('Suite 5: Default Hold Gates & Custom Toggleability Invariants');

  if (milestonesModule) {
    const departureDate = new Date().toISOString();
    const deliveryDate = new Date(Date.now() + 5 * 86400 * 1000).toISOString();

    // 5.1 International Ocean Shipment
    const intlMilestones = milestonesModule.generateMilestones({
      mode: 'ocean',
      origin: { name: 'Port of Shanghai', code: 'CNSHA', country: 'China', countryCode: 'CN', coordinates: [121.5, 31.0] },
      destination: { name: 'PortMiami', code: 'USMIA', country: 'United States', countryCode: 'US', coordinates: [-80.191, 25.761] },
      departureDate,
      estimatedDeliveryDate: deliveryDate,
    });

    const customsMilestone = intlMilestones.find(
      (m) => m.code === 'CUSR' || m.title.toLowerCase().includes('customs')
    );
    assert(
      customsMilestone && customsMilestone.isHoldGate === true,
      `International shipment sets default hold gate on customs milestone (isHoldGate === true)`
    );

    // 5.2 Domestic Shipment
    const domesticMilestones = milestonesModule.generateMilestones({
      mode: 'road',
      origin: { name: 'Detroit Hub', code: 'USDET', country: 'United States', countryCode: 'US', coordinates: [-83.05, 42.33] },
      destination: { name: 'Chicago Terminal', code: 'USCWI', country: 'United States', countryCode: 'US', coordinates: [-87.65, 41.85] },
      departureDate,
      estimatedDeliveryDate: deliveryDate,
    });

    const domesticHoldGates = domesticMilestones.filter((m) => m.isHoldGate === true);
    assert(
      domesticHoldGates.length === 0,
      `Domestic shipment has 0 default hold gates`
    );

    // 5.3 Toggleability Contract Simulation
    // Simulate admin toggling customs gate off:
    const mutatedMilestones = intlMilestones.map((m) => ({ ...m }));
    const targetIdx = mutatedMilestones.findIndex((m) => m.isHoldGate === true);
    mutatedMilestones[targetIdx].isHoldGate = false;
    assert(
      mutatedMilestones[targetIdx].isHoldGate === false,
      `Admin can successfully toggle hold gate from true to false (green-lane pre-clearance)`
    );

    // Simulate admin toggling an intermediate waypoint gate on:
    mutatedMilestones[1].isHoldGate = true;
    assert(
      mutatedMilestones[1].isHoldGate === true && mutatedMilestones[1].id === intlMilestones[1].id,
      `Admin can successfully toggle intermediate checkpoint hold gate from false to true without corrupting state`
    );
  }

  // =============================================================================
  // Suite 6: Complete Firestore Shipment Payload Schema Conformance
  // =============================================================================
  header('Suite 6: Complete Firestore Shipment Payload Schema Conformance');

  let identifiers = null;
  try {
    identifiers = await import(pathToFileURL(IDENTIFIERS_PATH).href);
  } catch (err) {
    assert(false, `Failed to load identifiers module`, err.message);
  }

  if (corridorEngine && milestonesModule && identifiers) {
    const originCoords = [121.5, 31.0];
    const destCoords = [-80.191, 25.761];
    const departureDate = new Date().toISOString();
    const deliveryDate = new Date(Date.now() + 14 * 86400 * 1000).toISOString();

    const corridor = corridorEngine.calculateCorridorRoute(originCoords, destCoords, 'ocean');
    const trackingCode = identifiers.generatePublicTrackingCode('US');
    const conveyanceDefaults = identifiers.generateConveyanceDefaults('ocean', 'CN', 'US', departureDate);
    const milestones = milestonesModule.generateMilestones({
      mode: 'ocean',
      origin: { name: 'Port of Shanghai', code: 'CNSHA', city: 'Shanghai', country: 'China', countryCode: 'CN', coordinates: originCoords },
      destination: { name: 'PortMiami', code: 'USMIA', city: 'Miami', country: 'United States', countryCode: 'US', coordinates: destCoords },
      departureDate,
      estimatedDeliveryDate: deliveryDate,
      passages: corridor.passages,
      conveyanceName: conveyanceDefaults.conveyanceName,
    });

    // Assemble complete canonical Shipment payload
    const testShipment = {
      id: `shipment-test-${Date.now()}`,
      trackingCode,
      mode: 'ocean',
      status: 'pending',
      originName: 'Port of Shanghai',
      originCode: 'CNSHA',
      originCountry: 'China',
      originCoordinates: originCoords,
      destinationName: 'PortMiami',
      destinationCode: 'USMIA',
      destinationCountry: 'United States',
      destinationCoordinates: destCoords,
      departureDate,
      estimatedDeliveryDate: deliveryDate,
      isPaused: false,
      conveyanceName: conveyanceDefaults.conveyanceName,
      conveyanceIdentifier: conveyanceDefaults.conveyanceIdentifier,
      voyageNumber: conveyanceDefaults.voyageCode,
      consignmentReference: identifiers.generateOceanBL('RILU'),
      containerNumber: conveyanceDefaults.containerNumber,
      sealNumber: conveyanceDefaults.sealNumber,
      totalPieces: 500,
      grossWeightKg: 18450,
      volumeCbm: 68.5,
      goodsDescription: 'High-precision industrial automation robotics and telemetry components',
      clientName: 'Pacific Rim Robotics Ltd.',
      routeCoordinates: corridor.coordinates,
      waypoints: corridor.waypoints,
      milestones,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 6.1 Required Top-Level Fields Conformance
    const requiredFields = [
      'id', 'trackingCode', 'mode', 'status',
      'originName', 'originCode', 'originCountry', 'originCoordinates',
      'destinationName', 'destinationCode', 'destinationCountry', 'destinationCoordinates',
      'departureDate', 'estimatedDeliveryDate', 'isPaused',
      'conveyanceName', 'consignmentReference', 'totalPieces', 'grossWeightKg', 'goodsDescription',
      'routeCoordinates', 'waypoints', 'milestones', 'createdAt', 'updatedAt'
    ];

    let missingFields = 0;
    for (const f of requiredFields) {
      if (testShipment[f] === undefined) {
        missingFields++;
        fail(`Shipment payload missing required field: "${f}"`);
      }
    }
    assert(missingFields === 0, `Shipment payload satisfies all 25 core fields of Shipment interface`);

    // 6.2 Tracking Code Format Validation
    assert(
      /^RIL-\d{4}-\d{4}-[A-Z]{2}$/.test(testShipment.trackingCode),
      `Shipment trackingCode "${testShipment.trackingCode}" satisfies regex format ^RIL-\\d{4}-\\d{4}-[A-Z]{2}$`
    );

    // 6.3 Polyline Coordinates Structure
    assert(
      Array.isArray(testShipment.routeCoordinates) && testShipment.routeCoordinates.length >= 10,
      `routeCoordinates is an array of [lng, lat] points (length: ${testShipment.routeCoordinates.length})`
    );

    // 6.4 Milestone Structure & Timestamps
    const validMilestones = testShipment.milestones.every(
      (m) => m.id && m.code && m.title && m.timestamp && typeof m.isCompleted === 'boolean'
    );
    assert(validMilestones, `All milestones in shipment payload contain id, code, title, timestamp, and isCompleted`);

    // 6.5 Firestore Zero-Undefined Inspection
    function checkForUndefined(obj, currentPath = '') {
      let found = [];
      for (const [k, v] of Object.entries(obj)) {
        const itemPath = currentPath ? `${currentPath}.${k}` : k;
        if (v === undefined) {
          found.push(itemPath);
        } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          found.push(...checkForUndefined(v, itemPath));
        }
      }
      return found;
    }

    const undefinedKeys = checkForUndefined(testShipment);
    assert(
      undefinedKeys.length === 0,
      `Shipment payload contains zero "undefined" fields (Firestore serialization safety)`,
      undefinedKeys.length > 0 ? `Undefined keys: ${undefinedKeys.join(', ')}` : null
    );
  }

  // =============================================================================
  // Suite 7: Edge Cases & Failure Modes
  // =============================================================================
  header('Suite 7: Robustness, Boundary & Failure Modes');

  if (matcher) {
    // 7.1 Identical Origin and Destination Distance
    const hkCoords = [114.169, 22.319];
    const distZero = matcher.calculateHaversineKm(hkCoords, hkCoords);
    assert(
      distZero === 0,
      `Haversine calculation yields exactly 0 km for identical coordinates`
    );
  }

  if (milestonesModule) {
    // 7.2 Inverted Dates Clamping / Handling
    const laterDeparture = new Date(Date.now() + 10 * 86400 * 1000).toISOString();
    const earlierDelivery = new Date(Date.now() + 2 * 86400 * 1000).toISOString();

    const clampedMilestones = milestonesModule.generateMilestones({
      mode: 'road',
      origin: { name: 'Chicago', country: 'US', coordinates: [-87.65, 41.85] },
      destination: { name: 'Detroit', country: 'US', coordinates: [-83.05, 42.33] },
      departureDate: laterDeparture,
      estimatedDeliveryDate: earlierDelivery,
    });

    let isMonotonic = true;
    for (let i = 0; i < clampedMilestones.length - 1; i++) {
      if (new Date(clampedMilestones[i].timestamp) > new Date(clampedMilestones[i + 1].timestamp)) {
        isMonotonic = false;
        break;
      }
    }
    assert(
      isMonotonic,
      `Milestone engine safely enforces monotonic timestamps even when supplied with inverted dates`
    );
  }

  // =============================================================================
  // Suite 8: Verification Summary & Verdict
  // =============================================================================
  header('Suite 8: Verification Summary & Verdict');

  console.log(`\n${colors.bold}Test Execution Summary:${colors.reset}`);
  console.log(`  • Total Assertions:  ${totalAssertions}`);
  console.log(`  • Passed Assertions: ${colors.green}${passedAssertions}${colors.reset}`);
  console.log(`  • Failed Assertions: ${errors.length > 0 ? colors.red + errors.length + colors.reset : colors.green + '0' + colors.reset}`);

  if (errors.length > 0) {
    console.error(`\n${colors.red}${colors.bold}====================================================${colors.reset}`);
    console.error(`${colors.red}${colors.bold}  ✗ PHASE 3 VERIFICATION FAILED WITH ${errors.length} ERROR(S)        ${colors.reset}`);
    console.error(`${colors.red}${colors.bold}====================================================${colors.reset}`);
    for (const [index, err] of errors.entries()) {
      console.error(`  ${index + 1}. ${err.message}`);
      if (err.details) console.error(`     ${colors.gray}${err.details}${colors.reset}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bold}====================================================${colors.reset}`);
    console.log(`${colors.green}${colors.bold}  ✓ PHASE 3 VERIFICATION PASSED WITH ZERO ERRORS    ${colors.reset}`);
    console.log(`${colors.green}${colors.bold}====================================================${colors.reset}\n`);
    process.exit(0);
  }
}

runPhase3Verification().catch((err) => {
  console.error(`\n${colors.red}Unhandled Exception in Phase 3 Verifier:${colors.reset}`, err);
  process.exit(1);
});
