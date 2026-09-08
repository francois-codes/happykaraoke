import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createScrollAnimator, SCROLL_JUMP_DURATION_MS } from '../../src/client/lib/scrollAnimation'
import { sqlite } from '../support/database'
import { startSessionIfNeeded, scrollControlTake, upsertScrollSnapshot } from '@shared/lib/session'

let now = 0
let reducedMotion = false
let nextFrameId = 0
const frames = new Map<number, FrameRequestCallback>()
const originalRaf = globalThis.requestAnimationFrame
const originalCancel = globalThis.cancelAnimationFrame
const originalMatchMedia = globalThis.matchMedia

beforeEach((context) => {
  now = 0
  reducedMotion = false
  frames.clear()
  context.mock.method(performance, 'now', () => now)
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(++nextFrameId, callback)
    return nextFrameId
  }
  globalThis.cancelAnimationFrame = (id) => { frames.delete(id) }
  globalThis.matchMedia = () => ({ matches: reducedMotion }) as MediaQueryList
})

afterEach(() => {
  globalThis.requestAnimationFrame = originalRaf
  globalThis.cancelAnimationFrame = originalCancel
  globalThis.matchMedia = originalMatchMedia
})

function advance(milliseconds: number): void {
  now += milliseconds
  const callbacks = [...frames.values()]
  frames.clear()
  callbacks.forEach((callback) => callback(now))
}

test('scroll jumps show intermediate positions and finish at the exact target', () => {
  let top = 100
  let completions = 0
  const animator = createScrollAnimator(() => top, (value) => { top = value })
  animator.animateTo(600, () => { completions += 1 })
  assert.equal(top, 100)
  advance(SCROLL_JUMP_DURATION_MS / 2)
  assert.ok(top > 100 && top < 600)
  assert.equal(completions, 0)
  advance(SCROLL_JUMP_DURATION_MS / 2)
  assert.equal(top, 600)
  assert.equal(completions, 1)
  assert.equal(animator.isAnimating(), false)
})

test('a replacement jump starts at the displayed position and cancels stale completion', () => {
  let top = 0
  let staleCompletion = false
  const animator = createScrollAnimator(() => top, (value) => { top = value })
  animator.animateTo(500, () => { staleCompletion = true })
  advance(50)
  const halfway = top
  animator.animateTo(0)
  assert.equal(top, halfway)
  advance(50)
  assert.ok(top > 0 && top < halfway)
  advance(SCROLL_JUMP_DURATION_MS)
  assert.equal(top, 0)
  assert.equal(staleCompletion, false)
})

test('cancellation prevents old-song frames and completion from running', () => {
  let top = 0
  let completed = false
  const animator = createScrollAnimator(() => top, (value) => { top = value })
  animator.animateTo(500, () => { completed = true })
  advance(50)
  animator.cancel()
  const cancelledTop = top
  advance(SCROLL_JUMP_DURATION_MS)
  assert.equal(top, cancelledTop)
  assert.equal(completed, false)
  assert.equal(frames.size, 0)
})

test('reduced motion applies the target immediately without animation frames', () => {
  reducedMotion = true
  let top = 100
  let completed = false
  const animator = createScrollAnimator(() => top, (value) => { top = value })
  animator.animateTo(600, () => { completed = true })
  assert.equal(top, 600)
  assert.equal(completed, true)
  assert.equal(frames.size, 0)
})

test('the server preserves explicit section transitions without marking ordinary corrections', async () => {
  const session = await startSessionIfNeeded()
  sqlite.prepare('INSERT INTO user (id, name, type, sessionId) VALUES (77, ?, ?, ?)')
    .run('Scroll host', 'admin', session.id)
  assert.equal((await scrollControlTake(77)).ok, true)
  const input = {
    userId: 77, songId: 'Test song', masterScrollTop: 500,
    anchorId: 'section:1', offsetPxFromAnchor: 0,
    autoScroll: { running: true, speedPxPerSecond: 36 }
  }
  const jump = await upsertScrollSnapshot({ ...input, transition: 'section' })
  assert.ok(jump.ok)
  assert.equal(jump.snapshot.transition, 'section')
  const correction = await upsertScrollSnapshot(input)
  assert.ok(correction.ok)
  assert.equal(correction.snapshot.transition, undefined)
  assert.ok(correction.snapshot.seq > jump.snapshot.seq)
})
