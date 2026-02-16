#!/usr/bin/env tsx
/**
 * Cross-System Coordination Check
 *
 * This script checks for coordination conflicts between Hive Mind (Claude Code)
 * and Conductor (Gemini CLI) teams working in parallel.
 *
 * Usage: node scripts/coordination/check.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CoordinationState {
  version: string;
  lastUpdated: string;
  teams: {
    'hive-mind': TeamStatus;
    conductor: TeamStatus;
  };
  conflicts: {
    detected: boolean;
    warnings: string[];
    blockedActions: string[];
  };
  integration: {
    ready: boolean;
    dependencies: string[];
    checkpoint: string | null;
  };
}

interface TeamStatus {
  system: string;
  framework: string;
  status: string;
  currentPhase: string;
  currentTask: string;
  files: {
    creating: string[];
    modifying: string[];
    reading: string[];
  };
  lastUpdate: string;
}

const STATE_PATH = join(process.cwd(), '.planning', 'coordination', 'state.json');
const EVENTS_PATH = join(process.cwd(), '.planning', 'coordination', 'events.jsonl');

/**
 * Check for file conflicts between teams
 */
function checkFileConflicts(state: CoordinationState): string[] {
  const warnings: string[] = [];
  const hive = state.teams['hive-mind'];
  const cond = state.teams.conductor;

  // Check for direct modification conflicts
  const hiveMods = new Set(hive.files.modifying.map(normalizeGlob));
  const condMods = new Set(cond.files.modifying.map(normalizeGlob));

  for (const file of hiveMods) {
    if (condMods.has(file)) {
      warnings.push(`🔴 FILE CONFLICT: Both teams modifying ${file}`);
    }
  }

  // Check for create/modify race conditions
  const hiveCreates = new Set(hive.files.creating.map(normalizeGlob));
  for (const file of hiveCreates) {
    if (condMods.has(file)) {
      warnings.push(`🟡 RACE CONDITION: Hive creating ${file} while Conductor modifying`);
    }
  }

  // Check for read/write conflicts
  const hiveReads = new Set(hive.files.reading.map(normalizeGlob));
  for (const file of hiveMods) {
    if (hiveReads.has(file)) {
      warnings.push(`🟡 MODIFICATION WARNING: Hive modifying ${file} while reading (potential self-conflict)`);
    }
  }

  return warnings;
}

/**
 * Normalize glob patterns for comparison
 */
function normalizeGlob(pattern: string): string {
  return pattern.replace(/\*/g, '').replace(/\/+/g, '/').toLowerCase();
}

/**
 * Check integration readiness
 */
function checkIntegrationReadiness(state: CoordinationState): {
  ready: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  const hive = state.teams['hive-mind'];
  const cond = state.teams.conductor;

  // Check if teams are in phases that require integration
  if (hive.currentPhase === '2' && cond.status !== 'complete') {
    blockers.push('Hive Mind Phase 2 requires Conductor to be complete');
  }

  return {
    ready: blockers.length === 0,
    blockers
  };
}

/**
 * Log an event to the events file
 */
function logEvent(event: any): void {
  const timestamp = new Date().toISOString();
  const logEntry = JSON.stringify({ timestamp, ...event });

  try {
    if (existsSync(EVENTS_PATH)) {
      const content = readFileSync(EVENTS_PATH, 'utf-8');
      const updated = content + '\n' + logEntry;
      writeFileSync(EVENTS_PATH, updated);
    } else {
      writeFileSync(EVENTS_PATH, logEntry);
    }
  } catch (error) {
    console.debug('Failed to write event log:', error);
  }
}

/**
 * Main coordination check
 */
function main(): void {
  console.log('🔍 Cross-System Coordination Check\n');

  // Read state file
  if (!existsSync(STATE_PATH)) {
    console.log('⚠️  Coordination state file not found');
    console.log('   Expected location:', STATE_PATH);
    console.log('   Run coordination setup first\n');
    process.exit(1);
  }

  try {
    const state: CoordinationState = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));

    // Display current status
    console.log('📊 Current Status:');
    console.log(`   Hive Mind: ${state.teams['hive-mind'].status} (Phase ${state.teams['hive-mind'].currentPhase})`);
    console.log(`   Conductor: ${state.teams.conductor.status} (Phase ${state.teams.conductor.currentPhase})`);
    console.log();

    // Check for conflicts
    const warnings = checkFileConflicts(state);

    // Check integration readiness
    const integrationCheck = checkIntegrationReadiness(state);

    // Update state with conflicts
    state.conflicts = {
      detected: warnings.length > 0,
      warnings,
      blockedActions: integrationCheck.blockers
    };

    state.integration.ready = integrationCheck.ready;
    state.lastUpdated = new Date().toISOString();

    // Write updated state
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

    // Display results
    if (warnings.length > 0) {
      console.log('⚠️  Coordination Warnings:');
      warnings.forEach(w => console.log(`   ${w}`));
      console.log();
    }

    if (integrationCheck.blockers.length > 0) {
      console.log('🚫 Integration Blockers:');
      integrationCheck.blockers.forEach(b => console.log(`   ${b}`));
      console.log();
    }

    if (warnings.length === 0 && integrationCheck.blockers.length === 0) {
      console.log('✅ No coordination issues detected\n');
    }

    // Log the check event
    logEvent({
      team: 'coordination',
      event: 'check_completed',
      data: {
        conflicts: warnings.length,
        integrationReady: integrationCheck.ready
      }
    });

  } catch (error) {
    console.error('❌ Error reading coordination state:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as coordinationCheck, checkFileConflicts, checkIntegrationReadiness };
