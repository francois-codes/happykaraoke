import { useStore } from '@/store'
import { Chord } from '@shared/lib/song/chord'
import { FC } from 'react'
import { ChordLabel } from './Chord'

function simplifyChord(content: string, guitaristMode: boolean) {
  if (!guitaristMode) return content.replace('_', ' ')

  const [chord] = content.split('/')

  return chord
}

export const ChordOrWord: FC<{ content: string }> = ({ content }) => {
  const chordLabel = content.replace('|', '')
  const isChord = Chord.isChord(chordLabel)
  const hasBar = content.startsWith('|')
  const { guitaristMode } = useStore()

  return (
    <span className="chord-font font-mono">
      {isChord && hasBar && '|'}
      {isChord ? (
        <ChordLabel label={simplifyChord(chordLabel, guitaristMode)} />
      ) : (
        content.replace('_', ' ')
      )}
    </span>
  )
}
