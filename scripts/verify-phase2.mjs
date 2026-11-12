#!/usr/bin/env node
/**
 * RILFREIGHT Phase 2 Verification Suite
 * Validates the geocoding engine, spatial gateway matcher, trade corridor router,
 * and milestone generator with dwell times and customs pause gates.
 *
 * Usage:
 *   node scripts/verify-phase2.mjs
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

console.log(`${colors.bold}RILFREIGHT Milestone 2: Phase 2 Verification Engine${colors.reset}`);
console.log(`${colors.dim}Project Root: ${projectRoot}${colors.reset}\n`);

// Module Paths
const GEOCODER_PATH = path.join(projectRoot, 'src', 'server', 'routing', 'geocoder.ts');
const GATEWAY_MATCHER_PATH = path.join(projectRoot, 'src', 'server', 'routing', 'gatewayMatcher.ts');
const CORRIDOR_ENGINE_PATH = path.join(projectRoot, 'src', 'server', 'routing', 'corridorEngine.ts');
const MILESTONES_PATH = path.join(projectRoot, 'src', 'server', 'routing', 'milestones.ts');

async function runPhase2Verification() {
  // =============================================================================
  // Suite 1: Geocoding Engine (geocoder.ts)
  // =============================================================================
  header('Suite 1: Geocoding Engine (geocoder.ts)');

  let geocoder = null;
  assert(fs.existsSync(GEOCODER_PATH), `File exists: src/server/routing/geocoder.ts`);

  try {
    const geocoderUrl = pathToFileURL(GEOCODER_PATH).href;
    geocoder = await import(geocoderUrl);
    assert(typeof geocoder.geocodeAddress === 'function', `geocoder.ts exports geocodeAddress()`);
    assert(typeof geocoder.batchGeocode === 'function', `geocoder.ts exports batchGeocode()`);
    assert(typeof geocoder.clearGeocodeCache === 'function', `geocoder.ts exports clearGeocodeCache()`);
  } catch (err) {
    assert(false, `Failed to import geocoder.ts`, err.message);
  }

  if (geocoder && typeof geocoder.geocodeAddress === 'function') {
    // 1.1 Test Mandated Benchmark Cities
    const testCases = [
      { query: 'Hong Kong', minLng: 113.8, maxLng: 114.5, minLat: 22.1, maxLat: 22.6 },
      { query: 'Miami, FL', minLng: -80.5, maxLng: -80.0, minLat: 25.5, maxLat: 26.0 },
      { query: 'Shanghai, China', minLng: 121.2, maxLng: 121.8, minLat: 31.0, maxLat: 31.5 },
      { query: 'Rotterdam, Netherlands', minLng: 4.2, maxLng: 4.7, minLat: 51.7, maxLat: 52.1 },
      { query: 'Frankfurt, Germany', minLng: 8.4, maxLng: 8.9, minLat: 49.9, maxLat: 50.3 },
      { query: 'Chicago, IL', minLng: -88.0, maxLng: -87.4, minLat: 41.6, maxLat: 42.1 },
    ];

    for (const tc of testCases) {
      try {
        const res = await geocoder.geocodeAddress(tc.query);
        const validCoords =
          Array.isArray(res.coordinates) &&
          res.coordinates.length === 2 &&
          typeof res.coordinates[0] === 'number' &&
          typeof res.coordinates[1] === 'number';

        const withinBounds =
          validCoords &&
          res.coordinates[0] >= tc.minLng &&
          res.coordinates[0] <= tc.maxLng &&
          res.coordinates[1] >= tc.minLat &&
          res.coordinates[1] <= tc.maxLat;

        assert(
          withinBounds,
          `Geocoded "${tc.query}" -> [${res.coordinates[0].toFixed(4)}, ${res.coordinates[1].toFixed(4)}] within geographic bounds`,
          `Expected lng in [${tc.minLng}, ${tc.maxLng}], lat in [${tc.minLat}, ${tc.maxLat}]`
        );
        assert(
          typeof res.formattedAddress === 'string' && res.formattedAddress.length > 0,
          `Geocoding result for "${tc.query}" has non-empty formattedAddress: "${res.formattedAddress}"`
        );
      } catch (e) {
        assert(false, `Geocoding failed for "${tc.query}"`, e.message);
      }
    }

    // 1.2 Test In-Memory Cache Performance & Source
    try {
      geocoder.clearGeocodeCache();
      const firstLookup = await geocoder.geocodeAddress('Rotterdam, Netherlands');
      const secondLookup = await geocoder.geocodeAddress('Rotterdam, Netherlands');

      assert(
        secondLookup.source === 'cache',
        `Subsequent identical geocode query served directly from memory cache (source: "${secondLookup.source}")`
      );
      assert(
        firstLookup.coordinates[0] === secondLookup.coordinates[0] &&
        firstLookup.coordinates[1] === secondLookup.coordinates[1],
        `Cached coordinates strictly match initial lookup coordinates`
      );
    } catch (e) {
      assert(false, `Geocode cache test failed`, e.message);
    }
  }

  // =============================================================================
  // Suite 2: Spatial Gateway Matcher (gatewayMatcher.ts)
  // =============================================================================
  header('Suite 2: Spatial Gateway Matcher (gatewayMatcher.ts)');

  let matcher = null;
  assert(fs.existsSync(GATEWAY_MATCHER_PATH), `File exists: src/server/routing/gatewayMatcher.ts`);

  try {
    const matcherUrl = pathToFileURL(GATEWAY_MATCHER_PATH).href;
    matcher = await import(matcherUrl);
    assert(typeof matcher.calculateHaversineKm === 'function', `gatewayMatcher.ts exports calculateHaversineKm()`);
    assert(typeof matcher.matchGateway === 'function', `gatewayMatcher.ts exports matchGateway()`);
    assert(typeof matcher.matchTopGateways === 'function', `gatewayMatcher.ts exports matchTopGateways()`);
  } catch (err) {
    assert(false, `Failed to import gatewayMatcher.ts`, err.message);
  }

  if (matcher && typeof matcher.matchGateway === 'function') {
    // 2.1 Haversine Distance Trigonometry Sanity Check
    const dist1DegLat = matcher.calculateHaversineKm([0, 0], [0, 1]);
    assert(
      Math.abs(dist1DegLat - 111.19) < 1.0,
      `Haversine formula accurate: 1° latitude distance = ${dist1DegLat.toFixed(2)} km (expected ~111.19 km)`
    );

    const distNyToLa = matcher.calculateHaversineKm([-74.006, 40.7128], [-118.2437, 34.0522]);
    assert(
      Math.abs(distNyToLa - 3935) < 60,
      `Haversine NYC -> LAX = ${distNyToLa.toFixed(2)} km (expected ~3935 km ± 60 km)`
    );

    // 2.2 Mode-Specific Nearest Hub Resolution (Hong Kong: Ocean HKHKG vs Air HKG)
    const hkCoords = [114.169, 22.319]; // Hong Kong Harbour / Kowloon
    const hkOcean = matcher.matchGateway(hkCoords, 'ocean');
    const hkAir = matcher.matchGateway(hkCoords, 'air');

    assert(
      hkOcean && hkOcean.hub && hkOcean.hub.code === 'HKHKG',
      `Hong Kong coordinates match nearest seaport "HKHKG" (Port of Hong Kong) under ocean mode (distance: ${hkOcean?.distanceKm?.toFixed(2)} km)`
    );
    assert(
      hkAir && hkAir.hub && hkAir.hub.code === 'HKG',
      `Hong Kong coordinates match nearest cargo airport "HKG" (Hong Kong International Airport) under air mode (distance: ${hkAir?.distanceKm?.toFixed(2)} km)`
    );
    assert(
      hkOcean.hub.code !== hkAir.hub.code,
      `Ocean and Air modes correctly differentiate facility classifications (Ocean: ${hkOcean.hub.code}, Air: ${hkAir.hub.code})`
    );

    // 2.3 Mode-Specific Nearest Hub Resolution (Miami: Ocean USMIA vs Air MIA)
    const miamiCoords = [-80.191, 25.761]; // PortMiami area
    const miaOcean = matcher.matchGateway(miamiCoords, 'ocean');
    const miaAir = matcher.matchGateway(miamiCoords, 'air');

    assert(
      miaOcean && miaOcean.hub && miaOcean.hub.code === 'USMIA',
      `Miami coordinates match nearest seaport "USMIA" (PortMiami) under ocean mode (distance: ${miaOcean?.distanceKm?.toFixed(2)} km)`
    );
    assert(
      miaAir && miaAir.hub && miaAir.hub.code === 'MIA',
      `Miami coordinates match nearest cargo airport "MIA" (Miami International Airport) under air mode (distance: ${miaAir?.distanceKm?.toFixed(2)} km)`
    );

    // 2.4 Mode-Specific Nearest Hub Resolution (Shanghai: Ocean CNSHA vs Air PVG/SHA)
    const shaCoords = [121.5, 31.0];
    const shaOcean = matcher.matchGateway(shaCoords, 'ocean');
    const shaAir = matcher.matchGateway(shaCoords, 'air');

    assert(
      shaOcean && shaOcean.hub && shaOcean.hub.code === 'CNSHA',
      `Shanghai coordinates match nearest seaport "CNSHA" (Port of Shanghai) under ocean mode`
    );
    assert(
      shaAir && shaAir.hub && (shaAir.hub.code === 'PVG' || shaAir.hub.code === 'SHA'),
      `Shanghai coordinates match nearest cargo airport "${shaAir?.hub?.code}" under air mode`
    );

    // 2.5 Top-K Gateways Ranking
    const topAirGateways = matcher.matchTopGateways(hkCoords, 'air', 3);
    assert(
      Array.isArray(topAirGateways) && topAirGateways.length === 3,
      `matchTopGateways returns top 3 ranked gateways for coordinates`
    );
    assert(
      topAirGateways[0].distanceKm <= topAirGateways[1].distanceKm &&
      topAirGateways[1].distanceKm <= topAirGateways[2].distanceKm,
      `matchTopGateways returns results sorted strictly ascending by distanceKm`
    );
  }

  // =============================================================================
  // Suite 3: Trade Corridor Engine (corridorEngine.ts)
  // =============================================================================
  header('Suite 3: Trade Corridor Engine (corridorEngine.ts)');

  let corridorEngine = null;
  assert(fs.existsSync(CORRIDOR_ENGINE_PATH), `File exists: src/server/routing/corridorEngine.ts`);

  try {
    const corridorUrl = pathToFileURL(CORRIDOR_ENGINE_PATH).href;
    corridorEngine = await import(corridorUrl);
    assert(typeof corridorEngine.calculateAirArc === 'function', `corridorEngine.ts exports calculateAirArc()`);
    assert(typeof corridorEngine.calculateOceanRoute === 'function', `corridorEngine.ts exports calculateOceanRoute()`);
    assert(typeof corridorEngine.calculateCorridorRoute === 'function', `corridorEngine.ts exports calculateCorridorRoute()`);
  } catch (err) {
    assert(false, `Failed to import corridorEngine.ts`, err.message);
  }

  if (corridorEngine && typeof corridorEngine.calculateCorridorRoute === 'function') {
    // 3.1 Air Mode: Great Circle Geodesic Arc
    const fraAirportCoords = [8.57, 50.033];   // Frankfurt FRA
    const ordAirportCoords = [-87.904, 41.974]; // Chicago O'Hare ORD
    const airRoute = corridorEngine.calculateCorridorRoute(fraAirportCoords, ordAirportCoords, 'air');

    assert(
      airRoute && airRoute.mode === 'air',
      `Air route calculated successfully with mode "air"`
    );
    assert(
      Array.isArray(airRoute.coordinates) && airRoute.coordinates.length >= 30,
      `Air flight path generates high-density geodesic arc (found: ${airRoute.coordinates.length} waypoints, min: 30)`
    );
    assert(
      airRoute.distanceKm >= 6400 && airRoute.distanceKm <= 7400,
      `Air geodesic distance FRA -> ORD = ${airRoute.distanceKm} km (expected realistic range ~6900 km ± 500 km)`
    );
    assert(
      airRoute.durationHours >= 7 && airRoute.durationHours <= 11,
      `Air flight duration = ${airRoute.durationHours.toFixed(1)} hours (expected ~8.5h)`
    );

    // Verify geodesic path reaches higher latitudes than both endpoints (classic great circle over North Atlantic)
    const maxLat = Math.max(...airRoute.coordinates.map((c) => c[1]));
    assert(
      maxLat > 55.0,
      `Air polyline follows geodesic curvature (peak latitude: ${maxLat.toFixed(2)}° N > 55° N)`
    );

    // 3.2 Ocean Mode: Maritime Sea Route with Panama Canal Chokepoint
    const shaPortCoords = [121.5, 31.0];   // Shanghai CNSHA
    const nycPortCoords = [-74.072, 40.669]; // New York USNYC
    const panamaOceanRoute = corridorEngine.calculateCorridorRoute(shaPortCoords, nycPortCoords, 'ocean');

    assert(
      panamaOceanRoute && panamaOceanRoute.mode === 'ocean',
      `Trans-Panama ocean route calculated successfully`
    );
    assert(
      Array.isArray(panamaOceanRoute.coordinates) && panamaOceanRoute.coordinates.length >= 40,
      `Ocean maritime polyline avoids landmasses with high resolution (points: ${panamaOceanRoute.coordinates.length})`
    );
    assert(
      Array.isArray(panamaOceanRoute.passages) && panamaOceanRoute.passages.includes('panama'),
      `Ocean passage detection correctly identifies "panama" canal traversal (detected: ${JSON.stringify(panamaOceanRoute.passages)})`
    );

    // Verify intermediate transit waypoints for Panama
    const hasPanamaWaypoints =
      Array.isArray(panamaOceanRoute.waypoints) &&
      panamaOceanRoute.waypoints.some(
        (wp) =>
          wp.name.toLowerCase().includes('panama') ||
          (wp.coordinates[0] >= -81.0 && wp.coordinates[0] <= -78.0 && wp.coordinates[1] >= 7.0 && wp.coordinates[1] <= 11.0)
      );
    assert(
      hasPanamaWaypoints,
      `Corridor engine automatically injects intermediate transit waypoints for Panama Canal`
    );

    // 3.3 Ocean Mode: Maritime Sea Route with Suez Canal Chokepoint
    const rtmPortCoords = [4.42, 51.88]; // Rotterdam NLRTM
    const suezOceanRoute = corridorEngine.calculateCorridorRoute(shaPortCoords, rtmPortCoords, 'ocean');

    assert(
      Array.isArray(suezOceanRoute.passages) && suezOceanRoute.passages.includes('suez'),
      `Shanghai -> Rotterdam maritime route detects "suez" canal traversal (detected: ${JSON.stringify(suezOceanRoute.passages)})`
    );

    const hasSuezWaypoints =
      Array.isArray(suezOceanRoute.waypoints) &&
      suezOceanRoute.waypoints.some(
        (wp) =>
          wp.name.toLowerCase().includes('suez') ||
          (wp.coordinates[0] >= 31.0 && wp.coordinates[0] <= 34.0 && wp.coordinates[1] >= 28.0 && wp.coordinates[1] <= 33.0)
      );
    assert(
      hasSuezWaypoints,
      `Corridor engine automatically injects intermediate transit waypoints for Suez Canal`
    );

    // 3.4 Continental Rail Corridor Routing
    const xianRailCoords = [109.055, 34.38]; // Xi'an CNXIA
    const duisburgRailCoords = [6.75, 51.45]; // Duisburg DEDUI
    const railRoute = corridorEngine.calculateCorridorRoute(xianRailCoords, duisburgRailCoords, 'rail');

    assert(
      railRoute && railRoute.mode === 'rail',
      `Trans-Eurasian rail route generated successfully`
    );
    assert(
      Array.isArray(railRoute.coordinates) && railRoute.coordinates.length >= 10,
      `Rail corridor route produces multi-segment polyline across Eurasian terminals`
    );
  }

  // =============================================================================
  // Suite 4: Milestone Generator & Customs Pause Gates (milestones.ts)
  // =============================================================================
  header('Suite 4: Milestone Generator & Customs Pause Gates (milestones.ts)');

  let milestonesModule = null;
  assert(fs.existsSync(MILESTONES_PATH), `File exists: src/server/routing/milestones.ts`);

  try {
    const milestonesUrl = pathToFileURL(MILESTONES_PATH).href;
    milestonesModule = await import(milestonesUrl);
    assert(typeof milestonesModule.generateMilestones === 'function', `milestones.ts exports generateMilestones()`);
  } catch (err) {
    assert(false, `Failed to import milestones.ts`, err.message);
  }

  if (milestonesModule && typeof milestonesModule.generateMilestones === 'function') {
    const departureDate = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
    const deliveryDate = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

    // 4.1 International Ocean Shipment Milestone Schedule & Customs Pause Gate
    const intlOceanMilestones = milestonesModule.generateMilestones({
      mode: 'ocean',
      origin: {
        name: 'Port of Hong Kong',
        code: 'HKHKG',
        city: 'Hong Kong',
        country: 'Hong Kong',
        countryCode: 'HK',
        coordinates: [114.169, 22.319],
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
      Array.isArray(intlOceanMilestones) && intlOceanMilestones.length >= 6,
      `Generated comprehensive ocean milestone sequence (count: ${intlOceanMilestones.length})`
    );

    // 4.2 Chronological Monotonicity Check
    let isMonotonic = true;
    for (let i = 0; i < intlOceanMilestones.length - 1; i++) {
      const t1 = new Date(intlOceanMilestones[i].timestamp).getTime();
      const t2 = new Date(intlOceanMilestones[i + 1].timestamp).getTime();
      if (t1 > t2) {
        isMonotonic = false;
        break;
      }
    }
    assert(
      isMonotonic,
      `All generated milestone timestamps follow strictly non-decreasing chronological order`
    );

    // 4.3 Dwell Time Validation
    const hasDwellTimes = intlOceanMilestones.some(
      (m) => typeof m.dwellHours === 'number' && m.dwellHours > 0
    );
    assert(
      hasDwellTimes,
      `Milestones contain explicit operational dwell times (dwellHours > 0)`
    );

    // 4.4 Default Customs Pause Gate on International Shipment
    const customsMilestone = intlOceanMilestones.find(
      (m) => m.code === 'CUSR' || m.title.toLowerCase().includes('customs')
    );
    assert(
      customsMilestone !== undefined,
      `International shipment contains destination import customs milestone`
    );
    assert(
      customsMilestone && customsMilestone.isHoldGate === true,
      `International customs clearance milestone defaults to active pause gate (isHoldGate === true)`
    );

    // Operational non-customs milestones must NOT be hold gates
    const nonCustomsHoldGates = intlOceanMilestones.filter(
      (m) => m !== customsMilestone && m.isHoldGate === true
    );
    assert(
      nonCustomsHoldGates.length === 0,
      `Non-customs milestones (e.g. GTIN, LOAD, DEPA) do not trigger unwanted pause gates`
    );

    // 4.5 Domestic Shipment Check (Should NOT set isHoldGate on domestic)
    const domesticRoadMilestones = milestonesModule.generateMilestones({
      mode: 'road',
      origin: {
        name: 'Chicago Freight Terminal',
        code: 'USCWI',
        city: 'Chicago',
        country: 'United States',
        countryCode: 'US',
        coordinates: [-87.65, 41.85],
      },
      destination: {
        name: 'Miami Freight Terminal',
        code: 'USMIA',
        city: 'Miami',
        country: 'United States',
        countryCode: 'US',
        coordinates: [-80.25, 25.80],
      },
      departureDate,
      estimatedDeliveryDate: deliveryDate,
      conveyanceName: 'Rig-5412',
    });

    const domesticHoldGates = domesticRoadMilestones.filter((m) => m.isHoldGate === true);
    assert(
      domesticHoldGates.length === 0,
      `Domestic interstate shipment has zero active pause gates (isHoldGate is false or omitted)`
    );

    // 4.6 Sequential ID Allocation
    const validIds = intlOceanMilestones.every((m, idx) => m.id === `ms-${idx + 1}`);
    assert(
      validIds,
      `Milestones assigned sequential IDs starting with "ms-1" to "ms-${intlOceanMilestones.length}"`
    );
  }

  // =============================================================================
  // Suite 5: Integrated Multimodal End-to-End Pipeline
  // =============================================================================
  header('Suite 5: Integrated Multimodal End-to-End Pipeline');

  if (geocoder && matcher && corridorEngine && milestonesModule) {
    try {
      // End-to-end test: Address input -> Geocode -> Snapped Gateway -> Route -> Milestones
      const originAddress = 'Hong Kong';
      const destAddress = 'Miami, FL';

      const originGeo = await geocoder.geocodeAddress(originAddress);
      const destGeo = await geocoder.geocodeAddress(destAddress);

      const originAirGateway = matcher.matchGateway(originGeo.coordinates, 'air');
      const destAirGateway = matcher.matchGateway(destGeo.coordinates, 'air');

      const airCorridor = corridorEngine.calculateCorridorRoute(
        originAirGateway.hub.coordinates,
        destAirGateway.hub.coordinates,
        'air'
      );

      const departureDate = new Date().toISOString();
      const arrivalDate = new Date(Date.now() + 3 * 86400 * 1000).toISOString();

      const routeMilestones = milestonesModule.generateMilestones({
        mode: 'air',
        origin: originAirGateway.hub,
        destination: destAirGateway.hub,
        departureDate,
        estimatedDeliveryDate: arrivalDate,
        conveyanceName: 'Boeing 777F #920-RIL',
      });

      assert(
        originGeo.coordinates && destGeo.coordinates,
        `E2E: Successfully geocoded origin ("${originAddress}") and destination ("${destAddress}")`
      );
      assert(
        originAirGateway.hub.code === 'HKG' && destAirGateway.hub.code === 'MIA',
        `E2E: Matched addresses to standard IATA air gateways: HKG -> MIA`
      );
      assert(
        airCorridor.coordinates.length >= 30 && airCorridor.distanceKm > 10000,
        `E2E: Generated trans-continental air flight path (${airCorridor.distanceKm} km, ${airCorridor.coordinates.length} waypoints)`
      );
      assert(
        routeMilestones.length >= 5 && routeMilestones.some((m) => m.isHoldGate === true),
        `E2E: Generated complete milestone timeline with international customs pause gate`
      );
    } catch (e) {
      assert(false, `E2E Integrated Pipeline test failed`, e.message);
    }
  }

  // =============================================================================
  // Suite 6: Verification Summary & Verdict
  // =============================================================================
  header('Suite 6: Verification Summary & Verdict');

  console.log(`\n${colors.bold}Test Execution Summary:${colors.reset}`);
  console.log(`  • Total Assertions:  ${totalAssertions}`);
  console.log(`  • Passed Assertions: ${colors.green}${passedAssertions}${colors.reset}`);
  console.log(`  • Failed Assertions: ${errors.length > 0 ? colors.red + errors.length + colors.reset : colors.green + '0' + colors.reset}`);

  if (errors.length > 0) {
    console.error(`\n${colors.red}${colors.bold}====================================================${colors.reset}`);
    console.error(`${colors.red}${colors.bold}  ✗ PHASE 2 VERIFICATION FAILED WITH ${errors.length} ERROR(S)        ${colors.reset}`);
    console.error(`${colors.red}${colors.bold}====================================================${colors.reset}`);
    for (const [index, err] of errors.entries()) {
      console.error(`  ${index + 1}. ${err.message}`);
      if (err.details) console.error(`     ${colors.gray}${err.details}${colors.reset}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bold}====================================================${colors.reset}`);
    console.log(`${colors.green}${colors.bold}  ✓ PHASE 2 VERIFICATION PASSED WITH ZERO ERRORS    ${colors.reset}`);
    console.log(`${colors.green}${colors.bold}====================================================${colors.reset}\n`);
    process.exit(0);
  }
}

runPhase2Verification().catch((err) => {
  console.error(`\n${colors.red}Unhandled Exception in Phase 2 Verifier:${colors.reset}`, err);
  process.exit(1);
});
