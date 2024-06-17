import { SongLine as SongLineType, LineType } from '@shared/types'
import { FC } from 'react'
import { ChordLine } from './ChordLine'
import { Lyrics } from './Lyrics'
import { BreakLine } from './BreakLine'
import { Spacer } from './Spacer'
import { Section } from './Section'

interface SongLineProps extends SongLineType {}

export const SongLine: FC<SongLineProps> = ({ type, content }) => {
  switch (type) {
    case LineType.Section:
      return <Section content={content} />

    case LineType.Spacer:
      return <Spacer content={content} />

    case LineType.break:
      return <BreakLine />

    case LineType.Chords:
      return <ChordLine content={content} />

    case LineType.Lyrics:
    default:
      return <Lyrics content={content} />
  }
}
