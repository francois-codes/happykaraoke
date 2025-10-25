import fs from 'fs'
import path from 'path'
import { LineType, SongData, SongLine } from '../../types'
import { getSessionConfig } from '../session'
import { Chord } from './chord'

export class Song {
  filename: string
  rawContent?: string
  songData?: SongData

  constructor(filename: string) {
    this.filename = filename
  }

  load() {
    const file = this.loadSongFile()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [title, author, key, tags, _, ...lines] = file?.toString().split(/\r?\n/) || []

    this.songData = {
      title,
      author,
      key,
      tags: tags.split(' '),
      lines: this.parseLines(lines, title),
      filename: this.filename
    }

    return this.songData
  }

  private loadSongFile() {
    try {
      return fs?.readFileSync(path.resolve(getSessionConfig().songsFolder, this.filename + '.txt'))
    } catch (e) {
      // trying to find the file with a different case, and potentially some extra spaces
      const files = fs.readdirSync(getSessionConfig().songsFolder)
      const file = files.find(
        (f) => f.replace('.txt', '').trim().toLowerCase() === this.filename.toLowerCase()
      )
      if (file) {
        return fs.readFileSync(path.resolve(getSessionConfig().songsFolder, file))
      }
    }

    throw new Error('Song not found')
  }

  private parseLines(lines: string[], title: string): SongLine[] {
    const songLines = lines.map((line) => {
      if (line === '') {
        return {
          type: LineType.break,
          content: '(...)'
        }
      }

      if (line.startsWith('#') || line.startsWith('[')) {
        return {
          type: LineType.Section,
          content: line
        }
      }

      if (this.isChordLine(line)) {
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

    const parsedLines = songLines.map((line, index) => {
      if (
        line.type === LineType.break &&
        index > 1 &&
        songLines[index - 1].type === LineType.Lyrics &&
        songLines[index + 1]?.type === LineType.Chords
      ) {
        return {
          type: LineType.Section,
          content: ''
        }
      }

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

    return parsedLines
  }

  private isChordLine(line: string) {
    const words = line.replace('_', '|').replace(/\(|\)/g, '').split(' ').filter(Boolean)



    return words.every((word) => Chord.CHORD_REGEX.test(word) || Chord.CHORD_STARTERS.some((str) => line.trim().startsWith(str)) || isSeparator(word) || isSignature(word))
  }
}

function isSeparator(word: string) {
  return word === '|' || word === 'N.C' || word === 'NC' || word === '_'
}

function isSignature(word: string) {
  // returns true of "word" is a music signature (i.e. 4/4, 3/4, 6/8, etc.)
  return /^\d+\/\d+$/.test(word)
}
