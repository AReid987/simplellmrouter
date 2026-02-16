# Integration Steps: Making Both Teams Use Coordination

**Status:** Infrastructure ready ✅ | Workflow integration needed ⏳

---

## Quick Answer

**Yes, you need to update 2 workflow files:**

1. **Hive Mind (GSD):** Update `.claude/get-shit-done/workflows/execute-phase.md`
2. **Conductor:** Update `conductor/workflow.md`

Both updates follow the same pattern - add coordination steps to the existing workflow.

---

## What Needs to Change

### Team 1: Hive Mind (Claude Code + GSD)

**File to update:** `.claude/get-shit-done/workflows/execute-phase.md`

**Add this after "Mark task as in_progress" step:**

```markdown
### Coordination Check (Before Starting Task)

1. **Read current coordination state:**
   ```
   Read: .planning/coordination/state.json
   ```

2. **Check for conflicts:**
   - If `conflicts.detected === true`, STOP and ask user
   - Review `conflicts.warnings` array
   - Proceed only if no blocking conflicts

3. **Update Hive Mind status:**
   - Set `currentTask` to task ID
   - Update `files.creating` or `files.modifying`
   - Write updated state.json

4. **Log event:**
   ```json
   {"timestamp":"...","team":"hive-mind","event":"task_started","data":{...}}
   ```

### Coordination Update (After Completing Task)

**Add this before "Mark task as completed" step:**

```markdown
1. **Update coordination state:**
   - Set `currentTask` to next task or "complete"
   - Clear file arrays if done
   - Write updated state.json

2. **Log completion event:**
   ```json
   {"timestamp":"...","team":"hive-mind","event":"task_completed","data":{...}}
   ```

3. **Run coordination check:**
   ```bash
   npm run coordination:check
   ```
```

---

### Team 2: Conductor (Gemini CLI)

**File to update:** `conductor/workflow.md`

**Add this after "Select Task" step:**

```markdown
### Coordination Check (Before Starting Task)

1. **Read current coordination state:**
   - Check `.planning/coordination/state.json`
   - Verify no conflicts with Hive Mind

2. **Check file access:**
   - If task modifies files Hive Mind is creating → STOP
   - If task creates files Hive Mind is modifying → STOP
   - Ask user for resolution if conflicts detected

3. **Update Conductor status:**
   - Update `teams.conductor.currentTask`
   - Update `teams.conductor.files.modifying` or `.creating`
   - Write to `.planning/coordination/state.json`

4. **Log event:**
   - Append to `.planning/coordination/events.jsonl`

### Coordination Update (After Completing Task)

**Add this after "Mark task as complete" step:**

```markdown
1. **Update coordination state:**
   - Clear completed files from arrays
   - Update currentTask to next task
   - Write updated state.json

2. **Log completion event:**
   - Append to events.jsonl with task details

3. **Run coordination check:**
   ```bash
   npm run coordination:check
   ```

4. **Commit coordination updates:**
   ```bash
   git add .planning/coordination/
   git commit -m "chore: update coordination state"
   ```
```

---

## Easiest Way: Manual Reminders

If you don't want to modify workflow files right now, **just remind each team manually**:

### When Starting Hive Mind Task

```
Remember to update coordination state:
1. Check .planning/coordination/state.json for conflicts
2. Update your status before starting
3. Run npm run coordination:check when done
```

### When Starting Conductor Task

```
Remember to update coordination state:
1. Check .planning/coordination/state.json for conflicts
2. Update your status before starting
3. Run npm run coordination:check when done
```

---

## Step-by-Step Integration Guide

### Option 1: Quick Integration (5 minutes)

**Just add reminders to prompt:**

1. Open `.claude/get-shit-done/workflows/execute-phase.md`
2. Add at top: "Remember to check .planning/coordination/state.json before starting tasks"
3. Open `conductor/workflow.md`
4. Add at top: "Remember to check .planning/coordination/state.json before starting tasks"
5. Done!

**Pros:** ✅ Fast, ✅ No workflow changes
**Cons:** ⚠️ Relies on AI remembering to check

---

### Option 2: Proper Integration (15 minutes)

**Add actual workflow steps:**

1. Copy the code blocks above
2. Paste into the appropriate workflow files
3. Test with a dummy task
4. Verify state.json updates correctly

**Pros:** ✅ Automated, ✅ Reliable
**Cons:** ⚠️ Takes 15 minutes

---

### Option 3: Git Hook Only (Already Done!)

**The post-commit hook already runs coordination check!**

Just rely on the git hook:
- Commit changes
- Hook automatically runs `npm run coordination:check`
- Warnings appear if conflicts detected
- No workflow changes needed!

**Pros:** ✅ Already done, ✅ Zero friction
**Cons:** ⚠️ Only checks on commit (not before starting)

---

## Recommended Approach

**For now: Option 3 (Git Hook Only)**

The git hook we created is already working! Just:

1. **Both teams work normally**
2. **Commit changes when ready**
3. **Git hook automatically checks coordination**
4. **Warnings appear if conflicts**

**Example:**
```bash
$ git commit -m "feat: add config schema"
🔍 Checking cross-system coordination...
⚠️  Coordination Warnings:
   🟡 RACE CONDITION: Hive creating src/config/ while Conductor modifying src/

See .planning/TEAMS.md for resolution
```

**Later:** If you want more proactive checking, do Option 2 (proper integration).

---

## Testing the Integration

**Test with both teams:**

```bash
# 1. Hive Mind: Start a task
# Update state.json manually:
{
  "teams": {
    "hive-mind": {
      "currentTask": "2.1",
      "files": {
        "creating": ["src/config/schema.ts"]
      }
    }
  }
}

# 2. Conductor: Start a task
# Update state.json manually:
{
  "teams": {
    "conductor": {
      "currentTask": "quota-logging",
      "files": {
        "modifying": ["src/quota-tracker.ts"]
      }
    }
  }
}

# 3. Run check
npm run coordination:check

# 4. Should show:
✅ No coordination issues detected
# OR
⚠️  Coordination Warnings (if conflicts)
```

---

## Summary

**Do you NEED to do anything?**

**Technically:** No - git hook already provides coordination

**Ideally:** Yes - add workflow updates for proactive checking

**Minimum effort:** Just remind teams verbally to check state.json

**Best effort:** Option 2 (proper workflow integration) - 15 minutes

---

**Recommendation:** Start with git hook (already working), add proper workflow integration later if needed.

**Current Status:** ✅ Infrastructure ready | ⏳ Workflow integration optional
