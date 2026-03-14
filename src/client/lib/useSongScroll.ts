import { useScrollContext } from '@/contexts/scroll'
import { useAutoScroller } from '@/lib/useAutoScroller'
import { useStore } from '@/store'
import { socket } from '@/utils/socket'
import { sessionLogger } from '@shared/lib/sessionLogger'
import { setScroll } from '@shared/endpoints/scroll'
import { scrollChanged } from '@shared/messages/scroll'
import { ScrollEventType } from '@shared/types/scroll'
import { useCallback, useEffect, useRef } from 'react'
import { useSongSections } from './useSongSections'

export function useSongScroll(scroller: ReturnType<typeof useAutoScroller>) {
  const { scrollMaster, currentSong, musicienScroll } = useStore()
  const scrollContainerRef = useScrollContext()
  const targetLineRef = useRef<HTMLDivElement | null>(null)

  const currentScrollRef = useRef<number | null>(0)
  const lastEmitRef = useRef<number>(0)
  const { resolveSections } = useSongSections()

  scrollChanged.client.useMessage(
    socket,
    ({ type, value }) => {
      if (scrollMaster) {
        sessionLogger.info('scroll:changed ignored on scroll master', { value })
        return
      }

      const fraction = Number(value)
      if (Number.isNaN(fraction)) {
        return
      }

      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) {
        return
      }

      const maxScrollable = Math.max(
        1,
        scrollContainer.scrollHeight - scrollContainer.clientHeight
      )
      const scrollTarget = fraction * maxScrollable

      if (
        targetLineRef.current &&
        type === ScrollEventType.POSITION &&
        currentScrollRef.current !== null
      ) {
        const containerRect = scrollContainer.getBoundingClientRect()
        const linePosition = containerRect.top + scrollTarget - currentScrollRef.current
        targetLineRef.current.style.top = `${linePosition}px`
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
        case ScrollEventType.NEXT_SECTION:
          return scroller.nextSection()
        case ScrollEventType.PREVIOUS_SECTION:
          return scroller.previousSection()
        case ScrollEventType.POSITION: {
          if (musicienScroll) {
            scroller.stopScrolling()
            const currentScroll = currentScrollRef.current ?? 0
            const threshold = window.innerHeight * 0.35

            // For forward scrolling, use section-based approach
            if (scrollTarget > currentScroll && scrollTarget - currentScroll > threshold) {
              const sections = resolveSections() ?? []
              const targetSection =
                sections.find((section, index) => {
                  const nextSection = sections[index + 1] ?? Infinity
                  return scrollTarget >= section && scrollTarget < nextSection
                }) ?? sections[0]

              if (typeof targetSection === 'number' && !Number.isNaN(targetSection)) {
                currentScrollRef.current = targetSection
                scroller.scrollTo(targetSection, 'instant')
                return
              }
            }

            if (scrollTarget > currentScroll) return
          }

          currentScrollRef.current = scrollTarget
          return scroller.scrollTo(scrollTarget, 'instant')
        }
      }
    },
    [scroller, scrollMaster, musicienScroll]
  )

  const emitScrollPosition = useCallback(() => {
    const scrollContainer = scrollContainerRef.current

    if (!scrollContainer) {
      return
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer
    const maxScrollable = Math.max(1, scrollHeight - clientHeight)
    const fraction = Math.min(1, Math.max(0, scrollTop / maxScrollable))

    const now = performance.now()
    if (now - lastEmitRef.current < 70) {
      return
    }

    lastEmitRef.current = now

    sessionLogger.info('scroll:position:emit', {
      fraction
    })

    setScroll.call({
      type: ScrollEventType.POSITION,
      value: fraction
    })
  }, [scrollContainerRef])

  useEffect(() => {
    if (!scrollMaster) return
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    let frameId: number | null = null

    const handleScroll = () => {
      if (frameId !== null) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        emitScrollPosition()
      })
    }

    scrollContainer.addEventListener('scroll', handleScroll)

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [emitScrollPosition, scrollMaster])

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
