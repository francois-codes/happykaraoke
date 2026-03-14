# INVARIANTS

This document describes the **golden invariants** of HappiKaraoke and how to test them.

---

## 1. Chord Parsing

**Invariant**

Songs parsed from text files → **all chords correctly flagged/recognized**. No valid chord should ever be misclassified as lyrics.

**Relevant code**

- Parser: `src/shared/lib/song/song.ts` (`Song.parseLines`, `Song.isChordLine`)
- Chord model & regex: `src/shared/lib/song/chord.ts`
- Format reference: [`SONG_FORMAT.md`](./SONG_FORMAT.md)
- Golden file: `songs-library/Accords crash text.txt`

**Manual test procedure**

1. Launch the app:

   ```bash
   npm run dev
   ```

2. Point the app at your songs folder (Settings → Songs folder).
3. Open `Accords crash text.txt` in the app.
4. Visually confirm:
   - All chord-only lines are rendered as chords.
   - All lyric-only lines are rendered as lyrics.
   - Section headers (`#` / `[...]`) and time signatures are displayed as expected.
5. Use transposition controls to shift the song by ±2 semitones and ensure:
   - All chords change correctly (roots and slash bass notes).
   - No chords disappear or turn into invalid tokens.

**Automation target (future)**

- Add tests under `tests/invariants/chords.spec.ts` that:
  - Load `Accords crash text.txt` through `Song.load`.
  - Assert that every expected chord token matches `Chord.isChord`.
  - Assert that the set of `LineType.Chords` and `LineType.Lyrics` matches a stored snapshot.

---

## 2. Display Consistency

**Invariant**

Lyrics layout is **identical** across admin and all viewers, regardless of screen size. Toggling chords ON/OFF **never shifts** visible lyrics/sections.

**Relevant code**

- Song lines & fusion: `src/client/components/SongComponents/SongComponent.tsx`
- Chord/lyrics rendering: `ChordAndLyrics`, `SongLine`, `SongWrapper`
- Global state: `src/client/store.tsx` (`chordsEnabled`, `guitaristMode`, `drummerMode`)

**Manual test procedure**

1. Start a session with at least two guest devices (e.g. laptop + phone).
2. Load a song with dense chords and lyrics (for example, `Accords crash text.txt` or a complex Beatles song).
3. Confirm that:
   - On both devices, line breaks and visible lyrics are identical.
   - Chords appear in the same positions relative to syllables.
4. On the admin:
   - Toggle chords OFF and ON several times.
   - Toggle guitarist/drummer modes as applicable.
5. At each toggle, verify that:
   - Lyrics do not move up/down between toggles.
   - Sections and blank lines remain aligned between admin and guests.

**Automation target (future)**

- Add a DOM-level test (e.g. Playwright) to:
  - Render the same song at two viewport sizes.
  - Capture the text-only layout (ignoring chord spans) and ensure it is identical.

---

## 3. Scroll Sync Reliability

**Invariant**

Admin scroll/next/prev → **instant, reliable follow** on all viewers. No stuck states, no desync under normal LAN conditions.

**Relevant code**

- Keyboard control: `src/client/lib/useSongKeyboardShortcuts.ts`
- Auto-scroller: `src/client/lib/useAutoScroller.ts`
- Scroll sync engine: `src/client/lib/useSongScroll.ts`
- Section detection (and fallbacks for songs without headers): `src/client/lib/useSongSections.ts`
- Scroll endpoint/messages: `src/shared/endpoints/scroll.ts`, `src/shared/messages/scroll.ts`, `src/shared/types/scroll.ts`
- Automated tests: `tests/invariants/scroll.spec.ts`, `tests/invariants/sections.spec.ts`

**Manual test procedure**

1. Start the app:

   ```bash
   npm run dev
   ```

2. Connect at least two guest devices (browser on phone/tablet/laptop).
3. As admin:
   - Press space to start/stop auto-scroll; use left/right arrows to adjust speed.
   - Use up/down arrows to move between sections.
4. On each guest device:
   - Verify that songs scroll in the same direction and roughly at the same time.
   - Ensure no device gets stuck at a section while others move on.
5. Enable musician scroll mode and repeat:
   - Confirm that large jumps move all devices to the same section.
   - Confirm that small scroll adjustments don’t cause jitter on guests.

**Edge cases to test**

- Rapid section jumps (spamming next/previous).
- Temporary disconnect/reconnect of one guest (socket.io should resync).
- Admin toggling scroll master between two machines.

---

## 4. Admin Responsiveness

**Invariant**

Admin navigation (up/down sections, scroll control, queue updates) remains responsive; no noticeable UI jank or input lag.

**Relevant code**

- Session screen: `src/client/screens/session/index.tsx`
- Store: `src/client/store.tsx`
- Scroll + keyboard hooks: `useAutoScroller`, `useSongScroll`, `useSongKeyboardShortcuts`

**Manual test procedure**

1. On the admin Electron window, perform typical flows:
   - Navigate between songs using the queue.
   - Use keyboard shortcuts for scroll/next/prev for several minutes.
2. Watch for:
   - Consistent frame rate (no visible jank).
   - Immediate response to key presses (sub-100ms perceived latency).
   - No long pauses or React re-renders triggered by trivial state changes.

If you suspect regressions, profile the admin window using the Chromium dev tools performance tab.

---

## Running Invariant Tests

Scroll and section invariants are covered by `tests/invariants/scroll.spec.ts` and `tests/invariants/sections.spec.ts`. Run:

```bash
npm run test:invariants
```

This should run Jest and/or Vitest suites for chord parsing, display layout, scroll sync, and admin responsiveness. Any failures here should block merging changes that touch:

- `song.ts`, `chord.ts`, transpose libraries.
- Scroll endpoints, messages, and hooks (`scroll.ts`, `useSongScroll`, `useAutoScroller`, `useSongKeyboardShortcuts`).
- Song rendering components (`SongComponent`, `ChordAndLyrics`, `SongLine`, `SongWrapper`).

