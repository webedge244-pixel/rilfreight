#!/usr/bin/env node
/**
 * RILFREIGHT Master End-to-End Verification Suite
 * Executes and audits all 4 phases of the RILFREIGHT logistics platform in serial:
 *
 * Phase 1: High-Speed Logistics Dataset & Hub Ingestion Engine
 *   - scripts/verify-phase1.mjs
 *   - Validates 225 standardized hubs (81 airports, 113 seaports, 31 inland hubs across 55 countries)
 *   - Validates 22 trade corridors (7 ocean, 7 air, 4 rail, 4 road)
 *
 * Phase 2: Multi-Stop Smart Route Estimation & Geocoding Engine
 *   - scripts/verify-phase2.mjs
 *   - Validates geocoding, spatial gateway matcher, Great Circle arcs, Panama/Suez canals, and dwell times
 *
 * Phase 3: Admin "New Shipment" Route Studio UI
 *   - scripts/verify-phase3.mjs
 *   - Validates Route Studio form, mini-map preview, checkpoint stepper with hold gate toggle, and Firestore schema
 *
 * Phase 4: Admin Management Matrix & Customer Live Tracking Portal
 *   - scripts/verify-phase4.mjs
 *   - Validates Admin Matrix quick actions (Release Gate, Trigger Exception), Customer Live Tracking solid/dashed map, and timeline
 *
 * Usage:
 *   node scripts/verify-e2e.mjs
 *
 * Exit Codes:
 *   0 = All 4 phases passed with zero errors
 *   1 = One or more phases failed
 */

import { spawn } from 'node:child_process';
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
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

const phases = [
  {
    id: 1,
    name: 'Phase 1: Logistics Datasets & Hub Ingestion Engine',
    script: path.join(projectRoot, 'scripts', 'verify-phase1.mjs'),
    description: '225 standardized hubs, 22 trade corridors, coordinate bounds',
  },
  {
    id: 2,
    name: 'Phase 2: Multi-Stop Routing & Geocoding Engine',
    script: path.join(projectRoot, 'scripts', 'verify-phase2.mjs'),
    description: 'Geocoder, Haversine Gateway Matcher, Great Circle & Searoutes, Dwell Times',
  },
  {
    id: 3,
    name: 'Phase 3: Admin Route Studio UI & Direct Persistence',
    script: path.join(projectRoot, 'scripts', 'verify-phase3.mjs'),
    description: 'Route Studio form, Leaflet mini-map, Checkpoint Stepper, Hold Gates, Firestore payload',
  },
  {
    id: 4,
    name: 'Phase 4: Admin Management Matrix & Customer Live Tracking',
    script: path.join(projectRoot, 'scripts', 'verify-phase4.mjs'),
    description: 'Matrix quick actions, solid/dashed polyline partitioning, vehicle marker, live timeline',
  },
];

console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}       RILFREIGHT PRODUCTION END-TO-END MASTER AUDIT SUITE            ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
console.log(`${colors.dim}Project Root: ${projectRoot}${colors.reset}`);
console.log(`${colors.dim}Target Phases: 4 sequential audit gates${colors.reset}\n`);

function executePhaseScript(phase) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    console.log(`\n${colors.bold}${colors.magenta}>>> EXECUTING AUDIT GATE: ${phase.name} <<<${colors.reset}`);
    console.log(`${colors.dim}Script: ${path.relative(projectRoot, phase.script)}${colors.reset}`);
    console.log(`${colors.dim}Scope:  ${phase.description}${colors.reset}\n`);

    const child = spawn(process.execPath, [phase.script], {
      cwd: projectRoot,
      env: { ...process.env, FORCE_COLOR: '1' },
      stdio: 'inherit',
    });

    child.on('error', (err) => {
      const durationMs = Date.now() - startTime;
      resolve({
        phase,
        exitCode: 1,
        durationMs,
        error: err.message,
      });
    });

    child.on('close', (exitCode) => {
      const durationMs = Date.now() - startTime;
      resolve({
        phase,
        exitCode: exitCode ?? 1,
        durationMs,
        error: null,
      });
    });
  });
}

async function runMasterE2E() {
  const masterStartTime = Date.now();
  const results = [];
  let allPassed = true;

  for (const phase of phases) {
    const result = await executePhaseScript(phase);
    results.push(result);

    if (result.exitCode !== 0) {
      allPassed = false;
      console.error(`\n${colors.red}${colors.bold}Gate Failure: ${phase.name} exited with code ${result.exitCode}${colors.reset}`);
    } else {
      console.log(`\n${colors.green}Gate Success: ${phase.name} passed in ${(result.durationMs / 1000).toFixed(2)}s${colors.reset}`);
    }
  }

  const totalDuration = ((Date.now() - masterStartTime) / 1000).toFixed(2);

  // Master Scorecard Output
  console.log(`\n\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}                     MASTER AUDIT SCORECARD                           ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}\n`);

  console.log(
    `  ${'Phase'.padEnd(10)} | ${'Name'.padEnd(48)} | ${'Duration'.padEnd(10)} | ${'Result'.padEnd(8)}`
  );
  console.log(`  ${'-'.repeat(10)}-+-${'-'.repeat(48)}-+-${'-'.repeat(10)}-+-${'-'.repeat(8)}`);

  for (const r of results) {
    const phaseLabel = `Phase ${r.phase.id}`.padEnd(10);
    const nameLabel = r.phase.name.slice(0, 48).padEnd(48);
    const durationLabel = `${(r.durationMs / 1000).toFixed(2)}s`.padEnd(10);
    const statusLabel = r.exitCode === 0
      ? `${colors.green}${colors.bold}PASS${colors.reset}    `
      : `${colors.red}${colors.bold}FAIL${colors.reset}    `;

    console.log(`  ${phaseLabel} | ${nameLabel} | ${durationLabel} | ${statusLabel}`);
  }

  console.log(`\n  ${colors.dim}Total Master Audit Duration: ${totalDuration}s${colors.reset}\n`);

  if (allPassed) {
    console.log(`${colors.bold}${colors.green}======================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.green}  ✓ END-TO-END VERIFICATION CERTIFIED CLEAN ACROSS ALL 4 PHASES      ${colors.reset}`);
    console.log(`${colors.bold}${colors.green}  Production freight routing, simulation & tracking platform verified.${colors.reset}`);
    console.log(`${colors.bold}${colors.green}======================================================================${colors.reset}\n`);
    process.exit(0);
  } else {
    console.error(`${colors.bold}${colors.red}======================================================================${colors.reset}`);
    console.error(`${colors.bold}${colors.red}  ✗ END-TO-END VERIFICATION FAILED ONE OR MORE PHASE AUDIT GATES     ${colors.reset}`);
    console.error(`${colors.bold}${colors.red}======================================================================${colors.reset}\n`);
    process.exit(1);
  }
}

runMasterE2E().catch((err) => {
  console.error(`\n${colors.red}Fatal Master Audit Runner Exception:${colors.reset}`, err);
  process.exit(1);
});
