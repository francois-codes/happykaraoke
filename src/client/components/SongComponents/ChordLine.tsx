import { useStore } from '@/store'
import { SongLineProps } from '@shared/types'
import { FC } from 'react'
import { ChordOrWord } from './ChordOrWord'

export const ChordLine: FC<SongLineProps> = ({ content }) => {
  const hasPrefix = content.startsWith('<')
  const chordLine = hasPrefix ? content.replace('<', '') : content
  const className = hasPrefix ? '-ml-4' : ''
  const { chordsEnabled } = useStore()

  if (!chordsEnabled) return <div className="line-chords-collapsed" aria-hidden />

  return (
    <pre className={`line flex items-center chord-height ${className}`}>
      {chordLine.split(/(\s+)|_/g).map((word, id) => {
        if (!word) return ' '
        return <ChordOrWord content={word} key={id} />
      })}
    </pre>
  )
}
