import { useAutoScroller } from '@/lib/useAutoScroller'
import { useSong } from '@/lib/useSong'
import { useDispatch, useStore } from '@/store'
import { socket } from '@/utils/socket'
import { songChanged, songFileChanged, transpoChanged } from '@shared/messages/song'
import { LineType } from '@shared/types'
import { useMemo, useRef } from 'react'
import { useSongKeyboardShortcuts } from '../../lib/useSongKeyboardShortcuts'
import { useSongScroll } from '../../lib/useSongScroll'
import { NextInQueueIndicator } from '../Queue/NextInQueueIndicator'
import { EmptySong } from './EmptySong'
import { SongLine } from './SongLine'
import { SongWrapper } from './SongWrapper'

function stringToIndexedObjects(str: string) {
  const result: { index: number; content: string }[] = []
  let currentWord = ''
  let startIndex = -1

  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    if (c === '_') {
      if (currentWord !== '') {
        result.push({
          index: startIndex,
          content: currentWord
        })
        currentWord = ''
      }
      startIndex = i + 1
    } else if (/\s/.test(c)) {
      if (currentWord !== '') {
        result.push({
          index: startIndex,
          content: currentWord
        })
        currentWord = ''
        startIndex = -1
      }
    } else {
      if (startIndex === -1) {
        startIndex = i
      }
      currentWord += c
    }
  }

  if (currentWord !== '') {
    result.push({
      index: startIndex,
      content: currentWord
    })
  }

  return result
}

function injectChordsIntoLyrics(chordString: string, lyricsString: string) {
  const chordObjects = stringToIndexedObjects(chordString)

  // Find the maximum chord index to determine if we need padding
  const maxChordIndex = Math.max(...chordObjects.map((chord) => chord.index))

  // If we have chords beyond the lyrics length, pad the lyrics with spaces
  const paddedLyricsString = lyricsString.padEnd(maxChordIndex + 1, ' ')

  // Now, inject these chord objects into the lyrics string
  const result: (string | { index: number; content: string })[] = []
  let lastIndex = 0

  for (const chord of chordObjects) {
    if (chord.index > lastIndex) {
      result.push(paddedLyricsString.substring(lastIndex, chord.index))
    }
    result.push(chord)
    lastIndex = chord.index
  }

  // Add any remaining lyrics after the last chord
  if (lastIndex < paddedLyricsString.length) {
    result.push(paddedLyricsString.substring(lastIndex))
  }

  return result
}

export const SongComponent = () => {
  const { currentSong, drummerMode } = useStore()
  const dispatch = useDispatch()
  const { song, reload } = useSong(currentSong ?? undefined)
  const scroller = useAutoScroller()
  const reloadKey = useRef(0)

  useSongScroll(scroller)

  useSongKeyboardShortcuts({
    scroller,
    reload
  })

  songChanged.client.useMessage(socket, (payload) => {
    dispatch({ currentSong: payload.title })
  })

  transpoChanged.client.useMessage(socket, ({ transpo }) => {
    dispatch({ transpo })
  })

  songFileChanged.client.useMessage(
    socket,
    ({ filename }) => {
      if (filename.replace('.txt', '') === song?.filename) {
        reload()
        reloadKey.current++
      }
    },
    [song, reload]
  )

  type ParsedLine =
    | { type: LineType; content: string }
    | { type: LineType.ChordsAndLyrics; content: (string | { index: number; content: string })[] }
  const parsedSongLines = useMemo((): ParsedLine[] => {
    if (!song) return []
    const result: ParsedLine[] = []
    let nextIndexSplit

    song.lines.forEach((line, index) => {
      const nextIndex = index + 1
      const nextLine = nextIndex < song.lines.length ? song.lines[nextIndex] : null

      if (drummerMode && line.type === LineType.Chords) {
        result.push({
          type: LineType.Chords,
          content: 'Boum Tchac Boum Boum Tchac | Boum Tchac  Boum Boum Tchac '
        })
        return
      }

      if (line.type === LineType.Chords && nextLine?.type === LineType.Lyrics) {
        const lyricsLine =
          nextLine.content.length > line.content.length * 0.8
            ? nextLine.content
            : `${nextLine.content}${new Array(line.content.length - nextLine.content.length)
                .fill(' ')
                .map(() => '        ')
                .join('')}`

        const newLine = injectChordsIntoLyrics(line.content, lyricsLine)

        result.push({
          type: LineType.ChordsAndLyrics,
          content: newLine
        })
        nextIndexSplit = nextIndex
      } else {
        if (nextIndexSplit === index) return
        result.push(line)
      }
    })

    return result
  }, [song?.title, drummerMode, reloadKey.current])

  if (!song || !currentSong) return <EmptySong />

  return (
    <>
      <SongWrapper>
        {parsedSongLines.map((line, id) => (
          <SongLine key={id} {...line} />
        ))}
        <NextInQueueIndicator />
      </SongWrapper>
    </>
  )
}
