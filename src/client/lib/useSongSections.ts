import { useStore } from '@/store'
import { useEffect, useRef } from 'react'

const SECTION_SCROLL_BOTTOM_PADDING = 32

export type SectionLayoutDebugRow = {
  index: number
  title: string
  /** Y value passed to scrollTo / used in resolveSections (offsetTop space, song-lines–relative). */
  alignedScrollY: number
  /** Raw h3.song-section offsetTop (same coordinate space as aligned when offsetParent matches). */
  headingOffsetTop: number
  synthetic: boolean
}

/** Fresh DOM read for debugging; does not use resolveSections cache. */
export function getSectionLayoutDebug(): SectionLayoutDebugRow[] {
  const blockEls = Array.from(document.querySelectorAll('.block')).filter(
    (el): el is HTMLElement => el instanceof HTMLElement
  )
  const blockTops = blockEls.map((el) => el.offsetTop).sort((a, b) => a - b)

  const headingNodes = Array.from(document.querySelectorAll('.song-section')).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  )

  if (headingNodes.length === 0) {
    const scrollContainer = document.getElementById('scroll-container')
    if (!(scrollContainer instanceof HTMLElement)) {
      return []
    }
    const { scrollHeight, clientHeight } = scrollContainer
    const maxScrollable = Math.max(0, scrollHeight - clientHeight)
    const pageSize = clientHeight > 0 ? clientHeight * 0.8 : window.innerHeight * 0.8
    const rows: SectionLayoutDebugRow[] = []
    if (pageSize > 0) {
      for (let position = 0, i = 0; position <= maxScrollable; position += pageSize, i++) {
        rows.push({
          index: i,
          title: 'synthetic page',
          alignedScrollY: position,
          headingOffsetTop: position,
          synthetic: true
        })
      }
    }
    if (rows.length === 0) {
      rows.push({
        index: 0,
        title: 'synthetic(0)',
        alignedScrollY: 0,
        headingOffsetTop: 0,
        synthetic: true
      })
    }
    return rows
  }

  return headingNodes.map((child, index) => {
    const closest = findPreviousBlock(blockTops, child.offsetTop)
    const aligned = closest.index === -1 ? child.offsetTop : closest.value
    return {
      index,
      title: child.textContent?.trim() ?? `#${index}`,
      alignedScrollY: aligned,
      headingOffsetTop: child.offsetTop,
      synthetic: false
    }
  })
}

function findPreviousBlock(blocks: number[], scrollPosition: number) {
  let left = 0
  let right = blocks.length - 1
  let resultIndex = -1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if (blocks[mid] < scrollPosition) {
      resultIndex = mid
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return {
    value: resultIndex === -1 ? -1 : blocks[resultIndex],
    index: resultIndex
  }
}

/**
 * Rows that represent a lyric/chord line for scroll context (not only `.block`, so breaks after
 * bare `pre.line` / `p` lyrics still get a row before the next `.song-section`).
 */
function collectScrollContextRowElements(songLines: HTMLElement): HTMLElement[] {
  const seen = new Set<HTMLElement>()
  const out: HTMLElement[] = []

  const add = (nodes: Iterable<Element>) => {
    for (const n of nodes) {
      if (n instanceof HTMLElement && !seen.has(n)) {
        seen.add(n)
        out.push(n)
      }
    }
  }

  add(songLines.querySelectorAll('.block'))
  add(songLines.querySelectorAll('pre.line'))
  add(songLines.querySelectorAll('p.line-lyrics-only'))
  add(songLines.querySelectorAll('div.line-lyrics-only'))

  return out
}

function findLastContentRowBeforeHeading(heading: HTMLElement, songLines: HTMLElement): HTMLElement | null {
  const rows = collectScrollContextRowElements(songLines)
  const hTop = heading.offsetTop
  const before = rows.filter((el) => el.offsetTop < hTop)
  if (before.length === 0) {
    return null
  }
  return before.reduce((best, el) => {
    const eb = el.offsetTop + el.offsetHeight
    const bb = best.offsetTop + best.offsetHeight
    if (eb > bb) return el
    if (eb < bb) return best
    return el.offsetTop >= best.offsetTop ? el : best
  })
}

export function useSongSections() {
  const sectionsRef = useRef<Nullable<number[]>>(null)
  const blocksRef = useRef<Nullable<number[]>>(null)

  const { currentSong } = useStore()

  function resolveSections() {
    const blocks = resolveBlocks()

    if (sectionsRef.current === null) {
      const headingNodes = Array.from(document.querySelectorAll('.song-section')).filter(
        (child): child is HTMLElement => child instanceof HTMLElement
      )

      if (headingNodes.length === 0) {
        const scrollContainer = document.getElementById('scroll-container')

        if (scrollContainer instanceof HTMLElement) {
          const { scrollHeight, clientHeight } = scrollContainer
          const maxScrollable = Math.max(0, scrollHeight - clientHeight)
          const pageSize = clientHeight > 0 ? clientHeight * 0.8 : window.innerHeight * 0.8
          const sections: number[] = []

          if (pageSize > 0) {
            for (let position = 0; position <= maxScrollable; position += pageSize) {
              sections.push(position)
            }
          }

          sectionsRef.current = sections.length > 0 ? sections : [0]
        } else {
          sectionsRef.current = [0]
        }
      } else {
        const sections = headingNodes.flatMap((child) => {
          const closestBlock = findPreviousBlock(blocks, child.offsetTop)

          if (closestBlock.index === -1) {
            return child.offsetTop
          }

          return closestBlock.value
        })

        sectionsRef.current = sections.length > 0 ? sections : [0]
      }
    }

    return sectionsRef.current ?? [0]
  }

  function resolveBlocks() {
    if (blocksRef.current === null) {
      blocksRef.current = Array.from(document.querySelectorAll('.block'))
        .map((child) => (child as HTMLElement).offsetTop)
        .sort((a, b) => a - b)
    }

    return blocksRef.current
  }

  function getClosestSection(scrollPosition: number) {
    const sections = resolveSections()
    if (!sections.length) {
      return 0
    }
    const closestIndex = sections.reduce((closest, current, index) => {
      const currentDiff = Math.abs(current - scrollPosition)
      const closestDiff = Math.abs(sections[closest] - scrollPosition)
      return currentDiff < closestDiff ? index : closest
    }, 0)

    return sections[closestIndex]
  }

  function findLastVisibleSection(scrollPosition: number) {
    const viewportBottom = scrollPosition + window.innerHeight - 200
    const sections = resolveSections()

    if (!sections.length) {
      return 0
    }

    // Filter sections that are above the bottom of the viewport
    const visibleSections = sections.filter((pos) => pos <= viewportBottom)

    // Return the last visible section position
    // If no sections are visible, return the first section position
    return visibleSections.length > 0 ? visibleSections[visibleSections.length - 1] : sections[0]
  }

  /** Scroll top when jumping to section index k, keeping the last lyric/chord row before that heading in view when possible. */
  function getScrollTopForSectionStart(k: number, container: HTMLElement): number {
    const sections = resolveSections()
    const sectionStart = sections[k]
    if (sectionStart === undefined) {
      return 0
    }

    const hasSongSections = document.querySelectorAll('.song-section').length > 0
    if (!hasSongSections || k <= 0) {
      return clampScrollTop(container, sectionStart)
    }

    const prevStart = sections[k - 1]
    if (prevStart === undefined) {
      return clampScrollTop(container, sectionStart)
    }

    const songLines = document.getElementById('song-lines')
    const headings = document.querySelectorAll('.song-section')
    const heading = headings[k]
    if (!(songLines instanceof HTMLElement) || !(heading instanceof HTMLElement)) {
      return clampScrollTop(container, sectionStart)
    }

    const lastRow = findLastContentRowBeforeHeading(heading, songLines)
    if (!lastRow) {
      return clampScrollTop(container, sectionStart)
    }

    const candidate =
      lastRow.offsetTop + lastRow.offsetHeight - container.clientHeight + SECTION_SCROLL_BOTTOM_PADDING

    // When consecutive sections share the same aligned Y (common after implicit breaks), prevStart === sectionStart
    // and max(prevStart, candidate) would hide context — use 0 as the lower clamp instead.
    const scrollTopMin = prevStart < sectionStart ? prevStart : 0
    const raw = Math.min(sectionStart, Math.max(scrollTopMin, candidate))
    return clampScrollTop(container, raw)
  }

  useEffect(() => {
    sectionsRef.current = null
  }, [currentSong])

  return { resolveSections, findLastVisibleSection, getClosestSection, getScrollTopForSectionStart }
}

function clampScrollTop(container: HTMLElement, top: number): number {
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
  return Math.max(0, Math.min(top, maxScroll))
}
