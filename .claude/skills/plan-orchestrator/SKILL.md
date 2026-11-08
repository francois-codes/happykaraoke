---
name: plan-orchestrator
description: Plan, execute and verify multi-step HappiKaraoke work (3+ steps, architecture changes, dependency upgrades, bug fixes needing verification). Use before starting a refactor, upgrade or new feature.
---

# Plan orchestrator

## Steps

1. **Plan** (use plan mode): write `tasks/plan.md` with numbered steps, affected files, verification criteria, risks and mitigations. Present it and wait for approval.
2. **Execute incrementally**: keep a checklist in `tasks/todo.md` and tick items as you go.
3. **Verify before done**:
   - `npm run typecheck` and `npm run test:regression`
   - `npm run dev`, then smoke test: admin session → song change → scroll sync → viewer connection
   - For changes touching chords, display or scroll: use the `invariant-tester` skill.
4. **Self-review**: "Would a senior engineer approve this? Is there a simpler way?"

## Delegation

For tasks spanning several areas:

1. Define the shared contract first (for example a TS interface in `src/shared/`).
2. Delegate to the `frontend-specialist` (UI) and `backend-sync` (API/sync) agents, in parallel when possible.
3. Merge the results and verify end to end.

## Output format

```
Plan for <task>
• Step 1: <files affected>
Verification
• App runs without errors
• Core flows preserved
Approve before execution?
```
