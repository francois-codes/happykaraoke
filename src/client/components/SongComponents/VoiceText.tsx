import type { VoiceSegment } from '@shared/lib/song/voices'
import { Fragment, ReactNode } from 'react'

/**
 * Paints the characters `text[from, to)` with the voice segments of their line.
 * Only colours and backgrounds change: every character stays in place (see .voice-* in base.css).
 */
export function paintVoices(text: string, from: number, segments: VoiceSegment[] | undefined): ReactNode {
  if (!segments) return text
  const to = from + text.length
  const parts: ReactNode[] = []
  for (const s of segments) {
    const start = Math.max(s.start, from)
    const end = Math.min(s.end, to)
    if (start >= end) continue
    const slice = text.slice(start - from, end - from)
    const className = s.kind === 'indication' ? 'voice-indication' : `voice-${s.kind} voice-${s.voice ?? 'none'}`
    parts.push(
      <span key={start} className={className} data-voice-name={s.kind === 'tag' ? s.name : undefined}>
        {slice}
      </span>
    )
  }
  // Characters past the last segment (padding added for chords beyond the lyrics).
  const covered = segments.reduce((max, s) => Math.max(max, s.end), 0)
  if (covered < to) parts.push(<Fragment key="rest">{text.slice(Math.max(covered - from, 0))}</Fragment>)
  return parts
}
