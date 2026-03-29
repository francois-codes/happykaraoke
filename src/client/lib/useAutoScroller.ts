'use client'
import { useScrollContext } from '@/contexts/scroll'
import { useStore } from '@/store'
import { scrollDiagnosticLog } from '@shared/lib/scrollDiagnosticLog'
import { useCallback, useEffect, useRef } from 'react'
import { getSectionIndexAtScrollTop, useSongSections } from './useSongSections'

const SPEED_INCREMENT = 12

export const useAutoScroller = () => {
  const { currentSong } = useStore()
  const scrollContainerRef = useScrollContext()
  const scrollSpeedRef = useRef(36)
  const scrollPosition = useRef(0)
  /** False as soon as stopScrolling runs — prevents scrollStep from queueing another frame after stop. */
  const autoScrollActiveRef = useRef(false)
  const animationFrameRef = useRef<Nullable<number>>(null)
  const sectionIndexRef = useRef(0)
  const lastStepAtRef = useRef<number>(0)
  const { resolveSections, getScrollTopForSectionStart } = useSongSections()
  const resolveSectionsRef = useRef(resolveSections)
  resolveSectionsRef.current = resolveSections

  const pageSize = useCallback(() => {
    if (scrollContainerRef.current) {
      return scrollContainerRef.current.clientHeight || window.innerHeight
    }

    return window.innerHeight
  }, [scrollContainerRef])

  const stopScrolling = useCallback(() => {
    autoScrollActiveRef.current = false
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    lastStepAtRef.current = 0
  }, [])

  const scrollStep = useCallback(
    (now: number) => {
      if (!autoScrollActiveRef.current || !scrollContainerRef.current) {
        animationFrameRef.current = null
        return
      }
      const previousStepAt = lastStepAtRef.current || now
      const dtMs = Math.min(80, Math.max(0, now - previousStepAt))
      lastStepAtRef.current = now
      const position = scrollPosition.current ?? scrollContainerRef.current.scrollTop ?? 0
      const top = position + scrollSpeedRef.current * (dtMs / 1000)

      if (top >= scrollContainerRef.current.scrollHeight - window.innerHeight - 200) {
        stopScrolling()
        return
      }

      const sections = resolveSectionsRef.current()
      const nextSection = sections[sectionIndexRef.current + 1]

      if (nextSection && top >= nextSection) {
        sectionIndexRef.current += 1
      }

      scrollPosition.current = top
      scrollContainerRef.current.scrollTop = top
      if (autoScrollActiveRef.current) {
        animationFrameRef.current = requestAnimationFrame(scrollStep)
      } else {
        animationFrameRef.current = null
      }
    },
    [stopScrolling]
  )

  const startScrolling = useCallback(() => {
    if (animationFrameRef.current !== null) return // prevent multiple animations

    autoScrollActiveRef.current = true
    lastStepAtRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(scrollStep)
  }, [scrollStep])

  const toggleScrolling = useCallback(() => {
    if (animationFrameRef.current !== null) {
      stopScrolling()
    } else {
      startScrolling()
    }
  }, [startScrolling, stopScrolling])

  const increaseScrollSpeed = (increment = SPEED_INCREMENT) => {
    scrollSpeedRef.current += increment
  }

  const decreaseScrollSpeed = (decrement = SPEED_INCREMENT) => {
    scrollSpeedRef.current = Math.max(scrollSpeedRef.current - decrement, 6)
  }

  const scrollTo = (top: number, behavior: 'instant' | 'smooth' = 'smooth') => {
    scrollPosition.current = top
    if (animationFrameRef.current !== null) {
      scrollContainerRef.current!.scrollTop = top
      // Avoid a large dt after remote snap — next scrollStep integrates from “now”.
      lastStepAtRef.current = performance.now()
    } else {
      scrollContainerRef.current?.scrollTo({
        top,
        behavior: behavior === 'smooth' ? 'smooth' : 'auto'
      })
    }
  }

  const scrollToTop = useCallback(() => {
    stopScrolling()
    scrollTo(0, 'instant')
    sectionIndexRef.current = 0
  }, [stopScrolling])

  const nextSection = useCallback(() => {
    const sections = resolveSections()
    const container = scrollContainerRef.current

    if (!container) {
      scrollDiagnosticLog.warn('nextSection: no scroll container', { category: 'scroll' })
      return
    }

    const scrollTopBefore = container.scrollTop

    if (!sections || sections.length === 0) {
      scrollDiagnosticLog.warn('nextSection: empty sections, using page fallback', {
        category: 'scroll',
        scrollTopBefore
      })
      const target = container.scrollTop + pageSize() * 0.8
      scrollTo(target, 'instant')
      return
    }

    const lastIndex = sections.length - 1
    const indexBefore = sectionIndexRef.current

    if (sectionIndexRef.current < 0 || sectionIndexRef.current > lastIndex) {
      scrollDiagnosticLog.warn('nextSection: section index out of range before clamp', {
        category: 'scroll',
        indexBefore,
        lastIndex
      })
    }

    if (sectionIndexRef.current < 0) {
      sectionIndexRef.current = 0
    } else if (sectionIndexRef.current > lastIndex) {
      sectionIndexRef.current = lastIndex
    }

    if (sectionIndexRef.current < lastIndex) {
      sectionIndexRef.current += 1
      const target = getScrollTopForSectionStart(sectionIndexRef.current, container)
      scrollTo(target, 'instant')
    } else {
      scrollDiagnosticLog.warn('nextSection: at last section', {
        category: 'scroll',
        sectionCount: sections.length,
        indexBefore,
        indexAfter: sectionIndexRef.current,
        scrollTopBefore,
        scrollTopAfter: container.scrollTop
      })
    }

    scrollDiagnosticLog.info('nextSection', {
      category: 'scroll',
      sectionCount: sections.length,
      indexBefore,
      indexAfter: sectionIndexRef.current,
      scrollTopBefore,
      scrollTopAfter: container.scrollTop,
      atLastSection: indexBefore >= lastIndex
    })
  }, [getScrollTopForSectionStart, pageSize, resolveSections, scrollContainerRef, scrollTo])

  const previousSection = useCallback(() => {
    const sections = resolveSections()
    const container = scrollContainerRef.current

    if (!container) {
      scrollDiagnosticLog.warn('previousSection: no scroll container', { category: 'scroll' })
      return
    }

    const scrollTopBefore = container.scrollTop

    if (!sections || sections.length === 0) {
      scrollDiagnosticLog.warn('previousSection: empty sections, using page fallback', {
        category: 'scroll',
        scrollTopBefore
      })
      const target = container.scrollTop - pageSize() * 0.8
      scrollTo(Math.max(0, target), 'instant')
      return
    }

    const lastIndex = sections.length - 1
    const indexBefore = sectionIndexRef.current

    if (sectionIndexRef.current < 0 || sectionIndexRef.current > lastIndex) {
      scrollDiagnosticLog.warn('previousSection: section index out of range before clamp', {
        category: 'scroll',
        indexBefore,
        lastIndex
      })
    }

    if (sectionIndexRef.current < 0) {
      sectionIndexRef.current = 0
    } else if (sectionIndexRef.current > lastIndex) {
      sectionIndexRef.current = lastIndex
    }
    // when going to the previous section,
    // if the current scroll is less than 5px of
    // the position of the current index,
    // we go to the previous (if it exists)
    // otherwise, we go to the top of the current section
    if (
      sections &&
      sections[sectionIndexRef.current] !== undefined &&
      container.scrollTop !== undefined
    ) {
      if (
        sectionIndexRef.current > 1 &&
        container.scrollTop <= sections[sectionIndexRef.current] + 30
      ) {
        sectionIndexRef.current -= 1
      }
      const target = getScrollTopForSectionStart(sectionIndexRef.current, container)
      scrollTo(target, 'instant')
    }

    scrollDiagnosticLog.info('previousSection', {
      category: 'scroll',
      sectionCount: sections.length,
      indexBefore,
      indexAfter: sectionIndexRef.current,
      scrollTopBefore,
      scrollTopAfter: container.scrollTop
    })
  }, [getScrollTopForSectionStart, pageSize, resolveSections, scrollContainerRef, scrollTo])

  useEffect(() => {
    if (animationFrameRef.current) {
      stopScrolling()
      startScrolling()
    }
  }, [startScrolling, stopScrolling])

  useEffect(() => {
    return () => stopScrolling() // cleanup on unmount
  }, [stopScrolling])

  useEffect(() => {
    sectionIndexRef.current = 0
  }, [currentSong])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) {
      return
    }

    const onScroll = () => {
      if (animationFrameRef.current !== null) {
        return
      }
      const sections = resolveSections()
      const top = container.scrollTop
      sectionIndexRef.current = getSectionIndexAtScrollTop(top, sections)
      scrollPosition.current = top
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [resolveSections, scrollContainerRef])

  return {
    toggleScrolling,
    startScrolling,
    stopScrolling,
    increaseScrollSpeed,
    decreaseScrollSpeed,
    setSpeed: (speedPxPerSecond: number) => {
      scrollSpeedRef.current = Math.max(6, speedPxPerSecond)
    },
    getSpeed: () => scrollSpeedRef.current,
    isRunning: () => animationFrameRef.current !== null,
    nextSection,
    previousSection,
    scrollToTop,
    scrollTo
  }
}
