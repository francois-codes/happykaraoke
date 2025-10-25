import { LineType, SongLine as SongLineType } from '@shared/types'
import { FC } from 'react'
import { BreakLine } from './BreakLine'
import { ChordsAndLyrics } from './ChordAndLyrics'
import { ChordLine } from './ChordLine'
import { Lyrics } from './Lyrics'
import { Section } from './Section'
import { Spacer } from './Spacer'

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

    case LineType.ChordsAndLyrics:
      return <ChordsAndLyrics content={content} />

    case LineType.Lyrics:
      return <Lyrics content={content} />
    default:
      return <Lyrics content={content} />
  }
}
