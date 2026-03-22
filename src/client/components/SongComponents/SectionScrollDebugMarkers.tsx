'use client'

import { DEBUG_SECTION_SCROLL_MARKERS } from '@/lib/debugSettings'
import { getSectionLayoutDebug, type SectionLayoutDebugRow } from '@/lib/useSongSections'
import { useStore } from '@/store'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

const COLORS = [
  'rgb(239 68 68)',
  'rgb(34 197 94)',
  'rgb(59 130 246)',
  'rgb(234 179 8)',
  'rgb(168 85 247)'
]

/** Same half-open ranges as follower scroll diagnostics (useSongScroll). */
function anchoredSectionIndex(scrollTop: number, sectionStarts: number[]): number | null {
  if (sectionStarts.length === 0) return null
  const i = sectionStarts.findIndex((y, idx) => {
    const nextY = sectionStarts[idx + 1] ?? Infinity
    return scrollTop >= y && scrollTop < nextY
  })
  if (i !== -1) return i
  return scrollTop < sectionStarts[0] ? 0 : sectionStarts.length - 1
}

export function SectionScrollDebugMarkers() {
  const { isAdmin, currentSong, chordsEnabled } = useStore()
  const [rows, setRows] = useState<SectionLayoutDebugRow[]>([])
  const [scrollTop, setScrollTop] = useState(0)
  const rafRef = useRef<Nullable<number>>(null)
  const scrollRafRef = useRef<Nullable<number>>(null)

  const enabled = Boolean(isAdmin && DEBUG_SECTION_SCROLL_MARKERS)

  const duplicateAligned = useMemo(() => {
    const seen = new Map<number, number>()
    for (const r of rows) {
      seen.set(r.alignedScrollY, (seen.get(r.alignedScrollY) ?? 0) + 1)
    }
    return [...seen.values()].some((c) => c > 1)
  }, [rows])

  const sectionStarts = useMemo(() => rows.map((r) => r.alignedScrollY), [rows])

  const anchoredIndex = useMemo(
    () => anchoredSectionIndex(scrollTop, sectionStarts),
    [scrollTop, sectionStarts]
  )

  useLayoutEffect(() => {
    if (!enabled) {
      setRows([])
      return
    }

    const measure = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setRows(getSectionLayoutDebug())
        rafRef.current = null
      })
    }

    measure()
    const t1 = window.setTimeout(measure, 120)
    const t2 = window.setTimeout(measure, 500)

    const scrollEl = document.getElementById('scroll-container')
    const songLines = document.getElementById('song-lines')
    const ro = new ResizeObserver(measure)
    if (scrollEl) ro.observe(scrollEl)
    if (songLines) ro.observe(songLines)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      ro.disconnect()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [enabled, currentSong, chordsEnabled])

  useLayoutEffect(() => {
    if (!enabled) return

    const scrollEl = document.getElementById('scroll-container')
    if (!(scrollEl instanceof HTMLElement)) return

    const readScroll = () => {
      if (scrollRafRef.current != null) return
      scrollRafRef.current = requestAnimationFrame(() => {
        setScrollTop(scrollEl.scrollTop)
        scrollRafRef.current = null
      })
    }

    readScroll()
    scrollEl.addEventListener('scroll', readScroll, { passive: true })

    return () => {
      scrollEl.removeEventListener('scroll', readScroll)
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current)
      scrollRafRef.current = null
    }
  }, [enabled, currentSong, chordsEnabled])

  if (!enabled) return null

  if (rows.length > 0 && rows[0]?.synthetic) {
    return (
      <>
        <div className="fixed top-20 right-3 z-[200] max-w-sm pointer-events-auto rounded bg-black/85 px-2 py-1.5 text-[11px] font-mono text-amber-200 shadow-lg">
          <div className="font-semibold text-white">Section scroll debug (synthetic)</div>
          <div className="mt-0.5 text-cyan-200">
            Anchored §{anchoredIndex === null ? '—' : anchoredIndex} · scrollTop {Math.round(scrollTop)}
          </div>
          <div className="mt-1 text-white/80">No <code className="text-cyan-300">.song-section</code> headings.</div>
          <ul className="mt-1 max-h-40 overflow-auto text-[10px] text-white/90">
            {rows.map((r) => (
              <li key={r.index}>
                #{r.index} scrollTop ≈ {Math.round(r.alignedScrollY)} px
              </li>
            ))}
          </ul>
        </div>
      </>
    )
  }

  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 bottom-0 z-[60] overflow-visible min-h-0"
        aria-hidden
      >
        {rows.map((row, i) => {
          const color = COLORS[row.index % COLORS.length]
          const dupPrev = i > 0 && rows[i - 1]!.alignedScrollY === row.alignedScrollY
          const dupNext = i < rows.length - 1 && rows[i + 1]!.alignedScrollY === row.alignedScrollY
          const mismatch = Math.abs(row.headingOffsetTop - row.alignedScrollY) > 1

          return (
            <div key={row.index}>
              <div
                className="absolute left-0 right-0 border-t-[3px]"
                style={{ top: row.alignedScrollY, borderColor: color }}
              />
              {mismatch && (
                <div
                  className="absolute left-0 right-0 border-t border-dashed opacity-95"
                  style={{ top: row.headingOffsetTop, borderColor: 'rgb(250 204 21)' }}
                />
              )}
              <div
                className="absolute left-1 flex max-w-[min(100%,22rem)] flex-wrap gap-1 text-[10px] leading-tight font-mono text-white"
                style={{ top: row.alignedScrollY + 3 }}
              >
                <span className="rounded px-1 py-0.5 shadow" style={{ backgroundColor: color }}>
                  #{row.index} {row.title.length > 26 ? `${row.title.slice(0, 26)}…` : row.title}
                </span>
                <span className="rounded bg-black/80 px-1 py-0.5 shadow">
                  align {Math.round(row.alignedScrollY)}
                  {mismatch ? ` · h ${Math.round(row.headingOffsetTop)}` : ''}
                  {(dupPrev || dupNext) && ' · DUP'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed top-20 right-3 z-[200] max-w-sm pointer-events-auto rounded bg-black/85 px-2 py-1.5 text-[11px] font-mono text-amber-200 shadow-lg">
        <div className="font-semibold text-white">Section scroll debug</div>
        <div className="mt-0.5 text-cyan-200">
          Anchored §{anchoredIndex === null ? '—' : anchoredIndex} · scrollTop {Math.round(scrollTop)}
        </div>
        <div className="mt-0.5 text-[10px] text-white/80">
          Solid = scroll target (aligned block top). Dashed yellow = <code className="text-yellow-200">.song-section</code>{' '}
          when it differs.
        </div>
        {duplicateAligned && (
          <div className="mt-1 text-red-300">Duplicate aligned Y: next/prev may not scroll between those headers.</div>
        )}
      </div>
    </>
  )
}
