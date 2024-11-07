import { Chord } from '@shared/lib/song/chord'
import { FC } from 'react'
import { ChordLabel } from './Chord'

export const ChordOrWord: FC<{ content: string }> = ({ content }) => {
  const chordLabel = content.replace('|', '')
  const isChord = Chord.isChord(chordLabel)
  const hasBar = content.startsWith('|')

  return (
    <span className="chord-font font-mono">
      {isChord && hasBar && '|'}
      {isChord ? <ChordLabel label={chordLabel} /> : content.replace('_', ' ')}
    </span>
  )
}
