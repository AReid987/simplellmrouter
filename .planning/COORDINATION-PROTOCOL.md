# Enhanced Cross-System Coordination Protocol

**Date:** 2026-02-16
**Status:** Proposed enhancement to existing coordination

---

## Overview

Enhanced coordination between **Hive Mind (Claude Code)** and **Conductor (Gemini CLI)** using a hybrid approach combining shared state files with automated git-based coordination.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Coordination Layer                  │
├─────────────────────────────────────────────────────────────┤
│  .planning/coordination/state.json  (Real-time status)       │
│  .planning/coordination/events.jsonl (Event log)            │
│  .git/hooks/post-commit           (Automated checks)        │
└─────────────────────────────────────────────────────────────┘
          ↑                                  ↑
          │                                  │
    ┌─────┴──────┐                    ┌─────┴──────┐
    │ Hive Mind  │                    │ Conductor  │
    │ (Claude)   │                    │ (Gemini)   │
    └────────────┘                    └────────────┘
```

---

## Shared State File

**Location:** `.planning/coordination/state.json`

```json
{
  "version": "1.0",
  "lastUpdated": "2026-02-16T10:30:00Z",
  "teams": {
    "hive-mind": {
      "system": "claude-code",
      "framework": "gsd",
      "status": "executing",
      "currentPhase": "1",
      "currentTask": "2.1",
      "agentCount": 15,
      "lastUpdate": "2026-02-16T10:28:00Z",
      "files": {
        "creating": ["src/config/*", "config/*"],
        "modifying": [],
        "reading": [".planning/*"]
      }
    },
    "conductor": {
      "system": "gemini-cli",
      "framework": "conductor",
      "status": "executing",
      "currentPhase": "3",
      "currentTask": "quota-logging",
      "testCoverage": 82,
      "lastUpdate": "2026-02-16T10:30:00Z",
      "files": {
        "creating": [],
        "modifying": ["src/server.ts", "src/router.ts"],
        "reading": ["conductor/*"]
      }
    }
  },
  "conflicts": {
    "detected": false,
    "warnings": [],
    "blockedActions": []
  },
  "integration": {
    "ready": false,
    "dependencies": [],
    "checkpoint": null
  }
}
```

---

## Event Log

**Location:** `.planning/coordination/events.jsonl`

```jsonl
{"timestamp":"2026-02-16T10:00:00Z","team":"hive-mind","event":"phase_started","data":{"phase":"1"}}
{"timestamp":"2026-02-16T10:05:00Z","team":"conductor","event":"task_completed","data":{"phase":"2","task":"correlation-id"}}
{"timestamp":"2026-02-16T10:10:00Z","team":"hive-mind","event":"schema_updated","data":{"file":"plan.md","change":"added logging config"}}
```

---

## Automated Coordination Hook

**Location:** `.git/hooks/post-commit`

```bash
#!/bin/bash
# .git/hooks/post-commit

echo "🔍 Checking cross-system coordination..."

# Run coordination check
npm run coordination:check 2>/dev/null || true

# Update state file if check script exists
if [ -f "scripts/coordination/check.js" ]; then
  node scripts/coordination/check.js
fi
```

---

## Coordination Check Script

**Location:** `scripts/coordination/check.ts`

```typescript
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

interface CoordinationState {
  teams: {
    'hive-mind': TeamStatus;
    conductor: TeamStatus;
  };
  conflicts: {
    detected: boolean;
    warnings: string[];
  };
}

interface TeamStatus {
  files: {
    creating: string[];
    modifying: string[];
  };
}

function checkFileConflicts(state: CoordinationState): string[] {
  const warnings: string[] = [];
  const hive = state.teams['hive-mind'];
  const cond = state.teams.conductor;

  // Check for file modification conflicts
  const hiveMods = new Set(hive.files.modifying);
  const condMods = new Set(cond.files.modifying);

  for (const file of hiveMods) {
    if (condMods.has(file)) {
      warnings.push(`⚠️  FILE CONFLICT: Both teams modifying ${file}`);
    }
  }

  // Check for create/modify race conditions
  for (const file of hive.files.creating) {
    if (condMods.has(file)) {
      warnings.push(`⚠️  RACE CONDITION: Hive creating ${file} while Conductor modifying`);
    }
  }

  return warnings;
}

function updateState(): void {
  const statePath = '.planning/coordination/state.json';

  try {
    const state: CoordinationState = JSON.parse(
      readFileSync(statePath, 'utf-8')
    );

    // Check for conflicts
    const warnings = checkFileConflicts(state);

    // Update conflicts section
    state.conflicts = {
      detected: warnings.length > 0,
      warnings
    };

    // Write back
    writeFileSync(statePath, JSON.stringify(state, null, 2));

    // Print warnings if any
    if (warnings.length > 0) {
      console.warn('\n⚠️  Coordination Warnings:');
      warnings.forEach(w => console.warn(w));
      console.warn('See .planning/TEAMS.md for resolution\n');
    }

  } catch (error) {
    // State file doesn't exist yet or invalid JSON
    console.debug('Coordination state not yet initialized');
  }
}

updateState();
```

---

## Integration with Both Systems

### Hive Mind (Claude Code)

**Update:** Add to GSD workflow

```typescript
// In .claude/get-shit-done/workflows/execute-phase.md

After each task completion:
1. Read .planning/coordination/state.json
2. Update hive-mind section with current status
3. Run conflict check
4. Log event to events.jsonl
5. Commit state changes
```

### Conductor (Gemini CLI)

**Update:** Add to Conductor workflow

```typescript
// In conductor/workflow.md

After each task completion:
1. Read .planning/coordination/state.json
2. Update conductor section with current status
3. Run conflict check
4. Log event to events.jsonl
5. Commit state changes
```

---

## Benefits

1. **Real-time awareness:** Both systems know each other's status
2. **Automated conflict detection:** Catches issues before they happen
3. **Event logging:** Full audit trail of coordination
4. **Git-integrated:** Leverages existing infrastructure
5. **No external dependencies:** Works with current tooling
6. **Scalable:** Can add more AI systems easily

---

## Implementation Plan

### Phase 1: Setup (15 min)
- [ ] Create `.planning/coordination/` directory
- [ ] Create `state.json` template
- [ ] Create `events.jsonl` file
- [ ] Create `scripts/coordination/check.ts`

### Phase 2: Integration (30 min)
- [ ] Update GSD workflow to use coordination state
- [ ] Update Conductor workflow to use coordination state
- [ ] Add git post-commit hook
- [ ] Add npm script `coordination:check`

### Phase 3: Testing (15 min)
- [ ] Test conflict detection
- [ ] Test event logging
- [ ] Test git hook integration
- [ ] Document usage

---

## Usage Examples

### Checking Coordination Status

```bash
# Manual check
npm run coordination:check

# View state
cat .planning/coordination/state.json

# View event log
cat .planning/coordination/events.jsonl
```

### Automatic Coordination

```bash
# After any commit, the post-commit hook automatically:
# 1. Runs coordination check
# 2. Updates state if needed
# 3. Warns of conflicts

# Example output:
$ git commit -m "feat: add config schema"
🔍 Checking cross-system coordination...
✓ No conflicts detected
[main 8a3b2c1] feat: add config schema
```

---

## Future Enhancements

1. **Real-time updates:** Add file watcher for instant notifications
2. **Web dashboard:** Visual coordination status
3. **Conflict resolution:** Automated resolution suggestions
4. **Cross-system messaging:** Direct communication channel
5. **Metrics:** Coordination efficiency tracking

---

*Status: Proposed*
*Next Review: After implementation*
*Dependencies: None (uses existing infrastructure)*
