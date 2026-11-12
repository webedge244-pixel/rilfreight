#!/usr/bin/env node
/**
 * RILFREIGHT Phase 1 Verification Suite
 * Validates the structure, integrity, coordinate ranges, and minimum thresholds
 * of global_hubs.json and trade_corridors.json.
 *
 * Usage:
 *   node scripts/verify-phase1.mjs
 *
 * Exit Codes:
 *   0 = All validation suites passed
 *   1 = One or more assertions failed
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function warn(msg) {
  console.log(`  ${colors.yellow}⚠ WARN${colors.reset} ${msg}`);
}

function header(title) {
  console.log(`\n${colors.bold}${colors.cyan}=== ${title} ===${colors.reset}`);
}

// Global test failure collector
const errors = [];
const warnings = [];

function assert(condition, message, details = null) {
  if (condition) {
    pass(message);
    return true;
  } else {
    fail(message, details);
    errors.push({ message, details });
    return false;
  }
}

// Minimum Acceptance Thresholds
const THRESHOLDS = {
  minAirports: 50,
  minSeaports: 50,
  minInlandHubs: 20,
  minTotalHubs: 120,
  minCountries: 20,
  minOceanCorridors: 5,
  minAirCorridors: 5,
  minRailCorridors: 3,
  minRoadCorridors: 3,
  minTotalCorridors: 16,
};

// Target File Paths
const HUBS_FILE = path.join(projectRoot, 'src', 'server', 'data', 'global_hubs.json');
const CORRIDORS_FILE = path.join(projectRoot, 'src', 'server', 'data', 'trade_corridors.json');

console.log(`${colors.bold}RILFREIGHT Milestone 1: Phase 1 Verification Engine${colors.reset}`);
console.log(`${colors.dim}Project Root: ${projectRoot}${colors.reset}\n`);

// =============================================================================
// Suite 1: File Existence & JSON Integrity
// =============================================================================
header('Suite 1: File Existence & JSON Parsing');

let hubsRawData = null;
let corridorsRawData = null;

// 1.1 Check global_hubs.json
if (fs.existsSync(HUBS_FILE)) {
  pass(`File exists: src/server/data/global_hubs.json`);
  try {
    const content = fs.readFileSync(HUBS_FILE, 'utf8');
    assert(content.trim().length > 50, 'global_hubs.json is non-empty', `File size: ${content.length} bytes`);
    hubsRawData = JSON.parse(content);
    pass('global_hubs.json successfully parsed as valid JSON');
  } catch (err) {
    fail('global_hubs.json failed to parse as JSON', err.message);
    errors.push({ message: 'global_hubs.json JSON parse error', details: err.message });
  }
} else {
  fail('File missing: src/server/data/global_hubs.json', 'File must be created by scripts/seed-logistics-nodes.mjs');
  errors.push({ message: 'Missing global_hubs.json', details: HUBS_FILE });
}

// 1.2 Check trade_corridors.json
if (fs.existsSync(CORRIDORS_FILE)) {
  pass(`File exists: src/server/data/trade_corridors.json`);
  try {
    const content = fs.readFileSync(CORRIDORS_FILE, 'utf8');
    assert(content.trim().length > 50, 'trade_corridors.json is non-empty', `File size: ${content.length} bytes`);
    corridorsRawData = JSON.parse(content);
    pass('trade_corridors.json successfully parsed as valid JSON');
  } catch (err) {
    fail('trade_corridors.json failed to parse as JSON', err.message);
    errors.push({ message: 'trade_corridors.json JSON parse error', details: err.message });
  }
} else {
  fail('File missing: src/server/data/trade_corridors.json', 'File must be created by scripts/seed-logistics-nodes.mjs');
  errors.push({ message: 'Missing trade_corridors.json', details: CORRIDORS_FILE });
}

// Early exit if files do not exist or cannot be parsed
if (errors.length > 0 && (!hubsRawData || !corridorsRawData)) {
  console.error(`\n${colors.red}${colors.bold}Aborting further validation due to missing or invalid JSON files.${colors.reset}`);
  process.exit(1);
}

// =============================================================================
// Suite 2: Global Hubs Schema Validation
// =============================================================================
header('Suite 2: Global Hubs Schema & Coordinate Bounds');

// Normalize hubs collection (handle flat array or dictionary container)
let hubsList = [];
if (Array.isArray(hubsRawData)) {
  hubsList = hubsRawData;
} else if (typeof hubsRawData === 'object' && hubsRawData !== null) {
  if (Array.isArray(hubsRawData.hubs)) {
    hubsList = hubsRawData.hubs;
  } else {
    // Check if partitioned by category
    const categories = ['airports', 'seaports', 'inland_hubs', 'rail_terminals', 'road_hubs'];
    for (const cat of categories) {
      if (Array.isArray(hubsRawData[cat])) {
        hubsList.push(...hubsRawData[cat]);
      }
    }
  }
}

assert(hubsList.length > 0, `Normalized hubs collection contains records (found: ${hubsList.length})`);

const validTypes = new Set(['seaport', 'airport', 'rail_terminal', 'road_hub', 'inland_hub']);
const seenIds = new Set();
const seenCodes = new Map(); // key: `${type}:${code}` -> index
let invalidHubCount = 0;
const countryCodes = new Set();
const hubsByType = {
  airport: 0,
  seaport: 0,
  inland_hub: 0,
  rail_terminal: 0,
  road_hub: 0,
  other: 0,
};

hubsList.forEach((hub, idx) => {
  let isItemValid = true;
  const identifier = hub.id || hub.code || `Index #${idx}`;

  // Required: id
  if (!hub.id || typeof hub.id !== 'string' || hub.id.trim() === '') {
    fail(`Hub [${identifier}] missing or invalid 'id'`, 'Must be non-empty string');
    isItemValid = false;
  } else {
    if (seenIds.has(hub.id)) {
      fail(`Hub [${identifier}] duplicate 'id': ${hub.id}`);
      isItemValid = false;
    }
    seenIds.add(hub.id);
  }

  // Required: code
  if (!hub.code || typeof hub.code !== 'string' || hub.code.trim().length < 2) {
    fail(`Hub [${identifier}] missing or invalid 'code'`, 'Must be string with >= 2 characters');
    isItemValid = false;
  }

  // Required: name
  if (!hub.name || typeof hub.name !== 'string' || hub.name.trim().length < 2) {
    fail(`Hub [${identifier}] missing or invalid 'name'`, 'Must be non-empty string');
    isItemValid = false;
  }

  // Required: type
  if (!hub.type || !validTypes.has(hub.type)) {
    fail(`Hub [${identifier}] invalid 'type': ${hub.type}`, `Allowed: ${Array.from(validTypes).join(', ')}`);
    isItemValid = false;
  } else {
    if (hub.type === 'airport') hubsByType.airport++;
    else if (hub.type === 'seaport') hubsByType.seaport++;
    else if (hub.type === 'inland_hub') hubsByType.inland_hub++;
    else if (hub.type === 'rail_terminal') hubsByType.rail_terminal++;
    else if (hub.type === 'road_hub') hubsByType.road_hub++;
    else hubsByType.other++;
  }

  // Duplicate code check per facility type
  if (hub.type && hub.code) {
    const key = `${hub.type}:${hub.code.toUpperCase()}`;
    if (seenCodes.has(key)) {
      warn(`Hub [${identifier}] code '${hub.code}' duplicated in type '${hub.type}'`);
    } else {
      seenCodes.set(key, idx);
    }
  }

  // Required: coordinates [lng, lat]
  if (!Array.isArray(hub.coordinates) || hub.coordinates.length !== 2) {
    fail(`Hub [${identifier}] invalid coordinates structure`, 'Must be [longitude, latitude]');
    isItemValid = false;
  } else {
    const [lng, lat] = hub.coordinates;
    const isLngValid = typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
    const isLatValid = typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90;

    if (!isLngValid) {
      fail(`Hub [${identifier}] longitude out of range [-180, 180]: ${lng}`);
      isItemValid = false;
    }
    if (!isLatValid) {
      fail(`Hub [${identifier}] latitude out of range [-90, 90]: ${lat}`);
      isItemValid = false;
    }
  }

  // Required: countryCode (ISO 3166-1 alpha-2)
  if (!hub.countryCode || typeof hub.countryCode !== 'string' || !/^[A-Za-z]{2}$/.test(hub.countryCode)) {
    fail(`Hub [${identifier}] invalid 'countryCode'`, 'Must be 2-letter ISO alpha-2 string');
    isItemValid = false;
  } else {
    countryCodes.add(hub.countryCode.toUpperCase());
  }

  if (!isItemValid) {
    invalidHubCount++;
    if (invalidHubCount <= 5) {
      errors.push({ message: `Invalid hub item`, details: JSON.stringify(hub) });
    }
  }
});

assert(invalidHubCount === 0, `All ${hubsList.length} hub entries satisfy schema requirements`, `Violations found: ${invalidHubCount}`);

// =============================================================================
// Suite 3: Global Hubs Thresholds & Geographic Diversity
// =============================================================================
header('Suite 3: Global Hubs Quantitative Thresholds');

const aggregateInlandHubs = hubsByType.inland_hub + hubsByType.rail_terminal + hubsByType.road_hub;

assert(
  hubsByType.airport >= THRESHOLDS.minAirports,
  `Airport count meets threshold (found: ${hubsByType.airport}, min: ${THRESHOLDS.minAirports})`
);

assert(
  hubsByType.seaport >= THRESHOLDS.minSeaports,
  `Seaport count meets threshold (found: ${hubsByType.seaport}, min: ${THRESHOLDS.minSeaports})`
);

assert(
  aggregateInlandHubs >= THRESHOLDS.minInlandHubs,
  `Inland/Intermodal hub count meets threshold (found: ${aggregateInlandHubs}, min: ${THRESHOLDS.minInlandHubs})`,
  `Breakdown -> inland_hub: ${hubsByType.inland_hub}, rail_terminal: ${hubsByType.rail_terminal}, road_hub: ${hubsByType.road_hub}`
);

assert(
  hubsList.length >= THRESHOLDS.minTotalHubs,
  `Total global hubs count meets threshold (found: ${hubsList.length}, min: ${THRESHOLDS.minTotalHubs})`
);

assert(
  countryCodes.size >= THRESHOLDS.minCountries,
  `Geographic diversity across countries meets threshold (found: ${countryCodes.size} countries, min: ${THRESHOLDS.minCountries})`
);

// Hemisphere coverage check
const hasEast = hubsList.some(h => Array.isArray(h.coordinates) && h.coordinates[0] > 0);
const hasWest = hubsList.some(h => Array.isArray(h.coordinates) && h.coordinates[0] < 0);
const hasNorth = hubsList.some(h => Array.isArray(h.coordinates) && h.coordinates[1] > 0);
const hasSouth = hubsList.some(h => Array.isArray(h.coordinates) && h.coordinates[1] < 0);

assert(hasEast && hasWest && hasNorth && hasSouth, 'Global coordinate coverage spans East, West, North, and South hemispheres');

// =============================================================================
// Suite 4: Trade Corridors Schema & Modal Completeness
// =============================================================================
header('Suite 4: Trade Corridors Schema & Modal Coverage');

// Normalize corridors
let corridorsList = [];
const corridorsByMode = {
  ocean: [],
  air: [],
  rail: [],
  road: [],
  other: [],
};

if (Array.isArray(corridorsRawData)) {
  corridorsList = corridorsRawData;
  corridorsList.forEach(c => {
    if (c.mode && corridorsByMode[c.mode]) {
      corridorsByMode[c.mode].push(c);
    } else {
      corridorsByMode.other.push(c);
    }
  });
} else if (typeof corridorsRawData === 'object' && corridorsRawData !== null) {
  if (Array.isArray(corridorsRawData.corridors)) {
    corridorsList = corridorsRawData.corridors;
    corridorsList.forEach(c => {
      if (c.mode && corridorsByMode[c.mode]) {
        corridorsByMode[c.mode].push(c);
      } else {
        corridorsByMode.other.push(c);
      }
    });
  } else {
    // Mode-keyed dictionary
    ['ocean', 'air', 'rail', 'road'].forEach(mode => {
      if (Array.isArray(corridorsRawData[mode])) {
        corridorsRawData[mode].forEach(c => {
          const item = { ...c, mode: c.mode || mode };
          corridorsList.push(item);
          corridorsByMode[mode].push(item);
        });
      }
    });
  }
}

assert(corridorsList.length > 0, `Normalized trade corridors collection contains records (found: ${corridorsList.length})`);

const validModes = new Set(['ocean', 'air', 'rail', 'road']);
let invalidCorridorCount = 0;
const corridorIds = new Set();

corridorsList.forEach((corridor, idx) => {
  let isCorridorValid = true;
  const identifier = corridor.id || corridor.name || `Corridor #${idx}`;

  // Required: id
  if (!corridor.id || typeof corridor.id !== 'string') {
    fail(`Corridor [${identifier}] missing or invalid 'id'`);
    isCorridorValid = false;
  } else {
    if (corridorIds.has(corridor.id)) {
      fail(`Corridor [${identifier}] duplicate 'id': ${corridor.id}`);
      isCorridorValid = false;
    }
    corridorIds.add(corridor.id);
  }

  // Required: name
  if (!corridor.name || typeof corridor.name !== 'string') {
    fail(`Corridor [${identifier}] missing or invalid 'name'`);
    isCorridorValid = false;
  }

  // Required: mode
  if (!corridor.mode || !validModes.has(corridor.mode)) {
    fail(`Corridor [${identifier}] invalid 'mode': ${corridor.mode}`, `Allowed: ${Array.from(validModes).join(', ')}`);
    isCorridorValid = false;
  }

  // Required: from & to
  const fromCode = typeof corridor.from === 'object' && corridor.from !== null ? corridor.from.code : corridor.from;
  const toCode = typeof corridor.to === 'object' && corridor.to !== null ? corridor.to.code : corridor.to;

  if (!fromCode || typeof fromCode !== 'string') {
    fail(`Corridor [${identifier}] missing valid origin 'from' endpoint`);
    isCorridorValid = false;
  }
  if (!toCode || typeof toCode !== 'string') {
    fail(`Corridor [${identifier}] missing valid destination 'to' endpoint`);
    isCorridorValid = false;
  }

  // Required: path or coordinates polyline
  const polyline = Array.isArray(corridor.path) ? corridor.path : corridor.coordinates;
  if (!Array.isArray(polyline) || polyline.length < 2) {
    fail(`Corridor [${identifier}] missing polyline path with >= 2 coordinates`, `Points: ${polyline ? polyline.length : 0}`);
    isCorridorValid = false;
  } else {
    let badCoords = 0;
    polyline.forEach(([lng, lat], ptIdx) => {
      const isLngValid = typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
      const isLatValid = typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90;
      if (!isLngValid || !isLatValid) {
        badCoords++;
      }
    });

    if (badCoords > 0) {
      fail(`Corridor [${identifier}] has ${badCoords} invalid coordinate points out of ${polyline.length}`);
      isCorridorValid = false;
    }
  }

  if (!isCorridorValid) {
    invalidCorridorCount++;
    if (invalidCorridorCount <= 5) {
      errors.push({ message: `Invalid corridor item`, details: JSON.stringify(corridor) });
    }
  }
});

assert(invalidCorridorCount === 0, `All ${corridorsList.length} corridor records satisfy schema requirements`);

// Verify Modal Thresholds
assert(
  corridorsByMode.ocean.length >= THRESHOLDS.minOceanCorridors,
  `Ocean corridor count meets threshold (found: ${corridorsByMode.ocean.length}, min: ${THRESHOLDS.minOceanCorridors})`
);

assert(
  corridorsByMode.air.length >= THRESHOLDS.minAirCorridors,
  `Air corridor count meets threshold (found: ${corridorsByMode.air.length}, min: ${THRESHOLDS.minAirCorridors})`
);

assert(
  corridorsByMode.rail.length >= THRESHOLDS.minRailCorridors,
  `Rail corridor count meets threshold (found: ${corridorsByMode.rail.length}, min: ${THRESHOLDS.minRailCorridors})`
);

assert(
  corridorsByMode.road.length >= THRESHOLDS.minRoadCorridors,
  `Road corridor count meets threshold (found: ${corridorsByMode.road.length}, min: ${THRESHOLDS.minRoadCorridors})`
);

assert(
  corridorsList.length >= THRESHOLDS.minTotalCorridors,
  `Total corridors count meets threshold (found: ${corridorsList.length}, min: ${THRESHOLDS.minTotalCorridors})`
);

// =============================================================================
// Suite 5: Summary & Exit Status
// =============================================================================
header('Suite 5: Verification Summary & Verdict');

console.log(`\n${colors.bold}Dataset Inventory Summary:${colors.reset}`);
console.log(`  • Global Hubs Total:       ${colors.green}${hubsList.length}${colors.reset} (Threshold >= ${THRESHOLDS.minTotalHubs})`);
console.log(`    - Airports:              ${colors.green}${hubsByType.airport}${colors.reset} (Threshold >= ${THRESHOLDS.minAirports})`);
console.log(`    - Seaports:              ${colors.green}${hubsByType.seaport}${colors.reset} (Threshold >= ${THRESHOLDS.minSeaports})`);
console.log(`    - Inland / Intermodal:   ${colors.green}${aggregateInlandHubs}${colors.reset} (Threshold >= ${THRESHOLDS.minInlandHubs})`);
console.log(`    - Sovereign Countries:   ${colors.green}${countryCodes.size}${colors.reset} (Threshold >= ${THRESHOLDS.minCountries})`);
console.log(`  • Trade Corridors Total:   ${colors.green}${corridorsList.length}${colors.reset} (Threshold >= ${THRESHOLDS.minTotalCorridors})`);
console.log(`    - Ocean Sea Lanes:       ${colors.green}${corridorsByMode.ocean.length}${colors.reset} (Threshold >= ${THRESHOLDS.minOceanCorridors})`);
console.log(`    - Air Cargo Lanes:       ${colors.green}${corridorsByMode.air.length}${colors.reset} (Threshold >= ${THRESHOLDS.minAirCorridors})`);
console.log(`    - Rail Freight Lines:    ${colors.green}${corridorsByMode.rail.length}${colors.reset} (Threshold >= ${THRESHOLDS.minRailCorridors})`);
console.log(`    - Road Freight Arteries: ${colors.green}${corridorsByMode.road.length}${colors.reset} (Threshold >= ${THRESHOLDS.minRoadCorridors})`);

if (errors.length === 0) {
  console.log(`\n${colors.bold}${colors.green}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}  ✓ PHASE 1 VERIFICATION PASSED WITH ZERO ERRORS   ${colors.reset}`);
  console.log(`${colors.bold}${colors.green}====================================================${colors.reset}\n`);
  process.exit(0);
} else {
  console.error(`\n${colors.bold}${colors.red}====================================================${colors.reset}`);
  console.error(`${colors.bold}${colors.red}  ✗ PHASE 1 VERIFICATION FAILED (${errors.length} ERRORS)          ${colors.reset}`);
  console.error(`${colors.bold}${colors.red}====================================================${colors.reset}\n`);
  errors.forEach((err, i) => {
    console.error(`  ${i + 1}. ${err.message}${err.details ? ` (${err.details})` : ''}`);
  });
  console.error('\nPlease fix the dataset generation script (scripts/seed-logistics-nodes.mjs) and re-run.');
  process.exit(1);
}
