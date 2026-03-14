# Next Steps

1. **Add automated invariant tests**

   - Create `tests/invariants/chords.spec.ts` (chord parsing not yet automated).
   - **Done:** `tests/invariants/scroll.spec.ts` and `tests/invariants/sections.spec.ts` cover scroll fraction consistency and section fallbacks.
   - Cover chord parsing for `songs-library/Accords crash text.txt` and at least one complex real song.
   - Scroll sync for start/stop, position jumps, and section navigation is covered by the new scroll/sections specs.

2. **Instrument scroll performance**

   - **Done:** `sessionLogger` (`src/shared/lib/sessionLogger.ts`) and scroll position logging in `useSongScroll` capture scroll/section events; use `sessionLogger.export()` for debugging. Optional: add in-app “Export session logs” to dump these.
   - Optional: capture basic metrics (e.g. average RAF loop interval, scroll latency) during development to spot regressions in admin responsiveness.

3. **Harden chord parser edge cases**

   - Collect any problematic real-world songs that nearly break `Chord.CHORD_REGEX`.
   - Extend the regex and/or `Song.isChordLine` heuristics where needed.
   - Add regression tests in `tests/invariants/chords.spec.ts` for those patterns.

4. **Add viewer layout regression checks**

   - Introduce a simple screenshot or DOM snapshot test (Playwright or similar) for a small set of songs across two viewport sizes.
   - Assert that lyrics-only layout stays stable when toggling chords, guitarist, and drummer modes.

5. **Improve onboarding docs for contributors**

   - Keep `README.md`’s Quick Start and invariants section up to date.
   - Link `ARCHITECTURE.md` and `INVARIANTS.md` prominently in any future CONTRIBUTING guide.
   - Add an “invariant-safe change checklist” for new contributors touching chords, display, or scroll code paths.

