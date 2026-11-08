# HappiKaraoke — Claude Code guide

Multi-device karaoke app: an Electron host (admin) starts an Express + Socket.IO server on the LAN (port **8081**); guests join from a browser. Same React app everywhere, SQLite (Drizzle) storage, shared TypeScript contracts in `src/shared/`.

Start every session with `git status`, then [tasks/HANDOFF.md](tasks/HANDOFF.md) and [tasks/lessons.md](tasks/lessons.md).

## Commands

Node **24.21.0** (asdf; `.tool-versions` is local, never commit it).

```sh
npm ci --legacy-peer-deps      # lockfile has a Radix/React 19 peer conflict
npm run install:deps:electron  # rebuild better-sqlite3 for Electron (after npm ci, before dev/tests/build)
npm run dev                    # Electron app with hot reload (quit the installed HappiKaraoke.app first: port 8081)
npm run typecheck              # client + server, required before calling anything done
npm run test:regression        # executable regression suite (Electron's Node, isolated SQLite)
npm run test:electron          # real host/follower Electron windows, port 18081, screenshots in out/electron-smoke/
npm run build                  # full release build (client + server + electron-builder)
```

- Test the **Electron app**, not a browser tab.
- `test:invariants` is legacy (Jest/Vitest not installed): use `test:regression`.
- After `test:electron`, never run only `build:electron`: run the full `npm run build`.
- `NODE_MODULE_VERSION` mismatch errors = SQLite binary built for the wrong runtime → `npm run install:deps:electron` (or `install:deps:web` for migrations).
- `resources/db.sqlite` is tracked and changes when you use the app (e.g. songs folder setting): never commit it unless asked.

## Golden invariants (see [INVARIANTS.md](INVARIANTS.md))

1. **Chord parsing**: every chord in a song `.txt` is recognized; never regress the parser.
2. **Display consistency**: lyrics layout identical on admin and all viewers; toggling chords never shifts lyrics.
3. **Scroll sync**: admin scroll/next/prev followed instantly by all viewers, no stuck state or desync.
4. **Admin responsiveness**: admin navigation always fluid.

Critical paths (verify invariants before committing changes here): `src/shared/lib/song/{song,chord}.ts`, `src/shared/lib/transpose/**`, `src/shared/endpoints/{song,scroll}.ts`, `src/shared/messages/scroll.ts`, `src/client/components/SongComponents/**`, `src/client/lib/{useAutoScroller,useSongScroll,useSongSections,useSongKeyboardShortcuts}.ts`. If a risk is detected: stop and propose a mitigation plan.

## Rules

- **Plan first** for anything with 3+ steps, architecture or upgrades; get approval before implementing. Track multi-step work in `tasks/todo.md` with a final "what I tested" section.
- **Check `git status`** before editing; never overwrite uncommitted manual work. Never rewrite published history.
- **Keep it simple**: minimal, focused changes, existing patterns, no new libraries unless needed. Preserve behavior unless asked.
- **Type safety is law**: no `any` (use `unknown` and narrow), no unexplained `@ts-ignore`, explicit types on new/changed functions, interfaces for objects, string unions over enums.
- **Boundaries**: `src/client/` and `src/server/` never import each other; both may import `src/shared/`.
- **Patterns**: endpoints via `createEndpoint` in `src/shared/endpoints/` (exported in `index.ts`); socket messages via `createMessage` in `src/shared/messages/`; global state via `useStore`/`useDispatch` from `@/store` (no Redux/Zustand). Schema changes need a Drizzle migration.
- **Multi-device**: every change affects admin (Electron) and guests (browsers); consider admin only, guest only, admin + several guests.
- **Scroll is complex**: admin sends, guests receive; manual scroll overrides auto-scroll; positions differ by device.
- **Verify before done**: typecheck, regression tests, and run the app (start session → change song → scroll sync → viewer connection).
- Don't change build/packaging config unless that is the task. Don't add state libraries, build tools, styling frameworks or another database.
- After a user correction, add a lesson to `tasks/lessons.md` (Mistake → Root cause → Prevention → Example).
- Ask when requirements are ambiguous; present options with trade-offs.

## Docs

[QUICK_REFERENCE.md](QUICK_REFERENCE.md) (start here) · [ARCHITECTURE.md](ARCHITECTURE.md) · [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) · [INVARIANTS.md](INVARIANTS.md) · [SONG_FORMAT.md](SONG_FORMAT.md) · [README.md](README.md) · [tasks/next-steps.md](tasks/next-steps.md) · plans in [.cursor/plans/](.cursor/plans/). Version numbers in older docs and `.claude/rules.md`/`context.md` are stale (current: see `package.json`).

Agents in `.claude/agents/` (frontend-specialist, backend-sync, electron-packager); skills in `.claude/skills/` (invariant-tester, plan-orchestrator, self-improver, upgrade-safe, karaoke-debug). The `.cursor/` originals stay untouched for Cursor users.

## Git workflow

- Remote: GitHub `git@github.com:francois-codes/happykaraoke.git` (SSH; public repo). **Base branch: `main`** (ignore `tauri-reafactor`). The old Bitbucket remote (`froland-demo/happikaraoke`) is no longer used.
- Branch from `main`: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`, `docs/<topic>`.
- Conventional commits with gitmoji: `feat: ✨ …`, `fix: 🐛 …`, `chore: 🔧 …`, `docs: 📝 …`, `refactor: ♻️ …`, `test: ✅ …`. semantic-release builds the DMG from `main` (GitHub Actions), so commit types matter.
- Push with `git push -u origin <branch>` (ask first), then open the PR towards `main`: `gh pr create --base main` when `gh` is authenticated, otherwise the link `https://github.com/francois-codes/happykaraoke/compare/main...<branch>?expand=1`.
