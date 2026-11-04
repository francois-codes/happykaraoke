---
name: invariant-tester
description: Verify HappiKaraoke's golden invariants (chord parsing, display consistency, scroll sync, admin responsiveness) after a change to chords, rendering or scroll code. Use before committing changes to invariant-critical files.
---

# Invariant tester

1. Automated checks:

   ```bash
   npm run typecheck
   npm run test:regression
   npm run test:electron
   ```

   (`npm run test:invariants` is legacy and needs Jest/Vitest, which are not installed.)

2. Manual smoke — chords and layout (`npm run dev`):
   - Open `songs-library/Accords crash text.txt`.
   - Check every chord is detected and rendered correctly.
   - Toggle chords ON/OFF: lyrics must not move.
   - Compare admin with at least one guest at a different screen size.

3. Manual smoke — scroll sync:
   - On admin, use keyboard shortcuts (space, arrows, section jumps).
   - Every guest follows scroll and section changes without getting stuck.
   - Test musician scroll mode and scroll master handover between admins.

4. Report PASS/FAIL per invariant with short notes, referring to `INVARIANTS.md` for the expected behavior.
