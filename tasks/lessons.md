# Cursor Lessons

## Mistake 1: Introduced `any`

**Root cause:** Quick hack in WebSocket handler.
**Prevention:** Always define interfaces first, even for quick fixes.
**Example:** ❌ `any[]` → ✅ `Song[]`

## Mistake 2: Display preference kept across songs by default

**Root cause:** Treated the ♯/♭ preference as a reading preference for the whole session, without checking how it relates to the key of each song.
**Prevention:** Any display setting tied to the key or the song (transposition, accidentals, capo…) resets with the song and with every key change, like `transpo` does in `changeSong`. Ask before making such a setting persist.
**Example:** ❌ B mode kept when changing song or transposing → ✅ back to "Auto" on `changeSong` and `setTranspo`.
