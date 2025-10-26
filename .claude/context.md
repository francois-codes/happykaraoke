# HappiKaraoke v2 - Context Summary

> Quick context loading for Claude Code sessions

## 🎯 What This Repo Is

**Multi-device karaoke app:** Electron app on laptop → Express server on LAN → Guests join via browser → Real-time sync via Socket.io

**Version:** 2.6.1
**Tech:** Electron 30 + React 18 + Express + Socket.io + SQLite + TypeScript
**Pattern:** Shared TypeScript code for type-safe client-server contracts

---

## 📁 Essential Files

**Must-read for any session:**
- `.claude/rules.md` - How to work with this codebase
- `QUICK_REFERENCE.md` - Fast lookups, common tasks, file locations

**Deep understanding:**
- `ARCHITECTURE.md` - Complete system design
- `DEVELOPER_GUIDE.md` - Development workflows

**Specific domains:**
- `SONG_FORMAT.md` - Song file format

---

## 🎬 Quick Start Understanding

### The App in 3 Sentences
1. Admin runs Electron app that starts Express server on local network
2. Admin + guests all run same React app (Electron window vs browser)
3. Admin controls song/scroll/transposition → Server broadcasts via Socket.io → All clients sync

### Key Directories
```
src/
├── client/    # React app (runs in Electron + browsers)
├── server/    # Electron main process + Express setup
└── shared/    # Type-safe API contracts (endpoints + messages)
```

### Shared Code Pattern (Most Important!)
```typescript
// Define once in @shared/endpoints/
export const myEndpoint = createEndpoint<Request, Response>({...})

// Auto-registered on server
// Called type-safely from client:
const response = await myEndpoint.call(data)
```

---

## 🔑 Critical Info

**Login:** Admin password = `Ab=G#` (hardcoded in `src/shared/config/index.ts`)
**Port:** 8081
**Songs:** User-specified folder, `.txt` format
**Database:** `resources/db.sqlite` (SQLite + Drizzle ORM)

**SQLite Gotcha:** Binary must match environment
- `npm run install:deps:electron` - For Electron/building
- `npm run install:deps:web` - For migrations/dev
- Mismatch = error, rebuild needed

---

## ⚠️ Special Considerations

### Scroll Handling (Complex!)
- Multiple screen sizes render differently
- Admin sends scroll, guests receive (not admin itself)
- Manual scroll overrides auto-scroll
- Pixel positions vary by device
- Files: `src/client/lib/useSongScroll.ts`, `src/client/lib/useAutoScroller.ts`

### Multi-Device Nature
- Every change affects admin (Electron) AND guests (browsers)
- Test scenarios: admin only, guest only, admin + guests
- Consider sync timing

### Type Safety is Law
- Shared code enables compile-time validation
- Never bypass types
- Run `npm run typecheck` before considering done

---

## 📋 Workflow Rules

**Before any code changes:**
1. Check `git status` - ask user to commit manual work
2. Consult documentation (QUICK_REFERENCE.md first)
3. Create plan with TodoWrite
4. Get approval
5. Implement step by step
6. Mark todos completed immediately

**When uncertain:**
- Ask questions
- Present options
- Reference documentation

**Keep it simple:**
- Use existing patterns
- Minimal changes
- Don't over-engineer

---

## 🎯 Common Tasks Fast Reference

### Add Endpoint
1. Create in `src/shared/endpoints/myEndpoint.ts` with `createEndpoint`
2. Export in `src/shared/endpoints/index.ts`
3. Call from client: `await myEndpoint.call(data)`

### Add Socket Message
1. Create in `src/shared/messages/myMessage.ts` with `createMessage`
2. Export in `src/shared/messages/index.ts`
3. Emit: `myMessage.server.emit(payload)`
4. Listen: `myMessage.client.useMessage(callback)`

### Update State
```typescript
import { useStore, useDispatch } from '@/store'
const store = useStore()
const dispatch = useDispatch()
dispatch({ key: value })
```

### Add Database Table
1. Define in `src/shared/db/schema.ts`
2. Run `npm run db:migration:generate`
3. Run `npm run db:migration:run`

---

## 🧠 Mental Models

### Data Flow
```
Admin action
  ↓
REST endpoint (POST)
  ↓
Update SQLite
  ↓
Socket.io broadcast
  ↓
All clients receive event
  ↓
Update local state
  ↓
UI re-renders
```

### Song Pipeline
```
.txt file
  ↓
Song.load() (src/shared/lib/song/song.ts)
  ↓
Parse lines (detect chords vs lyrics)
  ↓
Optional transpose (src/shared/lib/transpose/)
  ↓
Render (src/client/components/SongComponents/)
```

### User Types
- **Admin** (`user.type === 'admin'`): Full control, runs Electron
- **Guest** (`user.type === 'guest'`): Read-only, browser

---

## 📦 Tech Stack Summary

**Frontend:** React 18 + TypeScript + TailwindCSS + Vite + Radix UI
**Backend:** Node.js 20+ + Express + Socket.io
**Desktop:** Electron 30
**Database:** SQLite + Drizzle ORM
**Build:** esbuild (server) + Vite (client) + electron-builder

---

## 🔍 Finding Things

**Where is X?**
- Song parsing: `src/shared/lib/song/song.ts`
- Transposition: `src/shared/lib/transpose/`
- Scroll logic: `src/client/lib/useSongScroll.ts`
- Database: `src/shared/db/`
- API endpoints: `src/shared/endpoints/`
- Socket messages: `src/shared/messages/`
- Song display: `src/client/components/SongComponents/`

**How do I X?**
→ Check QUICK_REFERENCE.md "Common Tasks"
→ Check DEVELOPER_GUIDE.md for detailed workflows

---

## ⚡ Quick Commands

```bash
npm run dev                    # Development with hot-reload
npm run typecheck              # Type check (run before done)
npm run build                  # Full build
npm run install:deps:electron  # Rebuild SQLite for Electron
npm run install:deps:web       # Rebuild SQLite for dev/migrations
```

---

## 🐛 Common Issues

**SQLite binary error:** Rebuild with correct deps command
**Songs not loading:** Check folder path, .txt extension, format
**Vite not starting:** Check port 8081, clear cache
**Build failing:** Run typecheck, check imports

---

## 📚 Documentation Loading Strategy

**First session / New task:**
1. Read `.claude/rules.md` (this is how to work here)
2. Scan `QUICK_REFERENCE.md` (fast lookups)
3. Read relevant section in `ARCHITECTURE.md` or `DEVELOPER_GUIDE.md`

**During work:**
- Reference `QUICK_REFERENCE.md` for patterns
- Grep/Read actual code for current implementation
- Ask user if unsure

---

## 🎯 Session Checklist

**Starting:**
- [ ] Loaded `.claude/rules.md` and `.claude/context.md`
- [ ] Understand user's goal
- [ ] Check `git status` for uncommitted work
- [ ] Consult relevant docs

**Working:**
- [ ] Made plan with TodoWrite
- [ ] Got approval
- [ ] Following existing patterns
- [ ] Marking todos as completed

**Ending:**
- [ ] Summarize changes
- [ ] Note what to test
- [ ] Mention any follow-ups

---

## 🎨 Code Style Quick Reference

- **Interfaces** over types
- **Functional components** only
- **Explicit return types** for public functions
- **Path aliases:** `@shared/*`, `@/*`
- **No `any`** types
- **PascalCase** for components
- **camelCase** for functions/variables

---

## 🔒 Architecture Constraints

**Can't change:**
- Client/server import boundaries
- Shared code pattern (it's the whole point)
- Type safety requirements
- Multi-device nature

**Can extend:**
- Endpoints (follow pattern)
- Socket messages (follow pattern)
- UI components (TailwindCSS + Radix)
- Database tables (with migrations)

**Don't add:**
- New state management libraries
- New build tools
- New styling frameworks
- Breaking changes to shared types

---

## 🎓 Design Philosophy

1. **Type safety everywhere** - Shared types prevent runtime errors
2. **Simple over clever** - Context API > Redux, SQLite > complex DB
3. **Local-first** - No cloud, works offline
4. **Plain text songs** - Easy to create, edit, version control
5. **Multi-device native** - Built for laptop admin + mobile guests

---

## 📊 Current State

**Version:** 2.6.1 (2025-10-26)
**Last commit:** 024be4c
**Status:** Working, actively maintained
**Recent focus:** Session logs, chord display, parsing improvements

---

**Next time you start a session on this repo:**
1. Read this file (`.claude/context.md`)
2. Read the rules file (`.claude/rules.md`)
3. You're ready to work efficiently!

---

**Maintained by:** Francois Roland (francois.roland@gmail.com)
**Repo:** git@github.com:francois-codes/happi-karaoke-2.git
