import { useStore } from '@/store'
import type { VoiceSegment } from '@shared/lib/song/voices'
import { Fragment, useCallback } from 'react'
import { ChordLabel } from './Chord'
import { paintVoices } from './VoiceText'

function simplifyChord(content: string, guitaristMode: boolean) {
  if (!guitaristMode) return content.replace('_', ' ')

  const [chord] = content.split('/')

  return chord
}

export function ChordsAndLyrics({
  content,
  voiceSegments
}: {
  content: (string | { index: number; content: string })[]
  voiceSegments?: VoiceSegment[]
}) {
  const { chordsEnabled, guitaristMode } = useStore()

  const chordLabel = useCallback(
    (content: string) => simplifyChord(content, guitaristMode),
    [guitaristMode]
  )

  const sanitize = useCallback((content: string) => {
    return content.trim()
  }, [])

  const renderContent = useCallback(
    (content: string) => {
      if (content === '|' || content.includes('/4') || content.includes('/8')) return <>{content}</>
      if (content.startsWith('|')) {
        return (
          <>
            <>{content.charAt(0)}</>
            <span className=" px-[4px] -mx-[2px] -my-[4px]">
              <ChordLabel label={chordLabel(content.slice(1).trim())} />
            </span>
          </>
        )
      }

      const extraStyle = content.startsWith('<') ? '-ml-4' : ''

      return (
        <span
          className={` px-[4px] -mx-[2px] -my-[4px] relative ${extraStyle}`}
        >
          <ChordLabel label={chordLabel(content).replace('<', '')} />
        </span>
      )
    },
    [chordLabel]
  )

  // Start of each lyric piece in the line, to match the voice segments.
  const offsets: number[] = []
  content.reduce((offset, inner, index) => {
    offsets[index] = offset
    return typeof inner === 'string' ? offset + inner.length : offset
  }, 0)

  return (
    <div className="block">
      <div className="chords-and-lyrics">
        {content.map((inner, index) =>
          typeof inner === 'string' ? (
            <Fragment key={index}>{paintVoices(inner, offsets[index], voiceSegments)}</Fragment>
          ) : chordsEnabled ? (
            <span className="chord-card chord-font" key={index}>
              {renderContent(sanitize(inner.content))}
            </span>
          ) : (
            <Fragment key={index}></Fragment>
          )
        )}
      </div>
    </div>
  )
}
