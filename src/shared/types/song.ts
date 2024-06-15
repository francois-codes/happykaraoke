export interface ISong {
  title: string
  author: string
  key: string
  tags: string[]
  lines: ISongLine[]
}

export enum LineType {
  Lyrics = 'lyrics',
  Chords = 'chords',
  Section = 'section',
  Spacer = 'spacer',
  break = 'break'
}

export interface ISongLine {
  content: string
  type: LineType
}

export interface SongLineProps {
  content: string
}
