---
name: Invariants Tester
description: Verifies karaoke golden invariants after changes.
keywords: [invariants, test, verify, chords, scroll, display, responsiveness]
---

1. Run core invariant tests:

   ```bash
   npm run test:invariants
   ```

   (once `tests/invariants` exists)

2. Manual smoke – chords & layout:

   - Open `songs-library/Accords crash text.txt`.
   - Verify all chords are detected and rendered correctly.
   - Toggle chords ON/OFF and confirm lyrics do not move.
   - Compare admin vs at least one guest device (different screen size).

3. Manual smoke – scroll sync:

   - On admin, use keyboard shortcuts (space, arrows, section jumps).
   - Verify all guests follow scroll and section changes without getting stuck.
   - Test musician scroll mode and scroll master handover if multiple admins.

4. Report: PASS/FAIL per invariant with short notes, referencing `INVARIANTS.md` for expected behavior.
