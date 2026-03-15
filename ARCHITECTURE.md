# HappiKaraoke v2 - Architecture Documentation

## Overview

HappiKaraoke v2 is an Electron-based desktop application for hosting live karaoke sessions. The app runs on a host machine (laptop), spins up a local web server, and allows other devices on the network to connect and view synchronized lyrics and chords in real-time.

**Version:** 2.6.1
**Author:** Francois Roland

## Core Concepts

### Multi-Device Karaoke System

- **Host/Admin**: Runs the Electron app on a laptop, controls song selection, transposition, and scroll
- **Guests**: Connect via browser to view synchronized content (mobile, tablet, other computers)
- **Real-time Sync**: All connected devices see the same song, chords, and scroll position
- **Network-Local**: Server exposed on local network (no internet required)

### Key Features

- Song library management (plain text files with structured format)
- Real-time chord transposition
- Auto-scroll with speed control
- Queue management for song requests
- Session history and statistics
- QR code for easy guest connection
- Dark/light theme support
- Guitarist/Drummer specialized modes

---

## Technology Stack

### Frontend (Client)

- **Framework**: React 19 with TypeScript 5.4.5
- **Routing**: React Router v6
- **Styling**: TailwindCSS with Radix UI components (shadcn/ui)
- **Build Tool**: Vite (dev server + bundler)
- **Real-time**: Socket.io-client
- **State Management**: React Context API

### Backend (Server)

- **Runtime**: Node.js 20+ (Electron 33.4.x)
- **Web Server**: Express.js
- **Real-time**: Socket.io
- **Database**: SQLite 3 (better-sqlite3)
- **ORM**: Drizzle ORM
- **Build Tool**: esbuild

### Desktop Integration

- **Framework**: Electron 33.4.x
- **Packaging**: electron-builder
- **Platforms**: Windows (NSIS), macOS (DMG), Linux (AppImage/snap/deb)

---

## Project Structure

```
karaoke/
├── src/
│   ├── client/                 # React frontend application
│   │   ├── components/         # UI components
│   │   │   ├── Menu/           # Header, controls, command menu
│   │   │   ├── Queue/          # Queue management panel
│   │   │   ├── Screen/         # Screen wrapper with loader
│   │   │   ├── Settings/       # Settings panel, QR code, transpose
│   │   │   └── SongComponents/ # Song display components
│   │   ├── lib/                # Client-side hooks and utilities
│   │   ├── pages/              # Route pages (Login, Session)
│   │   ├── store.tsx           # Global state management
│   │   ├── main.tsx            # React entry point
│   │   └── index.html          # HTML template
│   │
│   ├── server/                 # Electron main process
│   │   ├── main.ts             # Electron app initialization
│   │   ├── preload.ts          # Preload script (context bridge)
│   │   └── server.ts           # Express server setup
│   │
│   └── shared/                 # Shared code (server + client)
│       ├── config/             # Configuration constants
│       ├── db/                 # Database schema and queries
│       ├── endpoints/          # REST API definitions
│       ├── messages/           # Socket.io message definitions
│       ├── lib/                # Shared utilities
│       │   ├── song/           # Song parsing and chord logic
│       │   ├── transpose/      # Transposition algorithms
│       │   ├── session/        # Session management
│       │   ├── data/           # Data access and file watching
│       │   └── search/         # Search/filter utilities
│       ├── server/             # Server-specific shared code
│       │   ├── express.ts      # Express app instance
│       │   ├── socket.ts       # Socket.io server instance
│       │   └── socketEmitter.ts # Event emitter proxy
│       └── types/              # Shared TypeScript types
│
├── resources/                  # Electron resources
│   └── db.sqlite               # SQLite database
│
├── build/                      # Electron build resources (icons, etc.)
├── drizzle/                    # Database migrations
├── dist/                       # Final build output
├── out/                        # Intermediate build output
│   ├── client/                 # Built React app
│   └── server/                 # Built Electron main/preload
│
├── vite.config.ts              # Vite configuration
├── esbuild.config.ts           # esbuild production config
├── esbuild.dev.config.ts       # esbuild dev config with watch
├── electron-builder.yml        # Electron packaging config
├── tsconfig.json               # TypeScript project references
├── tsconfig.node.json          # Server TypeScript config
└── tsconfig.web.json           # Client TypeScript config
```

---

## Architecture Overview

### Scroll Sync Overview

The scroll engine is split into three layers:

1. **Admin controls (client-only)**
   - Implemented in `src/client/lib/useSongKeyboardShortcuts.ts`.
   - Maps keyboard events (space, arrows, `$`, section jumps) to:
     - Local calls on the auto-scroller (`useAutoScroller`).
     - Typed HTTP calls to `/scroll` via `setScroll` (`@shared/endpoints/scroll`).

2. **Server bridge (HTTP → WebSocket)**
   - `setScroll` in `src/shared/endpoints/scroll.ts` receives `{ type: ScrollEventType; value?: number }`.
   - Immediately broadcasts `scrollChanged` via `@shared/messages/scroll`.
   - No scroll state is stored server-side; the latest intent is pushed to all connected clients.

3. **Viewer synchronization (clients)**
   - `useSongScroll` (`src/client/lib/useSongScroll.ts`) subscribes to `scrollChanged`:
     - Non-master clients apply every event to `useAutoScroller` (remote POSITION and section jumps use instant scroll, not smooth, to avoid lag).
     - The scroll master ignores inbound scroll events and publishes **throttled** `POSITION` updates while scrolling; `value` is a **content-relative fraction** (0–1) so all viewports stay aligned.
   - `useAutoScroller` (`src/client/lib/useAutoScroller.ts`) uses `requestAnimationFrame` to advance `scrollTop` during auto-scroll and moves between song sections; `useSongSections` provides section offsets and fallbacks for songs without section headers (page-style next/prev).

This structure helps maintain **admin responsiveness** (local scroll updates happen immediately) while keeping all viewers synchronized via a single, typed scroll event channel. See [`INVARIANTS.md`](./INVARIANTS.md) for concrete test procedures around scroll sync and admin responsiveness.

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Host Machine (Laptop)                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Electron Application                    │    │
│  │                                                       │    │
│  │  ┌──────────────┐         ┌────────────────────┐    │    │
│  │  │ Main Process │         │ Renderer Process   │    │    │
│  │  │  (Node.js)   │◄────────┤  (React + Vite)   │    │    │
│  │  │              │  IPC    │                    │    │    │
│  │  │  - main.ts   │         │  - Admin UI        │    │    │
│  │  │  - server.ts │         │  - Song Display    │    │    │
│  │  └───────┬──────┘         └────────────────────┘    │    │
│  │          │                                           │    │
│  │          │ Starts                                    │    │
│  │          ▼                                           │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │         Express Server (Port 8081)           │   │    │
│  │  │                                               │   │    │
│  │  │  ┌───────────────┐    ┌──────────────────┐  │   │    │
│  │  │  │  HTTP Routes  │    │   Socket.io      │  │   │    │
│  │  │  │  (REST API)   │    │   (WebSocket)    │  │   │    │
│  │  │  └───────────────┘    └──────────────────┘  │   │    │
│  │  │           │                     │            │   │    │
│  │  │           ▼                     ▼            │   │    │
│  │  │  ┌───────────────────────────────────────┐  │   │    │
│  │  │  │         Business Logic                │  │   │    │
│  │  │  │  - Song parsing                       │  │   │    │
│  │  │  │  - Session management                 │  │   │    │
│  │  │  │  - Database queries                   │  │   │    │
│  │  │  └───────────────────────────────────────┘  │   │    │
│  │  │           │                                  │   │    │
│  │  │           ▼                                  │   │    │
│  │  │  ┌───────────────────────────────────────┐  │   │    │
│  │  │  │      SQLite Database                  │  │   │    │
│  │  │  │  - Session config                     │  │   │    │
│  │  │  │  - Users                              │  │   │    │
│  │  │  │  - Queue                              │  │   │    │
│  │  │  │  - Session logs                       │  │   │    │
│  │  │  └───────────────────────────────────────┘  │   │    │
│  │  │           │                                  │   │    │
│  │  │           ▼                                  │   │    │
│  │  │  ┌───────────────────────────────────────┐  │   │    │
│  │  │  │    File System (Song Library)         │  │   │    │
│  │  │  │  ~/Music/Karaoke/*.txt                │  │   │    │
│  │  │  └───────────────────────────────────────┘  │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  └────────────────┬──────────────────────────────────┘     │
│                   │ Exposed on LAN                         │
└───────────────────┼────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │  Local Network        │
        │  (http://192.168.x.x:8081)
        └───────────┬───────────┘
                    │
        ┌───────────┴───────────┬──────────────┐
        │                       │              │
        ▼                       ▼              ▼
┌──────────────┐      ┌──────────────┐  ┌──────────────┐
│  Guest       │      │  Guest       │  │  Guest       │
│  (Mobile)    │      │  (Tablet)    │  │  (Laptop)    │
│              │      │              │  │              │
│  Browser     │      │  Browser     │  │  Browser     │
│  + Socket.io │      │  + Socket.io │  │  + Socket.io │
└──────────────┘      └──────────────┘  └──────────────┘
```

### Communication Flow

#### 1. Initial Connection

```
Guest Device
  │
  ├─► Scans QR code or enters URL
  │
  ├─► HTTP GET http://{host_ip}:8081/join
  │
  └─► Server responds with React app (SPA)
      │
      └─► Browser loads JavaScript bundle
          │
          ├─► Socket.io connects to ws://{host_ip}:8081
          │
          └─► User joins session (POST /join)
              │
              └─► Stored in database as Guest user
```

#### 2. Song Display Synchronization

```
Admin (Electron App)
  │
  ├─► Selects new song
  │
  ├─► POST /set-song { filename: "Song Title" }
  │
  └─► Server
      │
      ├─► Updates session config in DB
      │
      ├─► Emits Socket.io event: song:changed { title: "Song Title" }
      │
      └─► All connected clients (including admin)
          │
          ├─► Receive song:changed message
          │
          ├─► Update local state (dispatch({ currentSong: "Song Title" }))
          │
          ├─► Fetch song data (GET /song?filename=Song%20Title)
          │
          └─► Render new song with lyrics and chords
```

#### 3. Scroll Synchronization

```
Admin (Electron App)
  │
  ├─► Scrolls song or clicks scroll control
  │
  ├─► POST /scroll { type: "POSITION", value: 1234 }
  │
  └─► Server
      │
      ├─► Stores scroll event
      │
      ├─► Emits Socket.io event: scroll:changed { type: "POSITION", value: 1234 }
      │
      └─► Guest clients only (admin ignores)
          │
          ├─► Receive scroll:changed message
          │
          ├─► useSongScroll hook handles event
          │
          └─► Instant scroll to position (fraction-based)
```

#### 4. Transposition

```
Admin
  │
  ├─► Changes transposition (e.g., +2 semitones)
  │
  ├─► POST /set-transpo { transpo: 2 }
  │
  └─► Server
      │
      ├─► Updates session config in DB
      │
      ├─► Emits Socket.io event: transpo:changed { transpo: 2 }
      │
      └─► All clients
          │
          ├─► Receive transpo:changed message
          │
          ├─► Update store (dispatch({ transpo: 2 }))
          │
          └─► Re-render chords with new transposition
```

---

## Core Components

### 1. Entry Points

#### Electron Main Process (`src/server/main.ts`)

```typescript
// Initializes Electron app
// Creates BrowserWindow (820x1120 - iPad Air dimensions)
// Loads React app from http://localhost:8081
// Sets up IPC handlers for file dialogs
```

**Key responsibilities:**
- App lifecycle management
- Window creation and configuration
- IPC communication between renderer and main process
- Native file system access (song folder selection)

#### Express Server (`src/server/server.ts`)

```typescript
// Initializes Express app with Socket.io
// Registers endpoints and messages
// Sets up Vite dev server (dev mode) or static file serving (production)
// Watches song folder for changes
```

**Key responsibilities:**
- HTTP server initialization
- Middleware configuration
- Endpoint registration
- Socket.io setup
- File system watching

#### React Client (`src/client/main.tsx`)

```typescript
// Renders React app with Router
// Wraps app in StoreProvider for global state
// Initializes Socket.io client connection
```

**Key responsibilities:**
- React app initialization
- Routing setup
- Global state provider
- Socket.io client connection

### 2. State Management

#### Global Store (`src/client/store.tsx`)

Uses React Context API with reducer pattern:

```typescript
interface Store {
  currentSong?: string | null       // Currently displayed song
  isAdmin?: boolean                 // User type
  songKey?: string                  // Original song key
  chordsEnabled: boolean            // Show/hide chords toggle
  transpo: number                   // Current transposition
  transpoOpen: boolean              // Transpose panel open/closed
  songsFolder?: string              // Path to songs directory
  songsFolderOpen: boolean          // Songs folder panel open/closed
  hostUrl: string                   // Server URL for QR code
  searchOpen: boolean               // Search modal open/closed
  suggestionOpen: boolean           // Suggestion modal open/closed
  qrCodeOpen: boolean               // QR code modal open/closed
  settingsOpen: boolean             // Settings panel open/closed
  guitaristMode: boolean            // Guitarist view mode
  drummerMode: boolean              // Drummer view mode
  musicienScroll: boolean           // Musician scroll mode
}
```

**Update pattern:**
```typescript
const dispatch = useDispatch()
dispatch({ currentSong: "New Song" })
```

### 3. Database Schema

Located in `src/shared/db/schema.ts`:

#### Config Table
Stores application configuration (key-value pairs)

```sql
CREATE TABLE config (
  id INTEGER PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT
)
```

**Example entries:**
- `current_song`: Current song filename
- `transpo`: Current transposition value
- `songs_folder`: Path to songs directory
- `host_url`: Server URL

#### User Table
Tracks connected users in current session

```sql
CREATE TABLE user (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'admin' | 'guest'
  sessionId INTEGER REFERENCES session(id)
)
```

#### Session Table
Represents a karaoke session

```sql
CREATE TABLE session (
  id INTEGER PRIMARY KEY,
  sessionDate TEXT NOT NULL,  -- ISO 8601 timestamp
  closed INTEGER NOT NULL      -- 0 = active, 1 = closed
)
```

#### Session Log Table
Records song play history

```sql
CREATE TABLE session_log (
  id INTEGER PRIMARY KEY,
  song TEXT NOT NULL,
  username TEXT,
  timestamp TEXT NOT NULL,  -- ISO 8601 timestamp
  sessionId INTEGER REFERENCES session(id)
)
```

#### Queue Table
Manages song request queue

```sql
CREATE TABLE queue (
  id INTEGER PRIMARY KEY,
  song TEXT NOT NULL,
  order INTEGER NOT NULL,
  userId INTEGER REFERENCES user(id),
  sessionId INTEGER REFERENCES session(id),
  UNIQUE(order, sessionId)
)
```

### 4. Song Parsing System

#### Song File Format

Located in user-specified folder (e.g., `~/Music/Karaoke/`)

**File structure** (`.txt` files):
```
Song Title
Artist Name
G
tags space separated
[blank line]
[Section Header]
Chord line (detected automatically)
Lyrics line
Chord line
Lyrics line
[blank line = break]
...
```

#### Parser Logic (`src/shared/lib/song/song.ts`)

**Song class:**
```typescript
class Song {
  filename: string
  rawContent?: string
  songData?: SongData

  load() {
    // Reads file from songs folder
    // Parses header (title, author, key, tags)
    // Parses lines (chords, lyrics, sections)
    return this.songData
  }

  private parseLines(lines: string[], title: string): SongLine[]
  private isChordLine(line: string): boolean
}
```

**Line type detection:**
- **Section**: Starts with `#` or `[`
- **Chord line**: All words match chord regex or separators
- **Lyrics**: Everything else
- **Break**: Empty line (rendered as `(...)`)
- **Spacer**: Break after chord line (adds vertical space)

**Chord regex patterns:**
```typescript
// Matches: C, C#, Cm, Cmaj7, C/G, etc.
CHORD_REGEX = /^[ABCDEFG](?:#|##|b|bb)?(?:maj|min|m|sus|aug|dim|add)?[0-9]*/

// Special markers:
// N.C (no chord)
// % (repeat)
// | (measure separator)
// Time signatures: 4/4, 3/4, 6/8, etc.
```

#### Chord Transposition (`src/shared/lib/transpose/`)

**Chord class:**
```typescript
class Chord {
  root: string          // e.g., "C"
  extension: string     // e.g., "maj7"
  bass: string          // e.g., "G" in C/G

  transpose(semitones: number): Chord
  toString(): string
}
```

**Transposition logic:**
- 12-note chromatic scale: `C, C#/Db, D, D#/Eb, E, F, F#/Gb, G, G#/Ab, A, A#/Bb, B`
- Shifts root and bass notes by semitones
- Preserves extensions (maj7, sus4, etc.)
- Respects preferred accidentals (sharps vs flats based on key)

---

## API Reference

### REST Endpoints

All endpoints defined in `src/shared/endpoints/`

#### Authentication & Session

**POST /login**
```typescript
Request: { password: string }
Response: { user: User }
```

**POST /join**
```typescript
Request: { name: string }
Response: { user: User }
```

**GET /user**
```typescript
Query: { id: string }
Response: { user: User }
```

**GET /fetch-session**
```typescript
Response: { config: SessionConfig }
```

#### Song Management

**GET /song**
```typescript
Query: { filename: string, transpo?: number }
Response: { song: SongData }
```

**GET /songs**
```typescript
Response: { songs: string[] }
```

**POST /set-song** (Admin only)
```typescript
Request: { filename: string }
Response: { success: boolean }
```

**POST /set-transpo** (Admin only)
```typescript
Request: { transpo: number }  // -12 to +12
Response: { success: boolean }
```

**POST /set-songs-folder** (Admin only)
```typescript
Request: { folder: string }
Response: { success: boolean }
```

#### Scroll Control

**POST /scroll** (Admin only)
```typescript
Request: {
  type: ScrollEventType,
  value?: number
}
Response: { success: boolean }

// ScrollEventType enum:
// 'START' | 'STOP' | 'TOGGLE' | 'FASTER' | 'SLOWER' |
// 'TOP' | 'POSITION' | 'NEXT_SECTION' | 'PREVIOUS_SECTION'
```

#### Queue Management

**GET /queue**
```typescript
Response: { queue: QueueItem[] }
```

**POST /queue/add**
```typescript
Request: { song: string, userId?: string }
Response: { success: boolean }
```

**POST /queue/remove**
```typescript
Request: { id: number }
Response: { success: boolean }
```

**POST /queue/reorder**
```typescript
Request: { id: number, newOrder: number }
Response: { success: boolean }
```

**POST /queue/clear**
```typescript
Response: { success: boolean }
```

#### Statistics

**GET /csv**
```typescript
Query: { sessionId?: number, date?: string }
Response: CSV file download
```

### Socket.io Messages

All messages defined in `src/shared/messages/`

#### song:changed
```typescript
Payload: { title: string }
Direction: Server → All Clients
Trigger: Admin changes song
```

#### transpo:changed
```typescript
Payload: { transpo: number }
Direction: Server → All Clients
Trigger: Admin changes transposition
```

#### scroll:changed
```typescript
Payload: { type: ScrollEventType, value?: number }
Direction: Server → Guest Clients
Trigger: Admin scrolls or uses scroll controls
```

#### song-file:changed
```typescript
Payload: { filename: string }
Direction: Server → All Clients
Trigger: Song file modified on disk
```

#### queue:changed
```typescript
Payload: {}
Direction: Server → All Clients
Trigger: Queue modified (add/remove/reorder)
```

---

## Build System

### Development Mode

**Command:** `npm run dev`

**Process:**
1. esbuild watches `src/server/` files
2. Rebuilds on changes
3. Custom plugin spawns Electron process
4. Electron loads Express server
5. Express uses Vite dev middleware
6. Vite provides HMR for client code

**Hot Module Replacement:**
- Client changes → instant HMR via Vite
- Server changes → Electron restart (automatic)

### Production Build

**Command:** `npm run build`

**Pipeline:**
1. Clean output (`rimraf out`)
2. Copy CHEATSHEET.md to README.TXT
3. Rebuild SQLite for Electron
4. Build client: `vite build` → `out/client/`
5. Build server: `esbuild` → `out/server/main.js` & `preload.js`
6. Package Electron: `electron-builder` → `dist/`

**Output structure:**
```
out/
├── client/           # Static React build
│   ├── index.html
│   └── assets/
└── server/
    ├── main.js       # Electron main process
    └── preload.js    # Preload script
```

### Electron Packaging

**Config:** `electron-builder.yml`

**Supported platforms:**
- **Windows**: NSIS installer
- **macOS**: DMG
- **Linux**: AppImage, snap, deb

**Bundled resources:**
- SQLite database (`resources/db.sqlite`)
- Built client app
- Node.js runtime (via Electron)

---

## Security Considerations

### Current Implementation

1. **Admin Password**: Hardcoded in `src/shared/config/index.ts` as `'Ab=G#'`
   - **Risk**: Anyone with code access knows password
   - **Recommendation**: Use environment variables

2. **Node Integration**: Enabled in Electron renderer
   - **Risk**: XSS could lead to RCE
   - **Mitigation**: Only loads local content (not external websites)

3. **Context Bridge**: Limited API exposure via preload script
   - **Good**: Only `window.electron.openDialog()` exposed
   - **Security**: Prevents arbitrary Node.js access from renderer

4. **Local Network Only**: No internet exposure
   - **Good**: Reduces attack surface
   - **Limitation**: Requires LAN access

### Recommendations

1. Move admin password to environment variable or secure config
2. Implement session tokens instead of localStorage user IDs
3. Add rate limiting to prevent brute force
4. Consider disabling nodeIntegration if not needed
5. Add CSP headers (already partially implemented)

---

## Performance Optimizations

### Client-Side

1. **Code Splitting**: Vite bundles with tree-shaking
2. **React Memoization**: Components use React.memo where appropriate
3. **Socket.io Reconnection**: Automatic reconnection on disconnect
4. **Lazy Loading**: Routes and components loaded on demand

### Server-Side

1. **File System Watching**: Efficient change detection for song files
2. **SQLite Queries**: Indexed database queries
3. **Static Assets**: Served directly by Express (no processing)
4. **esbuild Bundling**: Fast builds with minimal overhead

### Network

1. **WebSocket Compression**: Socket.io compression enabled
2. **Local Network**: No internet latency
3. **Minimal Payloads**: Only send changed data

---

## Deployment

### Development

```bash
npm install
npm run install:deps:web    # For dev server
npm run dev                  # Start dev mode
```

### Production Build

```bash
npm install
npm run build                # Full build + packaging
```

**Artifacts:**
- `dist/HappiKaraoke-{version}.dmg` (macOS)
- `dist/HappiKaraoke-{version}.exe` (Windows)
- `dist/HappiKaraoke-{version}.AppImage` (Linux)

### Distribution

1. Run build on each target platform
2. Distribute installer files
3. Users install and run
4. Songs must be added to configured folder

---

## Known Limitations

1. **Single Session**: Only one active session at a time
2. **Local Network**: No remote access over internet
3. **Plain Text Songs**: No support for MusicXML or other formats
4. **No Audio Playback**: Lyrics/chords only (no instrumental tracks)
5. **Admin Password**: Hardcoded (see Security section)
6. **SQLite Concurrency**: Single writer (not an issue for this use case)

---

## Future Considerations

1. **Cloud Sync**: Optional song library sync via cloud storage
2. **Multi-Session**: Support multiple concurrent sessions
3. **Audio Integration**: Background track playback
4. **Mobile Apps**: Native iOS/Android apps instead of web
5. **MIDI Support**: Chord-to-MIDI conversion for instruments
6. **Setlist Management**: Pre-arranged song sequences
7. **User Accounts**: Guest profiles with song request history

---

## Glossary

- **Admin**: Host user running the Electron app with full control
- **Guest**: Connected user viewing synchronized content
- **Session**: A single karaoke event with start/end time
- **Queue**: List of requested songs waiting to be played
- **Transposition**: Shifting song key by semitones
- **Chord**: Musical notation (e.g., `Cmaj7`, `G/B`)
- **Section**: Song part marker (e.g., `[Verse]`, `# Chorus`)
- **Socket.io**: WebSocket library for real-time communication
- **Electron**: Framework for building desktop apps with web technologies
- **Vite**: Frontend build tool with fast dev server
