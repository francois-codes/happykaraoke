# HappiKaraoke v2 - Developer Guide

## Getting Started

### Prerequisites

- **Node.js**: >= 20.0.0
- **npm**: Latest version
- **Git**: For version control
- **Platform-specific build tools**:
  - macOS: Xcode Command Line Tools
  - Windows: Visual Studio Build Tools
  - Linux: `build-essential`

### Installation

```bash
# Clone the repository
git clone git@github.com:francois-codes/happi-karaoke-2.git
cd happi-karaoke-2

# Install dependencies
npm install

# Build SQLite for web/dev (Node.js runtime)
npm run install:deps:web
```

### Running in Development Mode

```bash
npm run dev
```

This command:
1. Starts esbuild in watch mode for server files
2. Launches Electron with hot-reload
3. Starts Vite dev server with HMR for client
4. Opens the app window at `http://localhost:8081`

**Login credentials:**
- Admin password: `Ab=G#` (hardcoded in `src/shared/config/index.ts`)

### Building for Production

```bash
# Full build (client + server + Electron packaging)
npm run build

# Individual build steps:
npm run build:client    # Build React app with Vite
npm run build:server    # Build Electron main/preload with esbuild
npm run build:electron  # Package with electron-builder
```

**Output:**
- `out/client/` - Built React app
- `out/server/` - Built Electron processes
- `dist/` - Platform-specific installers

---

## Project Architecture

### Shared Code Pattern

The project uses a **monorepo structure** with shared TypeScript types between client and server:

```
src/
├── client/    # React app (browser)
├── server/    # Electron main process (Node.js)
└── shared/    # Shared code (isomorphic)
```

**Benefits:**
- Type-safe API contracts
- DRY (Don't Repeat Yourself)
- Single source of truth for data models
- Compile-time validation of client-server communication

### TypeScript Configuration

Three separate configs for different contexts:

**1. `tsconfig.json`** (Root - project references)
```json
{
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

**2. `tsconfig.node.json`** (Server + Shared)
```json
{
  "include": ["src/server/**/*", "src/shared/**/*"],
  "compilerOptions": {
    "paths": {
      "@shared/*": ["./src/shared/*"],
      "@/*": ["./src/*"]
    }
  }
}
```

**3. `tsconfig.web.json`** (Client + Shared)
```json
{
  "include": ["src/client/**/*", "src/shared/**/*"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/client/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

---

## Development Workflow

### 1. Adding a New Endpoint

Endpoints are defined in `src/shared/endpoints/` using the `createEndpoint` pattern.

**Step 1: Define endpoint** (`src/shared/endpoints/myEndpoint.ts`)
```typescript
import { createEndpoint } from '../lib/endpoints/create'

interface MyRequestBody {
  param: string
}

interface MyResponseBody {
  result: string
}

export const myEndpoint = createEndpoint<MyRequestBody, MyResponseBody>({
  method: 'post',
  url: '/my-endpoint',
  handler: (req, res) => {
    const { param } = req.body

    // Business logic here
    const result = doSomething(param)

    res.json({ result })
  }
})
```

**Step 2: Export in index** (`src/shared/endpoints/index.ts`)
```typescript
import { myEndpoint } from './myEndpoint'

export const endpoints = [
  // ... existing endpoints
  myEndpoint
]
```

**Step 3: Call from client** (`src/client/components/MyComponent.tsx`)
```typescript
import { myEndpoint } from '@shared/endpoints/myEndpoint'

async function handleClick() {
  const response = await myEndpoint.call({ param: 'value' })
  console.log(response.result)
}
```

**Benefits:**
- Type safety: Request/response types enforced at compile time
- Single definition: No duplication between client and server
- Auto-registration: Endpoint automatically registered on server startup

### 2. Adding a Socket.io Message

Messages are defined in `src/shared/messages/` with separate client and server implementations.

**Step 1: Define message** (`src/shared/messages/myMessage.ts`)
```typescript
import { createMessage } from '../lib/messages/create'

interface MyMessagePayload {
  data: string
}

export const myMessage = createMessage<MyMessagePayload>({
  event: 'my:message',

  server: {
    emit: (payload: MyMessagePayload) => {
      // Emits to all connected clients
      socketEmitter.emit('socket:emit', {
        event: 'my:message',
        payload
      })
    }
  },

  client: {
    useMessage: (callback: (payload: MyMessagePayload) => void) => {
      // Hook that listens for this message
      const socket = useSocket()

      useEffect(() => {
        socket.on('my:message', callback)
        return () => socket.off('my:message', callback)
      }, [callback])
    }
  }
})
```

**Step 2: Export in index** (`src/shared/messages/index.ts`)
```typescript
import { myMessage } from './myMessage'

export const messages = [
  // ... existing messages
  myMessage
]
```

**Step 3: Use in server** (`src/shared/endpoints/someEndpoint.ts`)
```typescript
import { myMessage } from '@shared/messages/myMessage'

export const someEndpoint = createEndpoint({
  method: 'post',
  url: '/do-something',
  handler: (req, res) => {
    // Do something...

    // Broadcast to all clients
    myMessage.server.emit({ data: 'Hello clients!' })

    res.json({ success: true })
  }
})
```

**Step 4: Listen in client** (`src/client/components/MyComponent.tsx`)
```typescript
import { myMessage } from '@shared/messages/myMessage'

function MyComponent() {
  myMessage.client.useMessage((payload) => {
    console.log('Received:', payload.data)
  })

  return <div>Listening...</div>
}
```

### 3. Adding a Database Table

**Step 1: Define schema** (`src/shared/db/schema.ts`)
```typescript
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const myTable = sqliteTable('my_table', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull()
})
```

**Step 2: Generate migration**
```bash
npm run db:migration:generate
```

This creates a migration file in `drizzle/` directory.

**Step 3: Run migration**
```bash
npm run db:migration:run
```

**Step 4: Use in code** (`src/shared/db/queries.ts`)
```typescript
import { db } from './index'
import { myTable } from './schema'
import { eq } from 'drizzle-orm'

export function getMyRecord(id: number) {
  return db.select().from(myTable).where(eq(myTable.id, id)).get()
}

export function createMyRecord(name: string) {
  return db.insert(myTable).values({
    name,
    createdAt: new Date().toISOString()
  }).run()
}
```

### 4. Adding a Client Component

**Step 1: Create component** (`src/client/components/MyComponent/MyComponent.tsx`)
```typescript
import { useStore, useDispatch } from '@/store'

export function MyComponent() {
  const store = useStore()
  const dispatch = useDispatch()

  const handleClick = () => {
    dispatch({ currentSong: 'New Song' })
  }

  return (
    <div>
      <p>Current song: {store.currentSong}</p>
      <button onClick={handleClick}>Change Song</button>
    </div>
  )
}
```

**Step 2: Add to routing** (`src/client/App.tsx`)
```typescript
import { MyComponent } from '@/components/MyComponent/MyComponent'

function App() {
  return (
    <Routes>
      {/* ... existing routes */}
      <Route path="/my-page" element={<MyComponent />} />
    </Routes>
  )
}
```

### 5. Adding Global State

**Update store interface** (`src/client/store.tsx`)
```typescript
interface Store {
  // ... existing fields
  myNewField: string
}

const initialStore: Store = {
  // ... existing fields
  myNewField: 'default value'
}
```

**Use in components:**
```typescript
const store = useStore()
const dispatch = useDispatch()

// Read
console.log(store.myNewField)

// Write
dispatch({ myNewField: 'new value' })
```

---

## Code Style and Conventions

### TypeScript

- **Strict mode enabled**: No implicit any, null checks
- **Interface over type**: Use `interface` for object shapes
- **Explicit return types**: For public functions
- **Path aliases**:
  - `@shared/*` - Shared code
  - `@/*` - Client code (when in client context) or root (when in server context)

### React

- **Functional components**: No class components
- **Hooks**: Use custom hooks for reusable logic
- **TypeScript**: All components typed
- **File structure**: One component per file
- **Naming**: PascalCase for components, camelCase for functions

### Naming Conventions

- **Components**: `MyComponent.tsx`
- **Hooks**: `useMyHook.ts`
- **Utils**: `myUtil.ts`
- **Types**: `types.ts` or inline interfaces
- **Constants**: `UPPER_SNAKE_CASE`
- **Variables/Functions**: `camelCase`

### Imports

**Order:**
1. External libraries (React, etc.)
2. Shared code (`@shared/*`)
3. Internal code (`@/*`, `./`)
4. Types (if separate)
5. Styles (if any)

**Example:**
```typescript
import { useState, useEffect } from 'react'
import { songChanged } from '@shared/messages/songChanged'
import { useStore } from '@/store'
import { MyComponent } from './MyComponent'
import type { SongData } from '@shared/types'
```

---

## Testing

### Running Tests

Currently, the project does not have a test suite configured. Consider adding:

**Recommended setup:**
- **Unit tests**: Vitest (fast, Vite-native)
- **Integration tests**: Playwright (E2E)
- **Component tests**: React Testing Library

**Example setup:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Configuration** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/client/test/setup.ts']
  }
})
```

---

## Debugging

### Client-Side (React)

**Browser DevTools:**
1. Open Electron app
2. Press `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux)
3. Use Chrome DevTools as usual

**React DevTools:**
```bash
npm install -g react-devtools
react-devtools
```

Then in app, connect to standalone DevTools.

### Server-Side (Electron Main Process)

**Console Logging:**
```typescript
console.log('Debug:', value)
```

Logs appear in terminal where `npm run dev` is running.

**VS Code Debugger:**

**`.vscode/launch.json`:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "args": ["out/server/main.js"],
      "outputCapture": "std",
      "preLaunchTask": "npm: build:server"
    }
  ]
}
```

### Socket.io Debugging

**Enable debug logs:**

**Server** (`src/server/server.ts`):
```typescript
import { serverSocket } from '@shared/server/socket'

serverSocket.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.onAny((event, ...args) => {
    console.log('Received:', event, args)
  })
})
```

**Client** (`src/client/lib/socket.ts`):
```typescript
socket.onAny((event, ...args) => {
  console.log('Received:', event, args)
})
```

---

## Common Tasks

### Changing the Port

**Update** `src/shared/config/index.ts`:
```typescript
export const config = {
  PORT: 8081,  // Change to desired port
  // ...
}
```

### Changing Admin Password

**Update** `src/shared/config/index.ts`:
```typescript
export const config = {
  ADMIN_PASSWORD: 'your-new-password',
  // ...
}
```

**Recommendation:** Use environment variables:
```typescript
export const config = {
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'default-password',
  // ...
}
```

### Adding a Keyboard Shortcut

**Update** `src/client/lib/useSongKeyboardShortcuts.ts`:
```typescript
// Add new shortcut
useKeyboardShortcut(
  { key: 'n', ctrl: true },  // Ctrl+N
  () => {
    // Your action here
    console.log('Ctrl+N pressed')
  }
)
```

**Available modifiers:**
- `ctrl`: Control key
- `shift`: Shift key
- `alt`: Alt/Option key
- `meta`: Cmd (macOS) / Windows key

### Changing Window Size

**Update** `src/server/main.ts`:
```typescript
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 820,   // Change width
    height: 1120, // Change height
    // ...
  })
}
```

### Adding a New Song Field

Songs are parsed from plain text files. To add a new field:

**1. Update file format** (user-facing documentation)
**2. Update parser** (`src/shared/lib/song/song.ts`):
```typescript
load() {
  const file = this.loadSongFile()
  const [title, author, key, tags, myNewField, _, ...lines] = file?.toString().split(/\r?\n/) || []

  this.songData = {
    title,
    author,
    key,
    tags: tags.split(' '),
    myNewField,  // Add here
    lines: this.parseLines(lines, title),
    filename: this.filename
  }

  return this.songData
}
```

**3. Update type** (`src/shared/types/index.ts`):
```typescript
export interface SongData {
  title: string
  author: string
  key: string
  tags: string[]
  myNewField: string  // Add here
  lines: SongLine[]
  filename: string
}
```

---

## Troubleshooting

### SQLite Build Errors

**Problem:** `better-sqlite3` fails to build

**Solution:**
```bash
# For Electron
npm run install:deps:electron

# For web/dev
npm run install:deps:web
```

**If still failing:**
```bash
# Clear node_modules
rm -rf node_modules
npm install

# Rebuild native modules
npm run install:deps:electron
```

### Vite Dev Server Not Starting

**Problem:** Vite fails to start in dev mode

**Solution:**
1. Check port 8081 is not in use: `lsof -i :8081`
2. Kill process if needed: `kill -9 <PID>`
3. Clear Vite cache: `rm -rf node_modules/.vite`
4. Restart dev server: `npm run dev`

### Electron Window Not Loading

**Problem:** Electron window shows blank screen

**Solution:**
1. Check terminal for errors
2. Open DevTools: `Cmd+Option+I` (macOS)
3. Check if server is running: `curl http://localhost:8081`
4. Verify `out/server/main.js` exists
5. Rebuild: `npm run build:server`

### Hot Reload Not Working

**Problem:** Changes not reflecting in running app

**Client changes:**
- Vite HMR should be automatic
- Check browser console for HMR errors
- Hard refresh: `Cmd+Shift+R` (macOS)

**Server changes:**
- esbuild should trigger Electron restart
- If not, manually restart: `Ctrl+C` then `npm run dev`

### Songs Not Loading

**Problem:** Songs list is empty or songs fail to load

**Checklist:**
1. Verify songs folder path in settings
2. Check folder contains `.txt` files
3. Verify file format (see SONG_FORMAT.md)
4. Check file permissions (readable)
5. Look for errors in console

**Debug:**
```typescript
// src/shared/lib/data/songs.ts
console.log('Songs folder:', getSessionConfig().songsFolder)
console.log('Found files:', fs.readdirSync(getSessionConfig().songsFolder))
```

---

## Performance Tips

### Client Optimizations

1. **Memoize expensive components:**
```typescript
import { memo } from 'react'

export const MyComponent = memo(function MyComponent(props) {
  // Component logic
})
```

2. **Use useMemo for expensive computations:**
```typescript
const transposedChords = useMemo(
  () => transposeAllChords(song.lines, store.transpo),
  [song.lines, store.transpo]
)
```

3. **Debounce frequent updates:**
```typescript
import { debounce } from 'lodash'

const handleScroll = debounce((position) => {
  scrollEndpoint.call({ type: 'POSITION', value: position })
}, 300)
```

### Server Optimizations

1. **Batch database operations:**
```typescript
const stmt = db.prepare('INSERT INTO queue (song, order) VALUES (?, ?)')
const insertMany = db.transaction((items) => {
  for (const item of items) stmt.run(item.song, item.order)
})
insertMany(queueItems)
```

2. **Cache frequently accessed data:**
```typescript
let songsCache: string[] | null = null

export function getSongs() {
  if (!songsCache) {
    songsCache = fs.readdirSync(getSessionConfig().songsFolder)
      .filter(f => f.endsWith('.txt'))
  }
  return songsCache
}

// Invalidate on folder change
socketEmitter.on('folder:changed', () => {
  songsCache = null
})
```

---

## Contributing

### Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes with clear commit messages
3. Test locally: `npm run dev`
4. Run type checks: `npm run typecheck`
5. Build: `npm run build`
6. Create pull request

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(songs): add support for capo notation
fix(scroll): correct auto-scroll speed calculation
docs(api): update endpoint documentation
```

### Code Review Checklist

- [ ] Code follows style guide
- [ ] TypeScript types are correct
- [ ] No console.logs in production code
- [ ] Error handling implemented
- [ ] Comments for complex logic
- [ ] No security vulnerabilities
- [ ] Performance considered
- [ ] Tested locally

---

## Resources

### Documentation

- [Electron Docs](https://www.electronjs.org/docs/latest)
- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Socket.io Docs](https://socket.io/docs/v4/)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

### Tools

- [React DevTools](https://react.dev/learn/react-developer-tools)
- [VS Code](https://code.visualstudio.com)
- [Postman](https://www.postman.com) - API testing
- [DB Browser for SQLite](https://sqlitebrowser.org) - Database inspection

### Community

- GitHub Issues: [Report bugs or request features](https://github.com/francois-codes/happi-karaoke-2/issues)
- GitHub Discussions: Ask questions and share ideas

---

## Appendix: Build Configuration Details

### esbuild Configuration

**Base config** (`esbuild.base.config.ts`):
```typescript
export const baseConfig: BuildOptions = {
  bundle: true,
  platform: 'node',
  external: [...Object.keys(devDependencies), 'better-sqlite3'],
  loader: {
    '.svg': 'dataurl'
  }
}
```

**Dev config** (`esbuild.dev.config.ts`):
```typescript
const config: BuildOptions = {
  ...baseConfig,
  sourcemap: 'inline',
  plugins: [electronDevPlugin()]  // Auto-restart Electron
}
```

### Vite Configuration

**Key settings** (`vite.config.ts`):
```typescript
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills()  // Polyfills for Node.js APIs in browser
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/client'),
      '@shared': path.resolve(__dirname, './src/shared'),
      fs: 'memfs'  // In-memory filesystem for browser
    }
  },
  build: {
    outDir: 'out/client',
    emptyOutDir: true
  }
})
```

### electron-builder Configuration

**Key settings** (`electron-builder.yml`):
```yaml
appId: com.happikarake2.app
productName: HappiKaraoke
directories:
  output: dist
  buildResources: build
files:
  - out/**/*
  - resources/**/*
extraResources:
  - from: resources
    to: resources
    filter:
      - '**/*'
mac:
  category: public.app-category.entertainment
win:
  target: nsis
linux:
  target:
    - AppImage
    - snap
    - deb
```
