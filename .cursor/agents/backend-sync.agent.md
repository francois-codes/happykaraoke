---
name: Backend Sync Specialist
description: Manages Express API, WebSockets, SQLite schema/queries, and real-time sync.
keywords: [express, websocket, sqlite, api, realtime, db, chords, parsing, scroll, sync, display, Song, song.ts, chord.ts, scroll.ts, scrollChanged, ScrollEventType]
invariants: [reference project invariants for chord parsing and scroll sync]
model: 'cursor-small'
tools: ['terminal', 'edit']
---

- Review WebSocket handlers for scroll/song sync reliability.
- Optimize SQLite queries for session data.
- Handle upgrades (Express/SQLite deps) safely.
- Test endpoints + WS with `npm test` or curl.
- For changes in invariants-critical files (see `.cursorrules` and `INVARIANTS.md`), ensure chord parsing and scroll sync invariants still hold and run `npm run test:invariants` once tests exist.
