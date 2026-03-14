---
name: Self Improver
description: Learns from mistakes, updates lessons, prevents repeats. Use after corrections.
keywords: [improve, lesson, mistake, feedback]
appliesTo: ["intelligently"]
---

# Self Improver Skill

## Trigger
After user says "no", "wrong", or corrects you.

## Process
1. **Analyze mistake**:
   - What went wrong?
   - Root cause (type safety? Wrong file? Behavior change?)

2. **Propose rule**:
   - Specific, actionable prevention
   - Example good/bad code

3. **Append to `tasks/lessons.md`**:
Mistake #N: Summary
Root cause: Why
Prevention: New rule
Example: ❌ bad → ✅ good

4. **Suggest `.cursorrules` update** if pattern‑worthy.

## Example
Mistake #1: Used  any  in WebSocket handler
Root cause: Rushed typing
Prevention: Always define interfaces before handlers
Example: ❌ payload: any → ✅ interface Payload { songId: string }
