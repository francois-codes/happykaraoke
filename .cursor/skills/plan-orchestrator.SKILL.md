---
name: Plan Orchestrator
description: Handles multi-step tasks with planning, verification, and task management. Use for refactors, upgrades, new features.
keywords: [plan, workflow, orchestrate, verify]
appliesTo: ['always']
---

# Plan Orchestrator Skill

## When to use

- Tasks with 3+ steps
- Architectural changes
- Dependency upgrades
- Bug fixes requiring verification

## Steps

1. **Enter Plan Mode** (Shift+Tab): Create `tasks/plan.md` with:

   - Numbered steps
   - Affected files
   - Verification criteria
   - Risks/mitigations

2. **Execute incrementally**: Mark `tasks/todo.md` as you go.

3. **Verify before complete**:

   - Run `npm run dev` or `npm start`
   - Smoke test: admin session → song change → scroll sync → viewer connection
   - Typecheck: `npm run typecheck`
   - For changes touching chords, display, or scroll: run `npm run test:invariants` (once available) and follow the manual checks in `INVARIANTS.md`.

4. **Self‑review**: "Would a senior engineer approve? Is there a simpler way?"

## Subagent Delegation

For tasks touching multiple areas:

1. Main: Create shared contract (e.g. TS interface for song data).
2. Delegate: `@frontend-specialist UI`, `@backend-sync API`.
3. Collate: Merge + verify end-to-end.

## Output format

Plan for Task
• Step 1: files affected
Verification
• App runs without errors
• Core flows preserved
Approve before execution? Y/N
