import { useScrollContext } from '@/contexts/scroll'
import { useAutoScroller } from '@/lib/useAutoScroller'
import { useStore } from '@/store'
import { socket } from '@/utils/socket'
import { setScroll } from '@shared/endpoints/scroll'
import { scrollChanged } from '@shared/messages/scroll'
import { ScrollEventType } from '@shared/types/scroll'
import { useCallback, useEffect, useRef } from 'react'

const getLineHeight = () => {
  const { innerHeight, innerWidth } = window
  return Math.min(innerHeight, innerWidth)
}

export function useSongScroll(scroller: ReturnType<typeof useAutoScroller>) {
  const { isAdmin, currentSong, musicienScroll } = useStore()
  const scrollContainerRef = useScrollContext()

  const currentScrollRef = useRef<number | null>(0)

  scrollChanged.client.useMessage(
    socket,
    ({ type, value }) => {
      if (isAdmin) {
        return
      }

      const top = Number(value)
      const scrollTarget = top * getLineHeight()

      switch (type) {
        case ScrollEventType.START:
          currentScrollRef.current = scrollTarget
          return scroller.startScrolling()
        case ScrollEventType.STOP:
          currentScrollRef.current = scrollTarget
          return scroller.stopScrolling()
        case ScrollEventType.TOGGLE:
          if (musicienScroll) return
          currentScrollRef.current = scrollTarget
          return scroller.toggleScrolling()
        case ScrollEventType.FASTER:
          currentScrollRef.current = scrollTarget
          return scroller.increaseScrollSpeed()
        case ScrollEventType.SLOWER:
          currentScrollRef.current = scrollTarget
          return scroller.decreaseScrollSpeed()
        case ScrollEventType.TOP:
          currentScrollRef.current = scrollTarget
          return scroller.scrollToTop()
        case ScrollEventType.POSITION: {
          if (musicienScroll) {
            const currentScroll = currentScrollRef.current ?? 0
            if (
              Math.round(scrollTarget) >= Math.round(currentScroll) &&
              scrollTarget - currentScroll < window.innerHeight / 2
            ) {
              return
            }
          }

          currentScrollRef.current = scrollTarget

          if (!Number.isNaN(top)) {
            return scroller.scrollTo(top * getLineHeight())
          }
        }
      }
    },
    [scroller, isAdmin, musicienScroll]
  )

  const followScroll = useCallback(() => {
    const scrollTarget = Number(scrollContainerRef.current?.scrollTop)

    if (!Number.isNaN(scrollTarget)) {
      setScroll.call({
        type: ScrollEventType.POSITION,
        value: scrollTarget / getLineHeight()
      })
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    scrollContainerRef.current?.addEventListener('scrollend', followScroll)

    return () => {
      scrollContainerRef.current?.removeEventListener('scrollend', followScroll)
    }
  }, [followScroll, scroller])

  useEffect(() => {
    if (currentSong) {
      currentScrollRef.current = 0
      scroller.scrollToTop()
    }
  }, [currentSong])
}
