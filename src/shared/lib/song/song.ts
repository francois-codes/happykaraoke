import { ISong, ISongLine, LineType } from '../../types'
import path from 'path'
import { Chord } from './chord'
import { readFileSync } from 'fs'

export const songsFolder = path.resolve(process.cwd(), './src/data/songs')

export class Song {
  fileName: string
  rawContent?: string
  songData?: ISong

  constructor(fileName: string) {
    this.fileName = fileName
  }

  load() {
    const file = readFileSync(path.resolve(songsFolder, this.fileName + '.txt'))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [title, author, key, tags, _, ...lines] = file.toString().split(/\r?\n/)

    this.songData = {
      title,
      author,
      key,
      tags: tags.split(' '),
      lines: this.parseLines(lines)
    }

    return this.songData
  }

  private parseLines(lines: string[]): ISongLine[] {
    const songLines = lines.map((line) => {
      if (line === '') {
        return {
          type: LineType.break,
          content: '(...)'
        }
      }

      if (line.startsWith('#')) {
        return {
          type: LineType.Section,
          content: line
        }
      }

      if (this.hasChords(line)) {
        return {
          type: LineType.Chords,
          content: line
        }
      }

      return {
        type: LineType.Lyrics,
        content: line
      }
    })

    return songLines.map((line, index) => {
      if (
        line.type === LineType.break &&
        index > 1 &&
        songLines[index - 1].type === LineType.Chords
      ) {
        return {
          type: LineType.Spacer,
          content: '(...)'
        }
      }

      if (index > 1 && songLines[index - 1].type === LineType.Section) {
        if (line.content !== '') {
          return {
            ...line,
            type: LineType.Chords
          }
        }
      }

      if (index > 1 && songLines[index - 1].type === LineType.Chords) {
        return {
          ...line,
          type: LineType.Lyrics
        }
      }

      return line
    })
  }

  private hasChords(line: string) {
    const trimmedLine = line.trim()

    return (
      Chord.CHORD_REGEX.test(line) ||
      Chord.CHORD_STARTERS.some((str) => trimmedLine.startsWith(str))
    )
  }
}
