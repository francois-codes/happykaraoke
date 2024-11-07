import { useAutoScroller } from '@/lib/useAutoScroller'
import { useSong } from '@/lib/useSong'
import { useDispatch, useStore } from '@/store'
import { socket } from '@/utils/socket'
import { songChanged, songFileChanged, transpoChanged } from '@shared/messages/song'
import { LineType } from '@shared/types'
import { useMemo } from 'react'
import { NextInQueueIndicator } from '../Queue/NextInQueueIndicator'
import { EmptySong } from './EmptySong'
import { SongLine } from './SongLine'
import { SongWrapper } from './SongWrapper'
import { useSongKeyboardShortcuts } from './useSongKeyboardShortcuts'
import { useSongScroll } from './useSongScroll'

function stringToIndexedObjects(str) {
  const result: { index: number; content: string }[] = []
  let currentWord = ''
  let startIndex = -1

  for (let i = 0; i < str.length; i++) {
    if (str[i] !== ' ') {
      if (startIndex === -1) {
        startIndex = i
      }
      currentWord += str[i]
    } else if (currentWord !== '') {
      result.push({
        index: startIndex,
        content: currentWord
      })
      currentWord = ''
      startIndex = -1
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

  // Now, inject these chord objects into the lyrics string
  const result: (string | { index: number; content: string })[] = []
  let lastIndex = 0

  for (const chord of chordObjects) {
    if (chord.index > lastIndex) {
      result.push(lyricsString.substring(lastIndex, chord.index))
    }
    result.push(chord)
    lastIndex = chord.index
  }

  // Add any remaining lyrics after the last chord
  if (lastIndex < lyricsString.length) {
    result.push(lyricsString.substring(lastIndex))
  }

  return result
}

export const SongComponent = () => {
  const { currentSong } = useStore()
  const dispatch = useDispatch()
  const { song, reload } = useSong(currentSong ?? undefined)
  const scroller = useAutoScroller()

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
      }
    },
    [song, reload]
  )

  const parsedSongLines = useMemo(() => {
    if (!song) return []
    const result: typeof song.lines = []
    let nextIndexSplit

    song.lines.forEach((line, index) => {
      const nextIndex = index + 1
      const nextLine = nextIndex < song.lines.length ? song.lines[nextIndex] : null

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
  }, [song?.title])

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
