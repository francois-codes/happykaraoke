import { describe, expect, it } from 'vitest'

const toTopFromAnchor = (anchorTop: number, offset: number, maxScrollable: number) => {
  return Math.max(0, Math.min(anchorTop + offset, maxScrollable))
}

const shouldApply = (incomingSeq: number, lastSeq: number) => incomingSeq > lastSeq

const musicianShouldStep = (targetTop: number, currentTop: number, viewportHeight: number) => {
  if (targetTop < currentTop) return true
  const threshold = viewportHeight * 0.55
  return targetTop - currentTop >= threshold
}

describe('scroll invariants', () => {
  it('reconstructs clamped target from anchor + offset', () => {
    const maxScrollable = 2400
    expect(toTopFromAnchor(320, 80, maxScrollable)).toBe(400)
    expect(toTopFromAnchor(2300, 300, maxScrollable)).toBe(2400)
    expect(toTopFromAnchor(100, -250, maxScrollable)).toBe(0)
  })

  it('clamps master scrollTop to follower max scroll', () => {
    const maxScroll = 500
    expect(Math.max(0, Math.min(1200, maxScroll))).toBe(500)
    expect(Math.max(0, Math.min(-10, maxScroll))).toBe(0)
  })

  it('applies only monotonic snapshot sequences', () => {
    expect(shouldApply(11, 10)).toBe(true)
    expect(shouldApply(10, 10)).toBe(false)
    expect(shouldApply(9, 10)).toBe(false)
  })

  it('musician mode steps only on threshold crossing when moving down', () => {
    expect(musicianShouldStep(1100, 1000, 900)).toBe(false)
    expect(musicianShouldStep(1600, 1000, 900)).toBe(true)
    expect(musicianShouldStep(800, 1000, 900)).toBe(true)
  })
})

