import type { SectionVoice, VoiceSegment } from '@shared/lib/song/voices'
import { LineType } from '@shared/types'
import { FC } from 'react'
import { BreakLine } from './BreakLine'
import { ChordsAndLyrics } from './ChordAndLyrics'
import { ChordLine } from './ChordLine'
import { Lyrics } from './Lyrics'
import { Section } from './Section'
import { Spacer } from './Spacer'

export type ChordsAndLyricsContent = (string | { index: number; content: string })[]

export interface SongLineData {
  type: LineType
  content: string | ChordsAndLyricsContent
  /** Duets only: who sings each part of the lyric line. */
  voiceSegments?: VoiceSegment[]
  /** Duets only: singer named in the section header. */
  sectionVoice?: SectionVoice
}

export const SongLine: FC<SongLineData> = ({ type, content, voiceSegments, sectionVoice }) => {
  switch (type) {
    case LineType.Section:
      return <Section content={content as string} sectionVoice={sectionVoice} />

    case LineType.Spacer:
      return <Spacer content={content as string} />

    case LineType.break:
      return <BreakLine />

    case LineType.visualBreak:
      return <div className="line-break" aria-hidden />

    case LineType.Chords:
      return <ChordLine content={content as string} />

    case LineType.ChordsAndLyrics:
      return <ChordsAndLyrics content={content as ChordsAndLyricsContent} voiceSegments={voiceSegments} />

    case LineType.Lyrics:
      return <Lyrics content={content as string} voiceSegments={voiceSegments} />
    default:
      return <Lyrics content={content as string} />
  }
}
