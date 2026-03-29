import { describe, expect, it } from 'vitest'

const buildFallbackSections = (scrollHeight: number, clientHeight: number) => {
  const maxScrollable = Math.max(0, scrollHeight - clientHeight)
  const pageSize = clientHeight * 0.8
  const sections: number[] = []

  if (pageSize <= 0) {
    return [0]
  }

  for (let position = 0; position <= maxScrollable; position += pageSize) {
    sections.push(position)
  }

  return sections.length > 0 ? sections : [0]
}

const makeAnchorId = (type: 'section' | 'break' | 'synthetic', index: number) => `${type}:${index}`

describe('section invariants', () => {
  it('creates at least one fallback section for heading-less songs', () => {
    const sections = buildFallbackSections(2000, 800)
    expect(sections.length).toBeGreaterThan(0)
    expect(sections[0]).toBe(0)
  })

  it('generates monotonically increasing fallback sections', () => {
    const sections = buildFallbackSections(3000, 900)
    for (let i = 1; i < sections.length; i += 1) {
      expect(sections[i]).toBeGreaterThanOrEqual(sections[i - 1])
    }
  })

  it('builds layout-independent anchor ids from type and index', () => {
    expect(makeAnchorId('section', 2)).toBe('section:2')
    expect(makeAnchorId('break', 0)).toBe('break:0')
  })
})

