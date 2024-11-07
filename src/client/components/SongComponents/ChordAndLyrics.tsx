import { useStore } from '@/store'
import { Fragment } from 'react'
import { ChordOrWord } from './ChordOrWord'

export function ChordsAndLyrics({
  content
}: {
  content: (string | { index: number; content: string })[]
}) {
  const { chordsEnabled } = useStore()

  return (
    <div className="block">
      <div className={`chords-and-lyrics ${chordsEnabled ? '' : 'lyrics-only-font'}`}>
        {content.map((inner, index) =>
          typeof inner === 'string' ? (
            <Fragment key={index}>{inner}</Fragment>
          ) : chordsEnabled ? (
            <span
              className="chord-card chord-font bg-gray-200 dark:bg-gray-600 px-[4px] -my-[2px] -my-[4px]"
              key={index}
            >
              <ChordOrWord content={inner.content} />
            </span>
          ) : (
            <Fragment key={index}></Fragment>
          )
        )}
      </div>
    </div>
  )
}
