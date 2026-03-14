import { describe, expect, it } from 'vitest'

const computeScrollFraction = (scrollTop: number, scrollHeight: number, clientHeight: number) => {
  const maxScrollable = Math.max(1, scrollHeight - clientHeight)
  const raw = scrollTop / maxScrollable
  return Math.min(1, Math.max(0, raw))
}

const computeScrollTarget = (fraction: number, scrollHeight: number, clientHeight: number) => {
  const maxScrollable = Math.max(1, scrollHeight - clientHeight)
  return fraction * maxScrollable
}

describe('scroll invariants', () => {
  it('produces consistent fractions across different viewport sizes', () => {
    const scrollHeight = 4000

    const adminFraction = computeScrollFraction(1000, scrollHeight, 800)
    const viewerFraction = computeScrollFraction(1000, scrollHeight, 600)

    expect(adminFraction).toBeCloseTo(viewerFraction, 5)
  })

  it('reconstructs equivalent targets from the same fraction', () => {
    const scrollHeight = 4000
    const fraction = 0.5

    const adminTarget = computeScrollTarget(fraction, scrollHeight, 800)
    const viewerTarget = computeScrollTarget(fraction, scrollHeight, 600)

    const adminMax = Math.max(1, scrollHeight - 800)
    const viewerMax = Math.max(1, scrollHeight - 600)

    expect(adminTarget / adminMax).toBeCloseTo(viewerTarget / viewerMax, 5)
  })
})

