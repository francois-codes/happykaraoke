import { useStore } from '@/store'
import { Chord } from '@shared/lib/song/chord'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'
import { ChordLabel } from './Chord'

export const ChordLine: FC<SongLineProps> = ({ content }) => {
  const hasPrefix = content.startsWith('<')
  const chordLine = hasPrefix ? content.replace('<', '') : content
  const className = hasPrefix ? '-ml-4' : ''
  const { chordsEnabled } = useStore()

  if (!chordsEnabled) return <div className="line-chords-collapsed" />

  return (
    <pre className={`line flex items-center pt-2 ${className}`}>
      {chordLine.split(/(\s+)|_/g).map((word, id) => {
        if (!word) return ' '
        const chordLabel = word.replace('|', '')
        const isChord = Chord.isChord(chordLabel)
        const hasBar = word.startsWith('|')

        return (
          <span key={id} className="chord-font font-mono">
            {isChord && hasBar && '|'}
            {isChord ? <ChordLabel label={chordLabel} /> : word}
          </span>
        )
      })}
    </pre>
  )
}
