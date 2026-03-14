'use client'
import { useScrollContext } from '@/contexts/scroll'
import { useStore } from '@/store'
import { useCallback, useEffect, useRef } from 'react'
import { useSongSections } from './useSongSections'

const SCROLL_INCREMENT = 0.1

export const useAutoScroller = () => {
  const { currentSong } = useStore()
  const scrollContainerRef = useScrollContext()
  const scrollSpeedRef = useRef(0.05)
  const scrollPosition = useRef(0)
  const animationFrameRef = useRef<Nullable<number>>(null)
  const sectionsRef = useRef<Nullable<number[]>>(null)
  const sectionIndexRef = useRef(0)
  const { resolveSections } = useSongSections()
  const pageSize = useCallback(() => {
    if (scrollContainerRef.current) {
      return scrollContainerRef.current.clientHeight || window.innerHeight
    }

    return window.innerHeight
  }, [scrollContainerRef])

  const scrollStep = useCallback(() => {
    if (scrollContainerRef.current) {
      const position = scrollPosition.current ?? scrollContainerRef.current.scrollTop ?? 0
      const top = position + (scrollSpeedRef.current ?? 0.1)

      if (top >= scrollContainerRef.current.scrollHeight - window.innerHeight - 200) {
        stopScrolling()
        return
      }

      const sections = resolveSections()
      const nextSection = sections[sectionIndexRef.current + 1]

      if (nextSection && top >= nextSection) {
        sectionIndexRef.current += 1
      }

      scrollPosition.current = top
      scrollContainerRef.current!.scrollTop = top
      animationFrameRef.current = requestAnimationFrame(scrollStep)
    }
  }, [])

  const startScrolling = useCallback(() => {
    if (animationFrameRef.current) return // prevent multiple animations

    animationFrameRef.current = requestAnimationFrame(scrollStep)
  }, [scrollStep])

  const stopScrolling = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const toggleScrolling = useCallback(() => {
    if (animationFrameRef.current) {
      stopScrolling()
    } else {
      startScrolling()
    }
  }, [])

  const increaseScrollSpeed = (increment = SCROLL_INCREMENT) => {
    scrollSpeedRef.current += increment
  }

  const decreaseScrollSpeed = (decrement = SCROLL_INCREMENT) => {
    scrollSpeedRef.current = Math.max(scrollSpeedRef.current - decrement, 0.1) // Ensures speed doesn't go below 1
  }

  const scrollTo = (top: number, behavior: 'instant' | 'smooth' = 'smooth') => {
    scrollPosition.current = top
    if (animationFrameRef.current) {
      scrollContainerRef.current!.scrollTop = top
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
    if (animationFrameRef.current) startScrolling()
  }, [startScrolling, stopScrolling])

  const nextSection = useCallback(() => {
    const sections = resolveSections()
    const container = scrollContainerRef.current

    if (!container) {
      return
    }

    if (!sections || sections.length === 0) {
      const target = container.scrollTop + pageSize() * 0.8
      scrollTo(target, 'instant')
      return
    }

    const lastIndex = sections.length - 1

    if (sectionIndexRef.current < 0) {
      sectionIndexRef.current = 0
    } else if (sectionIndexRef.current > lastIndex) {
      sectionIndexRef.current = lastIndex
    }

    if (sectionIndexRef.current < lastIndex) {
      sectionIndexRef.current += 1
      const next = sections[sectionIndexRef.current]
      scrollTo(next ?? 0, 'instant')
    }
  }, [pageSize, resolveSections, scrollContainerRef, scrollTo])

  const previousSection = useCallback(() => {
    const sections = resolveSections()
    const container = scrollContainerRef.current

    if (!container) {
      return
    }

    if (!sections || sections.length === 0) {
      const target = container.scrollTop - pageSize() * 0.8
      scrollTo(Math.max(0, target), 'instant')
      return
    }

    const lastIndex = sections.length - 1

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
        sectionIndexRef.current > 0 &&
        container.scrollTop <= sections[sectionIndexRef.current] + 30
      ) {
        sectionIndexRef.current -= 1
      }
      scrollTo(sections[sectionIndexRef.current] ?? 0, 'instant')
    }
  }, [pageSize, resolveSections, scrollContainerRef, scrollTo])

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
    sectionsRef.current = null
    sectionIndexRef.current = 0
  }, [currentSong])

  return {
    toggleScrolling,
    startScrolling,
    stopScrolling,
    increaseScrollSpeed,
    decreaseScrollSpeed,
    nextSection,
    previousSection,
    scrollToTop,
    scrollTo
  }
}
