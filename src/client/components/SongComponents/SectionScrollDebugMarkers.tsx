'use client'

import {
  getScrollDebugLogicalAnchorIndex,
  subscribeScrollDebugLogicalAnchor
} from '@/lib/scrollLogicalAnchorDebugSync'
import { type ScrollAnchor, useSongSections } from '@/lib/useSongSections'
import { useStore } from '@/store'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

const COLORS = [
  'rgb(239 68 68)',
  'rgb(34 197 94)',
  'rgb(59 130 246)',
  'rgb(234 179 8)',
  'rgb(168 85 247)'
]

export function SectionScrollDebugMarkers() {
  const { isAdmin, currentSong, chordsEnabled, scrollMaster, debugScrollAnchors } = useStore()
  const { resolveAnchors } = useSongSections()
  const [rows, setRows] = useState<ScrollAnchor[]>([])
  const [scrollTop, setScrollTop] = useState(0)
  const [logicalHint, setLogicalHint] = useState(() => getScrollDebugLogicalAnchorIndex())
  const rafRef = useRef<Nullable<number>>(null)
  const scrollRafRef = useRef<Nullable<number>>(null)

  const enabled = Boolean(isAdmin && debugScrollAnchors)

  const anchored = useMemo(() => {
    if (rows.length === 0) return null
    if (
      scrollMaster &&
      logicalHint >= 0 &&
      logicalHint < rows.length
    ) {
      const logical = rows[logicalHint]
      if (logical && Math.abs(scrollTop - logical.scrollTop) <= 1) {
        return logical
      }
    }
    let out = rows[0]
    for (const row of rows) {
      if (scrollTop >= row.scrollTop) out = row
      else break
    }
    return out
  }, [rows, scrollTop, scrollMaster, logicalHint])

  useLayoutEffect(() => {
    if (!enabled) return
    return subscribeScrollDebugLogicalAnchor(() => {
      const next = getScrollDebugLogicalAnchorIndex()
      setLogicalHint((prev) => (prev === next ? prev : next))
    })
  }, [enabled])

  useLayoutEffect(() => {
    if (!enabled) {
      setRows([])
      return
    }

    const measure = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setRows(resolveAnchors({ fresh: true }))
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
  }, [enabled, currentSong, chordsEnabled, resolveAnchors])

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

  return (
    <>
      {/* Stay below Radix overlays (Dialog/Popover use z-50) and the fixed header (z-50). */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 z-10 overflow-visible min-h-0" aria-hidden>
        {rows.map((row, i) => {
          const color = COLORS[row.index % COLORS.length]
          const dupPrev = i > 0 && rows[i - 1]!.scrollTop === row.scrollTop
          const dupNext = i < rows.length - 1 && rows[i + 1]!.scrollTop === row.scrollTop
          const layoutY = row.contentTopInSongLines
          return (
            <div key={row.id}>
              <div
                className="absolute left-0 right-0 border-t-[3px]"
                style={{ top: layoutY, borderColor: color }}
              />
              <div
                className="absolute left-1 flex max-w-[min(100%,22rem)] flex-wrap gap-1 text-[10px] leading-tight font-mono text-white"
                style={{ top: layoutY + 3 }}
              >
                <span className="rounded px-1 py-0.5 shadow" style={{ backgroundColor: color }}>
                  {row.type}:{row.index} {row.title.length > 24 ? `${row.title.slice(0, 24)}...` : row.title}
                </span>
                <span className="rounded bg-black/80 px-1 py-0.5 shadow">
                  layout {Math.round(layoutY)} · snap {Math.round(row.scrollTop)}
                  {(dupPrev || dupNext) && ' · DUP'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed top-20 right-3 z-40 max-w-sm pointer-events-auto rounded bg-black/85 px-2 py-1.5 text-[11px] font-mono text-amber-200 shadow-lg">
        <div className="font-semibold text-white">Anchor scroll debug</div>
        <div className="mt-0.5 text-cyan-200">
          Anchored {anchored ? `${anchored.type}:${anchored.index}` : '—'} · scrollTop {Math.round(scrollTop)}
        </div>
        <div className="mt-0.5 text-[10px] text-white/80">
          Includes section + break anchors. Musician trigger threshold is 55vh.
        </div>
      </div>
    </>
  )
}
