import { LineType } from '@shared/types'
import { FC } from 'react'
import { BreakLine } from './BreakLine'
import { ChordsAndLyrics } from './ChordAndLyrics'
import { ChordLine } from './ChordLine'
import { Lyrics } from './Lyrics'
import { Section } from './Section'
import { Spacer } from './Spacer'

type ParsedLine =
  | { type: LineType; content: string }
  | { type: LineType.ChordsAndLyrics; content: (string | { index: number; content: string })[] }

export const SongLine: FC<ParsedLine> = ({ type, content }) => {
  switch (type) {
    case LineType.Section:
      return <Section content={content as string} />

    case LineType.Spacer:
      return <Spacer content={content as string} />

    case LineType.break:
      return <BreakLine />

    case LineType.Chords:
      return <ChordLine content={content as string} />

    case LineType.ChordsAndLyrics:
      return <ChordsAndLyrics content={content as (string | { index: number; content: string })[]} />

    case LineType.Lyrics:
      return <Lyrics content={content as string} />
    default:
      return <Lyrics content={content as string} />
  }
}
