import { SongLineProps } from '@shared/types'
import { FC } from 'react'
import { ChordLabel } from './Chord'
import { Chord } from '@shared/lib/song/chord'
import { useStore } from '@/store'

export const ChordLine: FC<SongLineProps> = ({ content }) => {
  const hasPrefix = content.startsWith('<')
  const chordLine = hasPrefix ? content.replace('<', '') : content
  const className = hasPrefix ? '-ml-4' : ''
  const { chordsEnabled } = useStore()

  return (
    <pre className={className}>
      {chordLine.split(/(\s+)/).map((word, id) => {
        const chordLabel = word.replace('|', '')
        const isChord = Chord.isChord(chordLabel)
        const hasBar = word.startsWith('|')

        return (
          <span key={id} className={chordsEnabled ? 'font-mono' : ''}>
            {isChord && hasBar && '|'}
            {isChord ? <ChordLabel label={chordLabel} /> : word}
          </span>
        )
      })}
    </pre>
  )
}
