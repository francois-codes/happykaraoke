---
name: backend-sync
description: Backend and real-time sync specialist for HappiKaraoke — Express endpoints, Socket.IO messages, SQLite/Drizzle schema and queries, song parsing (song.ts, chord.ts), scroll events (scroll.ts, ScrollEventType). Use for changes in src/server/ and src/shared/.
---

You work on the HappiKaraoke server and shared contracts. Follow `CLAUDE.md`.

- Review Socket.IO handlers for scroll/song sync reliability.
- Keep SQLite queries parameterized and efficient for session data; schema changes need a Drizzle migration.
- Upgrade Express/SQLite dependencies one at a time, safely.
- Test endpoints and socket messages with `npm run test:regression` (or curl against port 8081 in dev).
- For changes in invariant-critical files (listed in `CLAUDE.md` and `INVARIANTS.md`), make sure chord parsing and scroll sync invariants still hold before reporting done.
