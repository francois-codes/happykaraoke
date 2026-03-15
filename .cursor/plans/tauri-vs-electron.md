# Tauri vs Electron for HappiKaraoke

**Decision (this branch):** Full Tauri migration completed. The desktop app uses Tauri 2 + Rust backend (Axum, rusqlite, WebSocket, notify). Electron is no longer the default: `npm run dev` and `npm run build` use Tauri. Legacy Electron build is still available as `npm run build:electron` (requires main/preload; see `src/server/main.ts`).

---

## Current Architecture (Critical Context)

HappiKaraoke is **not** a simple "web UI + native shell" app. It's a **full-stack Node.js application** that Electron hosts:

- **Express** — HTTP server, REST API
- **Socket.IO** — Real-time sync
- **Drizzle ORM + better-sqlite3** — Database
- **File watcher** — Song folder changes

**Electron-specific usage** (actually minimal):

| Feature                   | Usage                             | File                                             |
| ------------------------- | --------------------------------- | ------------------------------------------------ |
| `BrowserWindow`           | Create window                     | [src/server/main.ts](src/server/main.ts)         |
| `dialog.showOpenDialog`   | Folder picker for songs           | main.ts, [src/server/preload.ts](src/server/preload.ts) |
| `app.getAppPath()`        | Production DB path                | [src/shared/db/index.ts](src/shared/db/index.ts)  |
| `ipcMain` / `ipcRenderer`  | Expose `openDialog()` to renderer | main.ts, preload.ts                              |

The heavy lifting is **Express, Socket.IO, Drizzle, better-sqlite3, file watching** — all Node.js code running in the same process as Electron main.

---

## Tauri Options

### Option 1: Node.js Sidecar

Run the existing Node server as a Tauri sidecar process.

**How it works:**
- Bundle Node + your server into an executable (e.g. with `@yao-pkg/pkg` or similar)
- Tauri spawns it via `Command.sidecar()`
- WebView loads `http://localhost:PORT` (same as today)
- Replace `dialog` with Tauri's `@tauri-apps/plugin-dialog`
- Replace `app.getAppPath()` with Tauri path APIs

**Blockers:**
- **better-sqlite3** is a native addon. `pkg` and most Node bundlers handle native addons poorly; you often need to ship `node_modules` as files and run `node server.js` instead of a single binary.
- You still ship Node (~50MB+) plus your app. Tauri's size win is largely lost.
- Process lifecycle: Tauri must spawn/kill the Node process, handle crashes, and ensure clean shutdown.
- Dev workflow: Today `npm run dev` starts one process. With Tauri you'd need Tauri dev + separate Node server, or custom scripts.

**Verdict:** Possible but fragile. Bundle size and complexity gains are limited.

---

### Option 2: Full Rust Backend

Rewrite the server in Rust.

**Replacements:**
- Express → Axum or Actix
- Socket.IO → `tokio-tungstenite` + custom protocol, or a crate like `socketio`
- Drizzle + better-sqlite3 → `rusqlite` or `sqlx`
- File watching → `notify` crate
- Song parsing, transposition, session logic → Rust

**Effort:** High. 3–8+ weeks depending on familiarity with Rust. Most business logic must be rewritten, not just the shell.

**Benefits:**
- True Tauri benefits: smaller bundle (~5–15MB vs ~150MB+ Electron), lower memory, faster startup
- Single binary, no Node runtime
- Strong typing and performance
- One language across backend and desktop layer

**Verdict:** Best long-term fit for Tauri, but a substantial project.

---

### Option 3: Stay on Electron

Keep Electron and focus on dependency updates (React, Vite, Tailwind, Electron 33) as in the dependency plan.

**Pros:**
- No migration risk
- Current stack is proven and maintainable
- Node ecosystem remains available
- ~1 day for dependency upgrades vs weeks for Tauri

**Cons:**
- Larger bundle and memory footprint
- Slower cold start than Tauri

---

## Recommendation

| Approach                         | Effort             | Risk   | Bundle Size Gain             |
| -------------------------------- | ------------------ | ------ | ---------------------------- |
| **Stay Electron + update deps**  | Low (1–2 days)     | Low    | —                            |
| **Tauri + Node sidecar**         | Medium (1–2 weeks) | Medium | Limited (Node still shipped) |
| **Tauri + Rust backend**         | High (4–8+ weeks)  | Medium | High (~150MB → ~15MB)        |

**Practical recommendation:** Stay on Electron unless bundle size or memory is a real problem. Your app is a Node-based server app with a thin desktop shell; Electron fits that model well. The sidecar path adds complexity without clear benefit. A full Rust backend is the only way to fully leverage Tauri, and that's a major refactor.

If you decide to explore Tauri later, start with a **small proof-of-concept** (Tauri + Node sidecar spawning a minimal Express server) to validate the sidecar approach and native-addon handling before committing.
