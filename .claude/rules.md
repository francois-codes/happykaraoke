# Claude Code Rules for HappiKaraoke v2

> Rules and context for working efficiently with this codebase

## 🎯 Core Principles

### 1. Always Consult Documentation First
- **QUICK_REFERENCE.md** - Fast lookups, common tasks, file locations
- **ARCHITECTURE.md** - System design, data flow, API reference
- **DEVELOPER_GUIDE.md** - Development workflows, troubleshooting
- **SONG_FORMAT.md** - Song file format specification
- **README.md** - Original design decisions and rationale

**Before making changes:** Check if the pattern already exists in docs

### 2. Plan Before Coding
- **Always** create a plan first with TodoWrite
- Present the plan and ask for refinement/approval
- Wait for confirmation before implementing
- Break complex tasks into clear, trackable steps

### 3. Check for Uncommitted Work
- **Before making any changes:** Check `git status`
- Ask user to commit manual changes first
- Prevents overwriting work that was done outside Claude
- Use `git diff` to review what changed

### 4. Keep It Simple
- Go for the simplest solution that works
- Avoid over-engineering
- Use existing patterns from the codebase
- Don't introduce new libraries unless necessary

### 5. Ask Questions When Uncertain
- If requirements are ambiguous, ask for clarification
- If multiple approaches exist, present options
- If something doesn't make sense, ask
- User can help fill in context

---

## ⚠️ Critical Considerations

### Scroll Handling is Complex
- Multiple screen sizes render content differently
- Different devices (laptop, tablet, phone) have different scroll behaviors
- Admin scroll control affects guests, not admin itself
- Manual scroll overrides auto-scroll
- Scroll position is in pixels, which varies by device height

**Key files:**
- `src/client/lib/useSongScroll.ts` - Guest scroll sync
- `src/client/lib/useAutoScroller.ts` - Auto-scroll logic
- `src/shared/endpoints/scroll.ts` - Scroll API

**Scroll event types:**
- `START`, `STOP`, `TOGGLE` - Auto-scroll control
- `FASTER`, `SLOWER` - Speed adjustment
- `POSITION` - Jump to pixel position
- `TOP` - Jump to beginning
- `NEXT_SECTION`, `PREVIOUS_SECTION` - Section navigation

**When working on scroll:**
- Test on multiple screen sizes
- Consider what happens when content height differs
- Remember admin sends scroll, guests receive it
- Verify both auto-scroll and manual scroll work correctly

### SQLite Binary Environment
- Two different Node.js versions (Electron vs Web)
- Must rebuild binary when switching contexts
- `npm run install:deps:electron` - For Electron/building
- `npm run install:deps:web` - For migrations/dev

**If you see SQLite errors:** Check if user needs to rebuild binary

### Type Safety is Critical
- Shared code pattern enables compile-time validation
- Never bypass TypeScript types
- If types are wrong, fix the type definitions
- Use `npm run typecheck` before considering changes complete

---

## 📐 Architecture Patterns to Follow

### Endpoint Pattern
```typescript
// src/shared/endpoints/myEndpoint.ts
export const myEndpoint = createEndpoint<ReqBody, ResBody>({
  method: 'post',
  url: '/endpoint',
  handler: (req, res) => {
    // Implementation
    res.json(response)
  }
})

// Export in src/shared/endpoints/index.ts
export const endpoints = [..., myEndpoint]

// Call from client
const response = await myEndpoint.call(payload)
```

### Socket Message Pattern
```typescript
// src/shared/messages/myMessage.ts
export const myMessage = createMessage<PayloadType>({
  event: 'my:event',
  server: {
    emit: (payload) => {
      socketEmitter.emit('socket:emit', { event: 'my:event', payload })
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

// Export in src/shared/messages/index.ts
export const messages = [..., myMessage]
```

### State Management Pattern
```typescript
// Global state
import { useStore, useDispatch } from '@/store'

const store = useStore()
const dispatch = useDispatch()

// Update
dispatch({ key: value })
```

**Don't introduce:** Redux, Zustand, or other state libraries unless explicitly requested

---

## 🚫 Common Pitfalls to Avoid

### 1. Don't Mix Client/Server Imports
- **Client** (`src/client/`) cannot import from **server** (`src/server/`)
- **Server** cannot import from **client**
- Both can import from **shared** (`src/shared/`)

### 2. Don't Break the Build
- Always run `npm run typecheck` mentally before suggesting changes
- Consider both client and server TypeScript configs
- Check if new dependencies need to be added to package.json

### 3. Don't Ignore Existing Patterns
- Check `src/shared/endpoints/` for endpoint examples
- Check `src/shared/messages/` for message examples
- Check `src/client/components/` for component patterns
- Follow existing naming conventions

### 4. Don't Forget Database Migrations
- Schema changes need migrations
- Use `npm run db:migration:generate`
- Existing data must be considered
- Test migrations before considering complete

### 5. Don't Overlook Multi-Device Nature
- Changes affect both admin (Electron) and guests (browsers)
- Test scenarios:
  - Admin only
  - Guest only
  - Admin + multiple guests
- Consider sync timing

---

## 📋 Pre-Change Checklist

Before making any code changes, verify:

- [ ] Checked `git status` for uncommitted work
- [ ] Consulted relevant documentation
- [ ] Created and got approval on plan
- [ ] Identified which pattern to follow (endpoint/message/component)
- [ ] Considered multi-device implications
- [ ] Thought about type safety
- [ ] Checked if SQLite binary context matters

---

## 🎨 Code Style Conventions

### TypeScript
- Explicit return types for public functions
- Interface over type for objects
- No `any` types (use `unknown` if needed)
- Path aliases: `@shared/*`, `@/*`

### React
- Functional components only
- Custom hooks for reusable logic
- `use` prefix for hooks
- PascalCase for components
- camelCase for functions/variables

### File Naming
- Components: `MyComponent.tsx`
- Hooks: `useMyHook.ts`
- Utils: `myUtil.ts`
- Constants: `UPPER_SNAKE_CASE` in code

### Import Order
1. External libraries (React, etc.)
2. Shared code (`@shared/*`)
3. Internal code (`@/*`, `./`)
4. Types
5. Styles

---

## 🔍 Investigation Strategy

When asked to add/modify a feature:

1. **Search for existing implementation**
   - Use Grep to find related code
   - Check if similar feature exists
   - Look for TODOs or comments

2. **Understand the data flow**
   - Where does data come from? (DB, file, API)
   - How is it transformed?
   - Where does it go? (UI, DB, broadcast)

3. **Identify affected components**
   - Client components
   - Server endpoints
   - Socket messages
   - Database tables
   - Shared utilities

4. **Create minimal plan**
   - List only necessary changes
   - Use existing patterns
   - Consider edge cases

5. **Ask for confirmation**
   - Present plan with TodoWrite
   - Explain trade-offs if multiple approaches
   - Wait for approval

---

## 🧠 Mental Model Reminders

### The App is Really...
- **One React app** served to Electron window (admin) and browsers (guests)
- **One Express server** handling REST + WebSocket
- **One SQLite database** for persistence
- **Shared TypeScript code** creating type-safe contracts

### User Types
- **Admin**: Runs Electron app, has full control (user.type === 'admin')
- **Guest**: Connects via browser, read-only view (user.type === 'guest')

### Sync Mechanism
```
Admin action → REST endpoint → DB update → Socket.io broadcast → All clients update state → UI re-renders
```

### Song Pipeline
```
.txt file → Song.load() → Parse lines → Detect chords/lyrics → Optional transpose → Render components
```

---

## 🎯 Efficiency Tips

### Fast File Lookup
Use QUICK_REFERENCE.md "Finding Things" section:
- Song parsing: `src/shared/lib/song/song.ts`
- Transposition: `src/shared/lib/transpose/`
- Scroll: `src/client/lib/useSongScroll.ts`
- Database: `src/shared/db/`
- API: `src/shared/endpoints/`
- Messages: `src/shared/messages/`

### Common Questions Quick Answers
- **How to add endpoint?** → See DEVELOPER_GUIDE.md "Adding a New Endpoint"
- **How to add socket message?** → See DEVELOPER_GUIDE.md "Adding a Socket.io Message"
- **How to update database?** → See DEVELOPER_GUIDE.md "Adding a Database Table"
- **Song format?** → See SONG_FORMAT.md
- **Build failing?** → Check SQLite binary, run typecheck

### Code Search Strategy
1. Grep for function/component names
2. Glob for file patterns (`**/*Component.tsx`)
3. Read relevant files in parallel
4. Use Task/Explore agent for complex searches

---

## 📦 Dependencies to Know

### Must Not Change
- **Electron 30.1.0** - SQLite binary built for this version
- **Node.js 20+** - Required engine
- **React 18** - Current version

### Can Add Carefully
- UI components (must be compatible with TailwindCSS + Radix)
- Utility libraries (must work in both Node and browser)
- TypeScript types (must not break shared code)

### Don't Add
- Different state management (Context API sufficient)
- Different build tools (esbuild + Vite established)
- Different database (SQLite fits use case)
- Different styling (TailwindCSS + Radix UI established)

---

## 🐛 Debugging Context

### If Build Fails
1. Check `npm run typecheck` output
2. Verify SQLite binary context
3. Check for import errors (client/server separation)
4. Look for missing dependencies

### If App Doesn't Work
1. Check browser console (Cmd+Option+I)
2. Check terminal output (where `npm run dev` runs)
3. Check Socket.io connection status
4. Verify database has data

### If Scroll Issues
1. Test on different screen sizes
2. Check if admin vs guest
3. Verify scroll events in console
4. Check auto-scroll vs manual scroll state

---

## 💬 Communication Style

### When Presenting Plans
- Use TodoWrite to create task list
- Be specific about files to change
- Mention trade-offs if any
- Ask for approval before proceeding

### When Asking Questions
- Be direct and specific
- Reference documentation when relevant
- Offer options if multiple approaches exist
- Explain why you're uncertain

### When Explaining Changes
- Reference file paths with line numbers (`file.ts:123`)
- Show before/after for clarity
- Explain why this approach was chosen
- Mention what was tested/verified

---

## 🎓 Learning from Codebase

### Good Patterns Observed
- Shared code for type safety
- Factory functions for endpoints/messages
- React hooks for Socket.io
- Event emitter proxy for server-side socket
- File watching with AbortController

### Design Decisions
- Plain text songs (easy to edit, version control)
- Local-only network (simpler, no auth complexity)
- Context API over Redux (sufficient for use case)
- SQLite over complex DB (appropriate for single-user admin)
- Same React app for admin/guests (DRY, consistent UX)

---

## ⚡ Quick Commands Reference

```bash
# Development
npm run dev                     # Start with hot-reload

# Type checking
npm run typecheck              # Before considering changes done

# SQLite context switching
npm run install:deps:electron  # Before running app/building
npm run install:deps:web       # Before migrations

# Building
npm run build                  # Full build

# Database
npm run db:migration:generate  # After schema changes
npm run db:migration:run       # Apply migrations
```

---

## 📝 Session Workflow

### Starting a Session
1. Review uncommitted changes (`git status`)
2. Understand what user wants to accomplish
3. Consult relevant documentation
4. Ask clarifying questions if needed

### During Development
1. Create plan with TodoWrite
2. Get approval
3. Implement step by step
4. Mark todos as completed immediately after each step
5. Verify changes make sense

### Before Ending
1. Summarize what was changed
2. Mention what should be tested
3. Note any follow-up items
4. Suggest commit message if appropriate

---

## 🎯 Success Criteria

A change is successful when:
- [ ] TypeScript compiles without errors
- [ ] Code follows existing patterns
- [ ] Multi-device scenarios considered
- [ ] Plan was approved before implementation
- [ ] Changes are minimal and focused
- [ ] Documentation is still accurate (or updated)
- [ ] User is satisfied with the approach

---

## 📚 Priority Documentation Order

When uncertain, consult in this order:
1. **QUICK_REFERENCE.md** - Fast lookup
2. **Relevant code files** - See how it's currently done
3. **ARCHITECTURE.md** - Understand the system
4. **DEVELOPER_GUIDE.md** - Development patterns
5. **Ask user** - Fill in gaps

---

## 🔄 Version Context

**Current Version**: v2.6.1 (as of 2025-10-26)

**Recent focus areas:**
- Session log improvements
- Chord display enhancements
- Chord parsing refinements

**Known working state:** Last commit `024be4c`

---

**Last Updated**: 2025-10-26
**For**: Claude Code assistant working on HappiKaraoke v2
