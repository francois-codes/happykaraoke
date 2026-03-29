export interface SongData {
  title: string
  author: string
  key: string
  tags: string[]
  lines: SongLine[]
  filename: string
}

export enum LineType {
  Lyrics = 'lyrics',
  Chords = 'chords',
  Section = 'section',
  Spacer = 'spacer',
  /** Same vertical space as `break` but not a scroll anchor (gaps around section headers). */
  visualBreak = 'visualBreak',
  break = 'break',
  Tab = 'tab',
  ChordsAndLyrics = 'chordsAndLyrics'
}

export interface SongLine {
  content: string
  type: LineType
}

export interface SongLineProps {
  content: string
}
