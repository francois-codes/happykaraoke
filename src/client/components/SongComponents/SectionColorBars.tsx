import { useStore } from '@/store'
import { type ReactElement, useLayoutEffect, useRef, useState } from 'react'

interface SectionColorBar {
  kind: string
  top: number
  height: number
}

/**
 * Measures `.song-section` headings in #song-lines and returns one bar per coloured section,
 * from its heading to the next titled heading (untitled headings continue the current section).
 */
function measureSectionBars(songLines: HTMLElement): SectionColorBar[] {
  const headings = Array.from(songLines.querySelectorAll<HTMLElement>(':scope > .song-section'))
  const end = songLines.querySelector<HTMLElement>(':scope > [data-song-end]')?.offsetTop ?? songLines.scrollHeight
  const titled = headings.filter((heading) => (heading.textContent ?? '').trim() !== '')

  return titled.flatMap((heading, index): SectionColorBar[] => {
    const kind = heading.dataset.sectionKind
    if (!kind) return []
    const next = titled[index + 1]
    // Stop before the blank gap that precedes the next heading.
    const nextGap = next?.previousElementSibling
    const bottom = nextGap instanceof HTMLElement ? nextGap.offsetTop : (next?.offsetTop ?? end)
    const top = heading.offsetTop
    return bottom > top ? [{ kind, top, height: bottom - top }] : []
  })
}

/** Coloured bar per section family, chords mode only. Absolute overlay: never affects layout or scroll anchors. */
export function SectionColorBars(): ReactElement | null {
  const { chordsEnabled, currentSong } = useStore()
  const [bars, setBars] = useState<SectionColorBar[]>([])
  const rafRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (!chordsEnabled) {
      setBars([])
      return
    }
    const songLines = document.getElementById('song-lines')
    if (!(songLines instanceof HTMLElement)) return

    const schedule = (): void => {
      if (rafRef.current != null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        setBars(measureSectionBars(songLines))
      })
    }

    schedule()
    const resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(songLines)
    const mutationObserver = new MutationObserver(schedule)
    mutationObserver.observe(songLines, { childList: true })
    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [chordsEnabled, currentSong])

  if (!chordsEnabled || bars.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {bars.map((bar) => (
        <div
          key={`${bar.kind}-${bar.top}`}
          className="section-color-bar"
          data-section-kind={bar.kind}
          style={{ top: bar.top, height: bar.height, left: -10 }}
        />
      ))}
    </div>
  )
}
