# Cursor Lessons

## Mistake 1: Introduced `any`

**Root cause:** Quick hack in WebSocket handler.
**Prevention:** Always define interfaces first, even for quick fixes.
**Example:** ❌ `any[]` → ✅ `Song[]`
