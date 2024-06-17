import { useAutoScroller } from '@/lib/useAutoScroller'
import { useStore } from '@/store'
import { socket } from '@/utils/socket'
import { setScroll } from '@shared/endpoints/scroll'
import { scrollChanged } from '@shared/messages/scroll'
import { ScrollEventType } from '@shared/types/scroll'
import { useCallback, useEffect, useState } from 'react'

export function useSongScroll() {
  const { isAdmin } = useStore()
  const [scrolling, setScrolling] = useState(false)

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

  return { scrolling, setScrolling }
}
