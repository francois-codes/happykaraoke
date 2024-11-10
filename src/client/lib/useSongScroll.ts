import { useScrollContext } from '@/contexts/scroll'
import { useAutoScroller } from '@/lib/useAutoScroller'
import { useStore } from '@/store'
import { socket } from '@/utils/socket'
import { setScroll } from '@shared/endpoints/scroll'
import { scrollChanged } from '@shared/messages/scroll'
import { ScrollEventType } from '@shared/types/scroll'
import { useCallback, useEffect, useRef } from 'react'
import { useSongSections } from './useSongSections'

const getLineHeight = () => {
  const { innerHeight, innerWidth } = window
  return Math.min(innerHeight, innerWidth)
}

export function useSongScroll(scroller: ReturnType<typeof useAutoScroller>) {
  const { isAdmin, currentSong, musicienScroll } = useStore()
  const scrollContainerRef = useScrollContext()
  const targetLineRef = useRef<HTMLDivElement | null>(null)
  const HEADER_HEIGHT = 68

  const currentScrollRef = useRef<number | null>(0)
  const { resolveSections } = useSongSections()

  scrollChanged.client.useMessage(
    socket,
    ({ type, value }) => {
      if (isAdmin) {
        return
      }

      const top = Number(value)
      const scrollTarget = top * getLineHeight()

      if (targetLineRef.current && type === ScrollEventType.POSITION) {
        const scrollContainer = scrollContainerRef.current
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect()
          const relativePosition = scrollTarget - scrollContainer.scrollTop
          targetLineRef.current.style.top = `${containerRect.top + relativePosition + HEADER_HEIGHT}px`
        }
      }

      switch (type) {
        case ScrollEventType.START:
          return scroller.startScrolling()
        case ScrollEventType.STOP:
          return scroller.stopScrolling()
        case ScrollEventType.TOGGLE:
          if (musicienScroll) return
          return scroller.toggleScrolling()
        case ScrollEventType.FASTER:
          return scroller.increaseScrollSpeed()
        case ScrollEventType.SLOWER:
          return scroller.decreaseScrollSpeed()
        case ScrollEventType.TOP:
          currentScrollRef.current = 0
          return scroller.scrollToTop()
        case ScrollEventType.POSITION: {
          if (musicienScroll) {
            const currentScroll = currentScrollRef.current ?? 0
            const threshold = (window.innerHeight * 0.40) - HEADER_HEIGHT
            
            // For forward scrolling, use section-based approach
            if (scrollTarget > currentScroll &&  scrollTarget - currentScroll > threshold) {
              const sections = resolveSections() ?? []
              const targetSection = sections.find((section, index) => {
                const nextSection = sections[index + 1] ?? Infinity
                return scrollTarget >= section && scrollTarget < nextSection
              }) ?? sections[0]

              currentScrollRef.current = targetSection
              scroller.scrollTo(targetSection)
              return 
            }

            if (scrollTarget > currentScroll) return
          }

          currentScrollRef.current = scrollTarget

          if (!Number.isNaN(top)) {
            return scroller.scrollTo(scrollTarget)
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

  useEffect(() => {
    if (!musicienScroll) return

    // Create and style the target line
    const targetLine = document.createElement('div')
    targetLine.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      height: 1px;
      border-top: 1px dashed red;
      pointer-events: none;
      z-index: 1000;
    `
    document.body.appendChild(targetLine)
    targetLineRef.current = targetLine

    // Cleanup
    return () => {
      targetLine.remove()
      targetLineRef.current = null
    }
  }, [musicienScroll])
}
