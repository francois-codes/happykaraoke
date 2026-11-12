import { requestSectionJump } from '@/lib/sectionJump'
import { getSectionKind, type SectionKind } from '@/lib/sectionKind'
import { sectionAnchorId, type ScrollAnchor, useSongSections } from '@/lib/useSongSections'
import { useStore } from '@/store'
import { type ReactElement, useLayoutEffect, useRef, useState } from 'react'

/** Same colour families as `.section-color-bar` in base.css. */
const KIND_COLORS: Record<SectionKind, string> = {
  intro: '#888780',
  outro: '#888780',
  verse: '#378add',
  prechorus: '#7f77dd',
  chorus: '#639922',
  bridge: '#ba7517',
  solo: '#d4537e'
}
const UNKNOWN_COLOR = '#a8a29e'
/** Below this height (px) a segment's label is hidden, so labels never overlap. */
const MIN_LABEL_PX = 13

interface StructureSegment {
  /** Index among all `.song-section` headings (matches the `section:<n>` scroll anchor). */
  headingIndex: number
  title: string
  label: string
  color: string
  /** Fractions of the song height, 0..1. */
  top: number
  height: number
}

interface StructureView {
  segments: StructureSegment[]
  /** Visible part of the song, as fractions of its height. */
  viewTop: number
  viewHeight: number
  /** headingIndex of the section in progress: the last section anchor the scroll has reached (as ↑ / ↓ do). */
  current: number | null
}

const EMPTY_VIEW: StructureView = { segments: [], viewTop: 0, viewHeight: 0, current: null }

/** Short label for the bar: "C2", "R", "Pont", "Intro"… */
function shortLabel(title: string, kind: SectionKind | null): string {
  const n = title.match(/\d+/)?.[0] ?? ''
  switch (kind) {
    case 'intro':
      return 'Intro'
    case 'outro':
      return 'Outro'
    case 'verse':
      return `C${n}`
    case 'prechorus':
      return `PR${n}`
    case 'chorus':
      return 'R'
    case 'bridge':
      return 'Pont'
    case 'solo':
      return 'Solo'
    default:
      return title.slice(0, 5)
  }
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

/** Measures the titled headings of #song-lines and the visible window of #scroll-container. */
function measure(container: HTMLElement, songLines: HTMLElement, anchors: ScrollAnchor[]): StructureView {
  const end = songLines.querySelector<HTMLElement>(':scope > [data-song-end]')?.offsetTop ?? songLines.scrollHeight
  if (end <= 0) return EMPTY_VIEW
  const headings = Array.from(songLines.querySelectorAll<HTMLElement>(':scope > .song-section'))
  const titled = headings
    .map((el, headingIndex) => ({ el, headingIndex, title: (el.textContent ?? '').trim() }))
    .filter((h) => h.title !== '')

  const segments = titled.map((h, i): StructureSegment => {
    const top = h.el.offsetTop
    const bottom = titled[i + 1]?.el.offsetTop ?? end
    const kind = getSectionKind(h.title)
    return {
      headingIndex: h.headingIndex,
      title: h.title,
      label: shortLabel(h.title, kind),
      color: kind ? KIND_COLORS[kind] : UNKNOWN_COLOR,
      top: clamp01(top / end),
      height: clamp01(Math.max(0, bottom - top) / end)
    }
  })

  // Song position inside the scroll container (container padding / header above the song).
  const songTop =
    songLines.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
  const scrolled = container.scrollTop - songTop
  // Section anchors use the app's own alignment (previous section's last line kept at the top), so the
  // highlighted section is the one ↑ / ↓ would consider current. Untitled headings belong to the titled one above.
  const reached = headings.reduce<number | null>((last, _el, index) => {
    const anchor = anchors.find((a) => a.id === sectionAnchorId(index))
    return anchor && anchor.scrollTop <= container.scrollTop + 1 ? index : last
  }, null)
  const current = reached == null ? (titled[0]?.headingIndex ?? null)
    : ([...titled].reverse().find((h) => h.headingIndex <= reached)?.headingIndex ?? titled[0]?.headingIndex ?? null)

  return {
    segments,
    viewTop: clamp01(scrolled / end),
    viewHeight: Math.min(clamp01(container.clientHeight / end), 1 - clamp01(scrolled / end)),
    current
  }
}

/**
 * Structure bar on the right of the song: one coloured segment per section (real length), short labels,
 * and a frame showing what is on screen (it works as a scrollbar). The scroll master taps a segment to jump
 * there (same path as ↑ / ↓, so followers follow); everyone else only sees it. Absolute overlay outside the
 * scroll content: it never changes the lyrics layout or the scroll anchors.
 */
export function StructureBar(): ReactElement | null {
  const { currentSong, structureBar, isAdmin, scrollMaster } = useStore()
  const [view, setView] = useState<StructureView>(EMPTY_VIEW)
  const [barPx, setBarPx] = useState(0)
  const barRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const { resolveAnchors } = useSongSections()
  const resolveAnchorsRef = useRef(resolveAnchors)
  resolveAnchorsRef.current = resolveAnchors

  useLayoutEffect(() => {
    if (!structureBar || !currentSong) {
      setView(EMPTY_VIEW)
      return
    }
    const container = document.getElementById('scroll-container')
    const songLines = document.getElementById('song-lines')
    if (!(container instanceof HTMLElement) || !(songLines instanceof HTMLElement)) return

    const schedule = (): void => {
      if (rafRef.current != null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        setView(measure(container, songLines, resolveAnchorsRef.current()))
        setBarPx(barRef.current?.clientHeight ?? 0)
      })
    }

    schedule()
    container.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(songLines)
    resizeObserver.observe(container)
    const mutationObserver = new MutationObserver(schedule)
    mutationObserver.observe(songLines, { childList: true })
    return () => {
      container.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [structureBar, currentSong])

  if (!structureBar || view.segments.length === 0) return null
  const canJump = isAdmin === true && scrollMaster === true
  const pct = (fraction: number): string => `${(fraction * 100).toFixed(3)}%`

  return (
    <div
      ref={barRef}
      className="pointer-events-none absolute bottom-3 right-1 top-3 z-10 w-12"
      data-structure-bar
      aria-hidden={!canJump}
    >
      <div className="absolute inset-y-0 right-0 w-[7px] rounded-sm bg-stone-500/15" />
      {view.segments.map((segment) => {
        const isCurrent = segment.headingIndex === view.current
        const showLabel = segment.height * barPx >= MIN_LABEL_PX
        return (
          <div
            key={segment.headingIndex}
            data-structure-segment={segment.label}
            data-current={isCurrent ? '' : undefined}
            className="absolute right-0 w-full"
            style={{ top: pct(segment.top), height: pct(segment.height) }}
          >
            <div
              className="absolute inset-y-px right-0 w-[7px] rounded-sm"
              style={{ background: segment.color, opacity: isCurrent ? 1 : 0.75 }}
            />
            {showLabel && (
              <span
                className={
                  'absolute right-[13px] top-0 hidden whitespace-nowrap text-[10px] leading-none md:block ' +
                  (isCurrent ? 'font-semibold text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400')
                }
              >
                {segment.label}
              </span>
            )}
            {canJump && (
              <button
                type="button"
                className="pointer-events-auto absolute inset-y-0 right-0 w-6 cursor-pointer"
                title={`Aller à : ${segment.title}`}
                aria-label={`Aller à : ${segment.title}`}
                onClick={() => requestSectionJump(segment.headingIndex)}
              />
            )}
          </div>
        )
      })}
      <div
        className="absolute right-[-3px] w-[13px] rounded border-[1.5px] border-stone-800 dark:border-stone-200"
        style={{ top: pct(view.viewTop), height: `max(6px, ${pct(view.viewHeight)})` }}
        data-structure-bar-view
      />
    </div>
  )
}
