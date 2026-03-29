import { useStore } from '@/store'
import type { ScrollAnchorType } from '@shared/types/scroll'
import { useCallback, useEffect } from 'react'

const SECTION_SCROLL_BOTTOM_PADDING = 32

/** Shared across all `useSongSections()` callers so layout invalidation updates markers + scroll sync. */
let sharedAnchorCache: ScrollAnchor[] | null = null

let anchorLayoutListenersAttached = false
let sharedResizeObserver: ResizeObserver | null = null

function invalidateSharedAnchorCache() {
  sharedAnchorCache = null
}

function observeScrollLayoutRoots() {
  if (typeof ResizeObserver === 'undefined') return
  if (!sharedResizeObserver) {
    sharedResizeObserver = new ResizeObserver(invalidateSharedAnchorCache)
  }
  const sc = document.getElementById('scroll-container')
  const sl = document.getElementById('song-lines')
  if (sc) sharedResizeObserver.observe(sc)
  if (sl) sharedResizeObserver.observe(sl)
}

function ensureAnchorLayoutInvalidation() {
  if (typeof window === 'undefined' || anchorLayoutListenersAttached) return
  anchorLayoutListenersAttached = true
  window.addEventListener('resize', invalidateSharedAnchorCache)
  observeScrollLayoutRoots()
}

export type ScrollAnchor = {
  id: string
  type: ScrollAnchorType
  index: number
  title: string
  scrollTop: number
  sourceOffsetTop: number
  /** Y from top of #song-lines to the anchor line (layout); use for overlays, not scrollTop. */
  contentTopInSongLines: number
}

export type SectionLayoutDebugRow = {
  index: number
  title: string
  alignedScrollY: number
  headingOffsetTop: number
  synthetic: boolean
}

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
  add(songLines.querySelectorAll('div.song-break-line'))
  return out
}

function findLastContentRowBefore(top: number, songLines: HTMLElement): HTMLElement | null {
  const rows = collectScrollContextRowElements(songLines)
  const before = rows.filter((el) => el.offsetTop < top)
  if (before.length === 0) return null
  return before.reduce((best, el) => {
    const eb = el.offsetTop + el.offsetHeight
    const bb = best.offsetTop + best.offsetHeight
    if (eb > bb) return el
    if (eb < bb) return best
    return el.offsetTop >= best.offsetTop ? el : best
  })
}

/** `.chord-card` uses `position: relative; bottom: 3.5vmin` so chords paint above `.block` layout top; offsetTop alone clips them when scrolling. */
function blockAnchorContentTop(block: HTMLElement): number {
  let y = block.offsetTop
  if (!block.querySelector('.chords-and-lyrics')) {
    return y
  }
  const card = block.querySelector('.chord-card')
  if (!(card instanceof HTMLElement)) {
    return y
  }
  const bottomShift = parseFloat(getComputedStyle(card).bottom || '0')
  if (Number.isFinite(bottomShift) && bottomShift > 0) {
    y -= bottomShift
  }
  return Math.max(0, y)
}

function contentRowAnchorTop(row: HTMLElement): number {
  return row.classList.contains('block') ? blockAnchorContentTop(row) : row.offsetTop
}

function findPreviousBlockElement(blocks: HTMLElement[], scrollPosition: number): HTMLElement | null {
  let best: HTMLElement | null = null
  let bestTop = -1
  for (const el of blocks) {
    const t = el.offsetTop
    if (t < scrollPosition && t > bestTop) {
      bestTop = t
      best = el
    }
  }
  return best
}

function clampScrollTop(container: HTMLElement, top: number): number {
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
  return Math.max(0, Math.min(top, maxScroll))
}

/** Pixel offset from #song-lines top to an element's top (layout; works across viewports). */
function offsetTopInSongLines(el: HTMLElement, songLines: HTMLElement): number {
  const er = el.getBoundingClientRect()
  const sr = songLines.getBoundingClientRect()
  return Math.max(0, er.top - sr.top + songLines.scrollTop)
}

/** Block row: chord-aligned Y inside #song-lines (matches blockAnchorContentTop intent). */
function blockContentTopInSongLines(block: HTMLElement, songLines: HTMLElement): number {
  let y = offsetTopInSongLines(block, songLines)
  if (!block.querySelector('.chords-and-lyrics')) {
    return y
  }
  const card = block.querySelector('.chord-card')
  if (!(card instanceof HTMLElement)) {
    return y
  }
  const bottomShift = parseFloat(getComputedStyle(card).bottom || '0')
  if (Number.isFinite(bottomShift) && bottomShift > 0) {
    y -= bottomShift
  }
  return Math.max(0, y)
}

function rowContentTopInSongLines(row: HTMLElement, songLines: HTMLElement): number {
  return row.classList.contains('block')
    ? blockContentTopInSongLines(row, songLines)
    : offsetTopInSongLines(row, songLines)
}

/** Layout-independent so followers with different font/viewport still resolve the same anchor. */
function makeAnchorId(type: ScrollAnchorType, index: number): string {
  return `${type}:${index}`
}

export function getSectionLayoutDebug(): SectionLayoutDebugRow[] {
  const songLines = document.getElementById('song-lines')
  const scrollContainer = document.getElementById('scroll-container')
  if (!(songLines instanceof HTMLElement) || !(scrollContainer instanceof HTMLElement)) return []
  const blockEls = Array.from(document.querySelectorAll('.block')).filter(
    (el): el is HTMLElement => el instanceof HTMLElement
  )
  const headingNodes = Array.from(document.querySelectorAll('.song-section')).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  )
  if (headingNodes.length === 0) {
    return [{ index: 0, title: 'synthetic(0)', alignedScrollY: 0, headingOffsetTop: 0, synthetic: true }]
  }
  return headingNodes.map((child, index) => {
    const block = findPreviousBlockElement(blockEls, child.offsetTop)
    const aligned = block ? blockAnchorContentTop(block) : child.offsetTop
    return {
      index,
      title: child.textContent?.trim() ?? `#${index}`,
      alignedScrollY: clampScrollTop(scrollContainer, aligned),
      headingOffsetTop: child.offsetTop,
      synthetic: false
    }
  })
}

export function getSectionIndexAtScrollTop(scrollTop: number, sections: number[]): number {
  if (sections.length === 0) return 0
  let idx = 0
  for (let i = 0; i < sections.length; i++) {
    if (scrollTop >= sections[i]) {
      idx = i
    } else {
      break
    }
  }
  return idx
}

export function useSongSections() {
  const { currentSong, chordsEnabled, guitaristMode, drummerMode, transpo } = useStore()

  const resolveAnchors = useCallback((options?: { fresh?: boolean }): ScrollAnchor[] => {
    ensureAnchorLayoutInvalidation()
    if (!options?.fresh && sharedAnchorCache !== null) return sharedAnchorCache
    const songLines = document.getElementById('song-lines')
    const scrollContainer = document.getElementById('scroll-container')
    if (!(songLines instanceof HTMLElement) || !(scrollContainer instanceof HTMLElement)) {
      sharedAnchorCache = [
        {
          id: 'synthetic:0',
          type: 'synthetic',
          index: 0,
          title: 'Top',
          scrollTop: 0,
          sourceOffsetTop: 0,
          contentTopInSongLines: 0
        }
      ]
      return sharedAnchorCache
    }

    const blockEls = Array.from(document.querySelectorAll('.block')).filter(
      (el): el is HTMLElement => el instanceof HTMLElement
    )

    const sectionNodes = Array.from(document.querySelectorAll('.song-section')).filter(
      (el): el is HTMLElement => el instanceof HTMLElement
    )
    const breakNodes = Array.from(songLines.querySelectorAll('div.song-break-line')).filter(
      (el): el is HTMLElement => el instanceof HTMLElement
    )

    const anchors: ScrollAnchor[] = []

    sectionNodes.forEach((node, index) => {
      const block = findPreviousBlockElement(blockEls, node.offsetTop)
      const aligned = block ? blockAnchorContentTop(block) : node.offsetTop
      const contentTopInSongLines = Math.round(
        block ? blockContentTopInSongLines(block, songLines) : offsetTopInSongLines(node, songLines)
      )
      anchors.push({
        id: makeAnchorId('section', index),
        type: 'section',
        index,
        title: node.textContent?.trim() ?? `Section ${index + 1}`,
        scrollTop: clampScrollTop(scrollContainer, aligned),
        sourceOffsetTop: node.offsetTop,
        contentTopInSongLines
      })
    })

    breakNodes.forEach((node, index) => {
      const previous = findLastContentRowBefore(node.offsetTop, songLines)
      const aligned = previous ? contentRowAnchorTop(previous) : node.offsetTop
      const contentTopInSongLines = Math.round(
        previous ? rowContentTopInSongLines(previous, songLines) : offsetTopInSongLines(node, songLines)
      )
      anchors.push({
        id: makeAnchorId('break', index),
        type: 'break',
        index,
        title: `Break ${index + 1}`,
        scrollTop: clampScrollTop(scrollContainer, aligned),
        sourceOffsetTop: node.offsetTop,
        contentTopInSongLines
      })
    })

    anchors.sort((a, b) => a.sourceOffsetTop - b.sourceOffsetTop || a.id.localeCompare(b.id))
    // Keep scroll targets monotonic with song order to avoid "next anchor" moving upward.
    for (let i = 1; i < anchors.length; i++) {
      if (anchors[i].scrollTop < anchors[i - 1].scrollTop) {
        anchors[i].scrollTop = anchors[i - 1].scrollTop
      }
    }
    anchors.forEach((anchor, i) => {
      anchor.index = i
    })

    if (anchors.length === 0) {
      anchors.push({
        id: 'synthetic:0',
        type: 'synthetic',
        index: 0,
        title: 'Top',
        scrollTop: 0,
        sourceOffsetTop: 0,
        contentTopInSongLines: 0
      })
    }

    sharedAnchorCache = anchors
    return anchors
  }, [currentSong, chordsEnabled, guitaristMode, drummerMode, transpo])

  function resolveSections() {
    return resolveAnchors().filter((a) => a.type === 'section' || a.type === 'synthetic').map((a) => a.scrollTop)
  }

  function getClosestSection(scrollPosition: number) {
    const sections = resolveSections()
    if (!sections.length) return 0
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
    if (!sections.length) return 0
    const visible = sections.filter((pos) => pos <= viewportBottom)
    return visible.length > 0 ? visible[visible.length - 1] : sections[0]
  }

  function getScrollTopForSectionStart(k: number, container: HTMLElement): number {
    const sectionAnchors = resolveAnchors().filter((a) => a.type === 'section' || a.type === 'synthetic')
    const anchor = sectionAnchors[k]
    if (!anchor) return 0
    if (k <= 0) return clampScrollTop(container, anchor.scrollTop)
    const songLines = document.getElementById('song-lines')
    const headings = document.querySelectorAll('.song-section')
    const heading = headings[k]
    if (!(songLines instanceof HTMLElement) || !(heading instanceof HTMLElement)) {
      return clampScrollTop(container, anchor.scrollTop)
    }
    const lastRow = findLastContentRowBefore(heading.offsetTop, songLines)
    if (!lastRow) return clampScrollTop(container, anchor.scrollTop)
    const candidate = lastRow.offsetTop + lastRow.offsetHeight - container.clientHeight + SECTION_SCROLL_BOTTOM_PADDING
    const prev = sectionAnchors[k - 1]
    const scrollTopMin = prev && prev.scrollTop < anchor.scrollTop ? prev.scrollTop : 0
    const raw = Math.min(anchor.scrollTop, Math.max(scrollTopMin, candidate))
    return clampScrollTop(container, raw)
  }

  function getAnchorAtScrollTop(scrollTop: number): ScrollAnchor {
    const anchors = resolveAnchors()
    let idx = 0
    for (let i = 0; i < anchors.length; i++) {
      if (scrollTop >= anchors[i].scrollTop) idx = i
      else break
    }
    return anchors[idx]
  }

  function getAnchorById(anchorId: string): ScrollAnchor | null {
    const anchors = resolveAnchors()
    return anchors.find((a) => a.id === anchorId) ?? null
  }

  function getScrollTopFromAnchor(anchorId: string, offsetPxFromAnchor: number): number {
    const scrollContainer = document.getElementById('scroll-container')
    if (!(scrollContainer instanceof HTMLElement)) return 0
    const anchor = getAnchorById(anchorId)
    if (!anchor) return clampScrollTop(scrollContainer, 0)
    return clampScrollTop(scrollContainer, anchor.scrollTop + offsetPxFromAnchor)
  }

  function resolveSectionAnchors(): ScrollAnchor[] {
    return resolveAnchors().filter((a) => a.type === 'section' || a.type === 'synthetic')
  }

  useEffect(() => {
    invalidateSharedAnchorCache()
    observeScrollLayoutRoots()
  }, [currentSong, chordsEnabled, guitaristMode, drummerMode, transpo])

  return {
    resolveAnchors,
    resolveSectionAnchors,
    resolveSections,
    getClosestSection,
    findLastVisibleSection,
    getScrollTopForSectionStart,
    getAnchorAtScrollTop,
    getAnchorById,
    getScrollTopFromAnchor
  }
}
