import { useScrollContext } from '@/contexts/scroll'
import { useAutoScroller } from '@/lib/useAutoScroller'
import { useStore } from '@/store'
import { socket } from '@/utils/socket'
import { setScroll } from '@shared/endpoints/scroll'
import { scrollChanged } from '@shared/messages/scroll'
import { ScrollEventType } from '@shared/types/scroll'
import { useCallback, useEffect } from 'react'

export function useSongScroll(scroller: ReturnType<typeof useAutoScroller>) {
  const { isAdmin, currentSong } = useStore()
  const scrollContainerRef = useScrollContext()

  scrollChanged.client.useMessage(
    socket,
    ({ type, value }) => {
      if (isAdmin) {
        return
      }

      const top = Number(value)

      switch (type) {
        case ScrollEventType.START:
          return scroller.startScrolling()
        case ScrollEventType.STOP:
          return scroller.stopScrolling()
        case ScrollEventType.TOGGLE:
          return scroller.toggleScrolling()
        case ScrollEventType.FASTER:
          return scroller.increaseScrollSpeed()
        case ScrollEventType.SLOWER:
          return scroller.decreaseScrollSpeed()
        case ScrollEventType.TOP:
          return scroller.scrollToTop()
        case ScrollEventType.POSITION:
          if (!Number.isNaN(top)) {
            return scroller.scrollTo(top)
          }
      }
    },
    [scroller, isAdmin]
  )

  const followScroll = useCallback(() => {
    setScroll.call({
      type: ScrollEventType.POSITION,
      value: scrollContainerRef.current?.scrollTop
    })
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
      scroller.scrollToTop()
    }
  }, [currentSong])
}
