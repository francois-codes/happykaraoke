import { useAutoScroller } from '@/lib/useAutoScroller'
import { useSong } from '@/lib/useSong'
import { useDispatch, useStore } from '@/store'
import { socket } from '@/utils/socket'
import { songChanged, songFileChanged, transpoChanged } from '@shared/messages/song'
import { NextInQueueIndicator } from '../Queue/NextInQueueIndicator'
import { EmptySong } from './EmptySong'
import { SongLine } from './SongLine'
import { SongWrapper } from './SongWrapper'
import { useSongKeyboardShortcuts } from './useSongKeyboardShortcuts'
import { useSongScroll } from './useSongScroll'

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

  if (!song || !currentSong) return <EmptySong />

  return (
    <>
      <SongWrapper>
        {song.lines.map((line, id) => (
          <SongLine key={id} {...line} />
        ))}
        <NextInQueueIndicator />
      </SongWrapper>
    </>
  )
}
