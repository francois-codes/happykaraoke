import { SongWrapper } from './SongWrapper'
import { SongLine } from './SongLine'
import { useSong } from '@/lib/useSong'
import { useDispatch, useStore } from '@/store'
import { socket } from '@/utils/socket'

import { songChanged, songFileChanged, transpoChanged } from '@shared/messages/song'
import { EmptySong } from './EmptySong'
import { useSongKeyboardShortcuts } from './useSongKeyboardShortcuts'
import { useSongScroll } from './useSongScroll'
import { useAutoScroller } from '@/lib/useAutoScroller'
import { useNextInQueue } from './useNextInQueue'
import { Button } from '../ui/button'

export const SongComponent = () => {
  const { currentSong, isAdmin } = useStore()
  const dispatch = useDispatch()
  const { song, reload } = useSong(currentSong ?? undefined)
  const scroller = useAutoScroller()
  const { nextInQueue, playNextInQueue } = useNextInQueue()

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
        <div className="mt-16">
          {nextInQueue &&
            (isAdmin ? (
              <Button onClick={playNextInQueue}>Lancer {nextInQueue.song}</Button>
            ) : (
              <div className="text-xl font-bold">
                Prochaine chanson
                <br />
                {nextInQueue.song}
              </div>
            ))}
        </div>
      </SongWrapper>
    </>
  )
}
