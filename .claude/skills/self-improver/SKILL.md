---
name: self-improver
description: Learn from a user correction on HappiKaraoke and record a prevention rule in tasks/lessons.md. Use right after the user says "no", "wrong" or corrects your work.
---

# Self improver

1. **Analyze the mistake**: what went wrong, and the root cause (type safety? wrong file? behavior change?).
2. **Propose a rule**: specific, actionable, with a bad/good example.
3. **Append to `tasks/lessons.md`**:

   ```
   ## Mistake N: <summary>
   **Root cause:** <why>
   **Prevention:** <new rule>
   **Example:** ❌ <bad> → ✅ <good>
   ```

4. If the pattern matters project-wide, especially for the core invariants (chords, display, scroll, admin responsiveness), suggest a matching update to `CLAUDE.md`.

Example: Mistake 1, used `any` in a WebSocket handler → always define interfaces first → ❌ `payload: any` → ✅ `interface Payload { songId: string }`.
