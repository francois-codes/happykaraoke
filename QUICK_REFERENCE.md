# HappiKaraoke v2 - Quick Reference

> **Quick reference guide for efficiently working with this codebase**

## 🎯 What This App Does

Multi-device karaoke app: Host runs Electron app on laptop, spins Express server on local network, guests connect via browser to view synchronized lyrics/chords in real-time.

**Key Flow:** Admin controls → Server broadcasts via Socket.io → All clients sync

---

## 📁 Key File Locations

### Entry Points
```
src/server/main.ts          # Electron main process
src/server/server.ts        # Express server setup
src/client/main.tsx         # React app entry
```

### Core Logic
```
src/shared/lib/song/song.ts            # Song parser
src/shared/lib/transpose/              # Chord transposition
src/shared/db/schema.ts                # Database schema
src/shared/config/index.ts             # Configuration (PORT, PASSWORD, etc.)
```

### API Definitions
```
src/shared/endpoints/                  # REST endpoints
src/shared/messages/                   # Socket.io messages
```

### Client Components
```
src/client/components/SongComponents/  # Song display
src/client/components/Menu/            # Controls & header
src/client/store.tsx                   # Global state
```

---

## 🚀 Quick Commands

```bash
# Development
npm run dev                    # Start Electron with hot-reload

# Building
npm run build                  # Full build (client + server + package)
npm run build:client          # Vite build only
npm run build:server          # esbuild server only

# Type checking
npm run typecheck             # Check all TypeScript

# SQLite binary (switch between environments)
npm run install:deps:electron # For Electron/production
npm run install:deps:web      # For dev/migrations

# Database
npm run db:migration:generate # Create migration
npm run db:migration:run      # Run migrations
```

---

## 🔑 Critical Info

### Login
- **Admin password**: `Ab=G#` (hardcoded in `src/shared/config/index.ts`)

### Server
- **Port**: 8081
- **Host URL**: `http://{local-ip}:8081`
- **Exposed on**: Local network only

### Song Files
- **Location**: User-configured folder (default: `~/Music/Karaoke`)
- **Format**: Plain `.txt` files
- **Structure**:
  ```
  Title
  Author
  Key (G, C, etc.)
  tags space separated

  [Section]
  Chord line
  Lyric line
  ```

### Database
- **File**: `resources/db.sqlite`
- **ORM**: Drizzle
- **Tables**: config, user, session, session_log, queue

---

## 🛠️ Common Tasks

### Adding an Endpoint

**1. Create** `src/shared/endpoints/myEndpoint.ts`:
```typescript
import { createEndpoint } from '../lib/endpoints/create'

export const myEndpoint = createEndpoint<RequestBody, ResponseBody>({
  method: 'post',
  url: '/my-endpoint',
  handler: (req, res) => {
    res.json({ result: 'data' })
  }
})
```

**2. Export** in `src/shared/endpoints/index.ts`:
```typescript
export const endpoints = [..., myEndpoint]
```

**3. Call** from client:
```typescript
import { myEndpoint } from '@shared/endpoints/myEndpoint'
const response = await myEndpoint.call({ data })
```

### Adding a Socket Message

**1. Create** `src/shared/messages/myMessage.ts`:
```typescript
import { createMessage } from '../lib/messages/create'

export const myMessage = createMessage<PayloadType>({
  event: 'my:event',
  server: {
    emit: (payload) => {
      socketEmitter.emit('socket:emit', {
        event: 'my:event',
        payload
      })
    }
  },
  client: {
    useMessage: (callback) => {
      const socket = useSocket()
      useEffect(() => {
        socket.on('my:event', callback)
        return () => socket.off('my:event', callback)
      }, [callback])
    }
  }
})
```

**2. Export** in `src/shared/messages/index.ts`

**3. Emit** from server:
```typescript
myMessage.server.emit({ data })
```

**4. Listen** in client:
```typescript
myMessage.client.useMessage((payload) => {
  console.log(payload)
})
```

### Updating Global State

```typescript
import { useStore, useDispatch } from '@/store'

const store = useStore()
const dispatch = useDispatch()

// Read
console.log(store.currentSong)

// Write
dispatch({ currentSong: 'New Song' })
```

### Adding a Database Table

**1. Define** in `src/shared/db/schema.ts`:
```typescript
export const myTable = sqliteTable('my_table', {
  id: integer('id').primaryKey(),
  name: text('name').notNull()
})
```

**2. Generate migration**:
```bash
npm run db:migration:generate
```

**3. Run migration**:
```bash
npm run db:migration:run
```

---

## 📦 Tech Stack

**Frontend**: React 18 + TypeScript + TailwindCSS + Vite
**Backend**: Node.js + Express + Socket.io
**Desktop**: Electron 30
**Database**: SQLite + Drizzle ORM
**Build**: esbuild (server) + Vite (client) + electron-builder

---

## 🏗️ Architecture Patterns

### Shared Code Pattern
```
src/
├── client/    # React (browser)
├── server/    # Electron main (Node.js)
└── shared/    # Type-safe contracts (isomorphic)
```

**Benefits:**
- Single source of truth for API contracts
- Compile-time validation of client-server communication
- No API documentation drift

### Endpoint Pattern
- Defined once in `@shared/endpoints/`
- Auto-registered on Express server
- Called directly from client with full type safety
- No manual fetch/axios calls needed

### Message Pattern
- Defined once in `@shared/messages/`
- Server and client implementations in same file
- Type-safe payloads
- React hooks for component usage

---

## 🐛 Debugging Quick Tips

### Client
- Open DevTools: `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows)
- React DevTools available

### Server
- Console logs appear in terminal where `npm run dev` runs
- Add breakpoints in VS Code

### Socket.io
Enable debug logging:
```typescript
socket.onAny((event, ...args) => {
  console.log('Event:', event, args)
})
```

---

## ⚠️ Common Issues

### SQLite Binary Mismatch
**Error**: `Error: The module was compiled against a different Node.js version`

**Fix**:
```bash
npm run install:deps:electron  # If running in Electron
npm run install:deps:web       # If running migrations/dev
```

### Songs Not Loading
**Check**:
1. Songs folder path correct?
2. Files have `.txt` extension?
3. Files in root of folder (not subfolders)?
4. File format correct? (See SONG_FORMAT.md)

### Vite Dev Server Issues
**Fix**:
```bash
lsof -i :8081              # Check if port in use
kill -9 <PID>              # Kill process
rm -rf node_modules/.vite  # Clear cache
npm run dev                # Restart
```

---

## 📊 Data Flow Examples

### Song Change
```
Admin clicks song
  ↓
POST /set-song
  ↓
Update DB config
  ↓
Socket.io emit: song:changed
  ↓
All clients receive event
  ↓
Clients fetch new song (GET /song)
  ↓
UI updates
```

### Scroll Sync
```
Admin scrolls
  ↓
POST /scroll { type, value }
  ↓
Socket.io emit: scroll:changed
  ↓
Guests receive event (admin ignores)
  ↓
Guest clients smooth scroll to position
```

### Transposition
```
Admin changes transpo
  ↓
POST /set-transpo { transpo }
  ↓
Update DB config
  ↓
Socket.io emit: transpo:changed
  ↓
All clients receive event
  ↓
Chords re-rendered with new key
```

---

## 🎼 Song Parsing Logic

### Line Detection (Order)
1. Empty line → Break
2. Starts with `#` or `[` → Section
3. All words match chord patterns → Chords
4. Everything else → Lyrics

### Chord Regex
```regex
^[ABCDEFG](?:#|b)?(?:maj|min|m|sus|aug|dim)?[0-9]*(?:/[ABCDEFG](?:#|b)?)?$
```

**Examples**: C, Cm, Cmaj7, C/G, F#m, Bb7sus4

### Special Markers
- `N.C` / `NC` - No chord
- `%` - Repeat
- `|` - Measure separator
- `4/4`, `3/4` - Time signatures

---

## 🔧 Configuration Locations

### Port
`src/shared/config/index.ts` → `PORT: 8081`

### Password
`src/shared/config/index.ts` → `ADMIN_PASSWORD: 'Ab=G#'`

### Window Size
`src/server/main.ts` → `createWindow()` → `width/height`

### Database Location
`resources/db.sqlite` (packaged with Electron app)

---

## 📝 Path Aliases

```typescript
@shared/*  // src/shared/* (available in client & server)
@/*        // src/client/* (when in client context)
@/*        // src/* (when in server context)
```

**Usage**:
```typescript
import { myEndpoint } from '@shared/endpoints/myEndpoint'
import { useStore } from '@/store'  // client
```

---

## 🎨 UI Component Library

Based on **shadcn/ui** (Radix UI primitives + TailwindCSS)

**Location**: `src/client/components/ui/`

**Common components**:
- Button, Dialog, Popover, Switch
- Input, Label, Checkbox
- Toast (notifications)
- Tabs, Navigation Menu

---

## 🎹 Keyboard Shortcuts

```typescript
// Using the hook
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'

useKeyboardShortcut(
  { key: 'p', ctrl: true },
  () => { /* action */ }
)
```

**Built-in shortcuts** (see `src/client/lib/useSongKeyboardShortcuts.ts`):
- `Space` - Start/stop scroll
- `+/-` - Scroll speed
- `Home/End` - Jump to top/bottom
- `[/]` - Previous/next section
- `Cmd+K` - Command menu
- `Cmd+P` - Search songs

---

## 🧪 No Tests Yet

Test suite not configured. Recommended setup:
- **Unit tests**: Vitest
- **E2E tests**: Playwright
- **Component tests**: React Testing Library

---

## 📚 Full Documentation

- **[README.md](README.md)** - Original project README with design decisions
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Comprehensive architecture guide
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** - Development workflows
- **[SONG_FORMAT.md](SONG_FORMAT.md)** - Song file format specification

---

## 💡 Quick Mental Model

**Think of it as:**
- Electron app = Host/Admin interface
- Express server = API + WebSocket hub
- React client = Universal UI (works in Electron & browsers)
- Shared folder = Type-safe contract between client/server
- SQLite = State persistence
- Song files = Content library

**Key insight:** Same React app runs in Electron (admin) AND browsers (guests), differentiated only by user type in state.

---

## 🔍 Finding Things

### "Where is X implemented?"

**Song parsing:** `src/shared/lib/song/song.ts`
**Transposition:** `src/shared/lib/transpose/`
**Scroll logic:** `src/client/lib/useSongScroll.ts`
**Auto-scroll:** `src/client/lib/useAutoScroller.ts`
**Database queries:** `src/shared/db/` (various files)
**API endpoints:** `src/shared/endpoints/`
**Socket messages:** `src/shared/messages/`
**Session management:** `src/shared/lib/session/`
**Song display:** `src/client/components/SongComponents/`

### "How do I...?"

**Change what gets rendered?** → Start at `src/client/components/SongComponents/SongComponent.tsx`

**Modify API?** → Find/create endpoint in `src/shared/endpoints/`

**Add real-time sync?** → Create message in `src/shared/messages/`

**Persist data?** → Add/query tables in `src/shared/db/`

**Update UI state?** → Use `dispatch()` from `src/client/store.tsx`

**Change server behavior?** → Check `src/server/server.ts` and `src/shared/`

---

## ⚡ Performance Notes

- **File watching**: Efficient change detection on song files
- **Socket compression**: Enabled
- **Code splitting**: Vite handles automatically
- **SQLite**: Indexed queries, single writer (fine for use case)
- **Build**: Fast (esbuild for server, Vite for client)

---

## 🎯 Design Philosophy

1. **Type safety everywhere**: TypeScript + shared types = no runtime surprises
2. **Simple over clever**: Context API over Redux, SQLite over complex DB
3. **Local-first**: No cloud dependencies, works offline
4. **Plain text songs**: Easy to create, edit, version control
5. **Multi-device native**: Built for laptop admin + mobile guests from day one

---

## 📖 Version History

**Current**: v2.6.1
- Download logs by sessions
- Updated chord background colors
- Improved chord parsing

**Recent**: v2.6.0
- [Check git log for details]

---

**Last Updated**: 2025-10-26
**Maintained by**: Francois Roland
