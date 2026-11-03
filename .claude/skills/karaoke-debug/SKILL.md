---
name: karaoke-debug
description: Focused debugging of HappiKaraoke sync and scroll issues (viewers not following, stuck scroll, desync, jitter, lag). Use when a scroll, section navigation or real-time sync bug is reported.
---

# Karaoke debug mode

Debug karaoke sync by checking, in order:

1. **Reproduce first** in the real Electron app (`npm run dev`) with at least one follower, and identify the root cause before editing.
2. **Socket payloads**: scroll events (`START`, `STOP`, `TOGGLE`, `FASTER`, `SLOWER`, `POSITION`, `TOP`, `NEXT_SECTION`, `PREVIOUS_SECTION`) in `src/shared/messages/scroll.ts` and `src/shared/endpoints/scroll.ts`.
3. **Scroll state**: `useSongScroll`, `useAutoScroller`, `useSongSections`, `useSongKeyboardShortcuts`; scroll master ownership; musician mode.
4. **React re-renders**: unnecessary store updates in `src/client/store.tsx` causing jank.
5. Session logs: `sessionLogger` (`src/shared/lib/sessionLogger.ts`) and the in-app diagnostics (off by default).

Apply TypeScript and verification rules from `CLAUDE.md`. Delegate UI work to `frontend-specialist` and server/sync work to `backend-sync` when useful. Verify with `npm run test:regression` and `npm run test:electron`.
