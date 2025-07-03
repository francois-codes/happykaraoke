import { useStore } from '@/store'
import { Fragment, useCallback } from 'react'
import { ChordLabel } from './Chord'

function simplifyChord(content: string, guitaristMode: boolean) {
  if (!guitaristMode) return content.replace('_', ' ')

  const [chord] = content.split('/')

  return chord
}

export function ChordsAndLyrics({
  content
}: {
  content: (string | { index: number; content: string })[]
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
            <span className="bg-gray-200 dark:bg-gray-600 px-[4px] -my-[2px] -my-[4px]">
              <ChordLabel label={chordLabel(content.slice(1).trim())} />
            </span>
          </>
        )
      }

      const extraStyle = content.startsWith('<') ? '-ml-4' : ''

      return (
        <span
          className={`bg-gray-200 dark:bg-gray-600 px-[4px] -my-[2px] -my-[4px] relative ${extraStyle}`}
        >
          <ChordLabel label={chordLabel(content).replace('<', '')} />
        </span>
      )
    },
    [chordLabel]
  )

  return (
    <div className="block">
      <div className={`chords-and-lyrics ${chordsEnabled ? '' : 'lyrics-only-font'}`}>
        {content.map((inner, index) =>
          typeof inner === 'string' ? (
            <Fragment key={index}>{inner}</Fragment>
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
