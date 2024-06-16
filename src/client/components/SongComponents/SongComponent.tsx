import { useCallback, useEffect, useState } from 'react'
import { SongWrapper } from './SongWrapper'
import { SongLine } from './SongLine'
import { useSong } from '@/lib/useSong'
import { useDispatch, useStore } from '@/store'
import { scrollChanged } from '@shared/messages/scroll'
import { socket } from '@/utils/socket'
import { ScrollEventType } from '@shared/types/scroll'
import { transposeChord } from '@shared/lib/transpose/tonality'
import { useAutoScroller } from '@/lib/useAutoScroller'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { KEYS } from '@/lib/consts'
import { setScroll } from '@shared/endpoints/scroll'
import { songChanged, transpoChanged } from '@shared/messages/song'
import { EmptySong } from './EmptySong'

export const SongComponent = () => {
  const { transpo, isAdmin, currentSong, searchOpen, transpoOpen, songsFolder } = useStore()
  const dispatch = useDispatch()
  const { song, reload } = useSong(currentSong ?? undefined)

  const [scrolling, setScrolling] = useState(false)
  const [currentSongFolder, setCurrentSongFolder] = useState(songsFolder)

  const scroller = useAutoScroller()

  scrollChanged.client.useMessage(
    socket,
    ({ type, value }) => {
      if (isAdmin) {
        return
      }

      const action = scrolling ? scroller.stopScrolling : scroller.startScrolling

      switch (type) {
        case ScrollEventType.START:
          action()
          return setScrolling(!scrolling)
        case ScrollEventType.STOP:
          action()
          return setScrolling(!scrolling)
        case ScrollEventType.FASTER:
          return scroller.increaseScrollSpeed()
        case ScrollEventType.SLOWER:
          return scroller.decreaseScrollSpeed()
        case ScrollEventType.TOP:
          scroller.stopScrolling()
          setScrolling(false)
          return scroller.scrollToTop()
        case ScrollEventType.POSITION:
          if (value && !Number.isNaN(value)) {
            return scroller.scrollTo(value)
          }
      }
    },
    [scrolling, setScrolling, scroller, isAdmin]
  )

  songChanged.client.useMessage(socket, (payload) => {
    dispatch({ currentSong: payload.title })
  })

  transpoChanged.client.useMessage(socket, ({ transpo }) => {
    dispatch({ transpo })
  })

  const followScroll = useCallback(() => {
    if (isAdmin && !scrolling) {
      setScroll.call({ type: ScrollEventType.POSITION, value: scroller.element?.scrollTop })
    }
  }, [scroller.element, scrolling, isAdmin])

  useEffect(() => {
    scroller.element?.addEventListener('scrollend', followScroll)

    return () => {
      scroller?.element?.removeEventListener('scrollend', followScroll)
    }
  }, [followScroll, scroller])

  useKeyboardShortcut(
    {
      key: [KEYS.r],
      modifier: [KEYS.Meta, KEYS.Ctrl],
      preventDefault: true,
      handler: () => {
        reload()
      }
    },
    [reload]
  )

  useKeyboardShortcut(
    {
      key: [KEYS.t],
      preventDefault: true,
      disable: () => {
        return !isAdmin || searchOpen
      },
      handler: () => {
        dispatch({ transpoOpen: true })
      }
    },
    [isAdmin, searchOpen]
  )

  useKeyboardShortcut(
    {
      key: [KEYS.dollarSign],
      preventDefault: true,
      disable: () => {
        return !isAdmin || searchOpen
      },
      handler: (e) => {
        e.preventDefault()
        const action = scrolling ? scroller.stopScrolling : scroller.startScrolling
        action()

        setScrolling(!scrolling)
        setScroll.call({
          type: scrolling ? ScrollEventType.STOP : ScrollEventType.START
        })
      }
    },
    [scrolling, scroller, isAdmin, searchOpen]
  )

  useKeyboardShortcut(
    {
      key: KEYS.add,
      disable: () => !isAdmin,
      handler: () => {
        scroller.increaseScrollSpeed()
        setScroll.call({ type: ScrollEventType.FASTER })
      }
    },
    [scroller, isAdmin]
  )

  useKeyboardShortcut(
    {
      key: KEYS.subtract,
      disable: () => !isAdmin,
      handler: () => {
        if (!isAdmin) return
        scroller.decreaseScrollSpeed()
        setScroll.call({ type: ScrollEventType.SLOWER })
      }
    },
    [scroller, isAdmin]
  )

  useKeyboardShortcut(
    {
      key: KEYS.up,
      disable: () => {
        return !isAdmin || searchOpen || transpoOpen
      },
      handler: (event) => {
        event.preventDefault()
        scroller.stopScrolling()
        setScrolling(false)

        scroller.scrollToTop()
        setScroll.call({ type: ScrollEventType.TOP })
      }
    },
    [scroller, isAdmin, searchOpen, transpoOpen]
  )

  useEffect(() => {
    if (songsFolder && songsFolder !== currentSongFolder) {
      reload()
      setCurrentSongFolder(songsFolder)
    }
  }, [reload, songsFolder, currentSongFolder])

  if (!song) return <EmptySong />

  return (
    <>
      <SongWrapper>
        <div className="pb-4">
          <h2 className="font-bold">{transposeChord(song.key, transpo, song.key)}</h2>
        </div>
        {song.lines.map((line, id) => (
          <SongLine key={id} {...line} />
        ))}
      </SongWrapper>
    </>
  )
}
