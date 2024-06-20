'use client'
import { useScrollContext } from '@/contexts/scroll'
import { useStore } from '@/store'
import { useRef, useCallback, useEffect } from 'react'

export const useAutoScroller = () => {
  const { currentSong } = useStore()
  const scrollContainerRef = useScrollContext()
  const scrollSpeedRef = useRef(0.1)
  const scrollPosition = useRef(0)
  const animationFrameRef = useRef<Nullable<number>>(null)
  const sectionsRef = useRef<Nullable<number[]>>(null)
  const sectionIndexRef = useRef(0)

  const scrollStep = useCallback(() => {
    if (scrollContainerRef.current) {
      const position = scrollPosition.current ?? scrollContainerRef.current.scrollTop ?? 0
      const top = position + (scrollSpeedRef.current ?? 0.1)
      if (top >= scrollContainerRef.current.scrollHeight - window.innerHeight - 200) {
        stopScrolling()
        return
      }

      const nextSection = resolveSections()[sectionIndexRef.current + 1]

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

  const increaseScrollSpeed = (increment = 0.2) => {
    scrollSpeedRef.current += increment
  }

  const decreaseScrollSpeed = (decrement = 0.2) => {
    scrollSpeedRef.current = Math.max(scrollSpeedRef.current - decrement, 0.1) // Ensures speed doesn't go below 1
  }

  const scrollTo = (top: number) => {
    scrollPosition.current = top
    if (animationFrameRef.current) {
      scrollContainerRef.current!.scrollTop = top
    } else {
      scrollContainerRef.current?.scrollTo({ top, behavior: 'smooth' })
    }
  }

  const scrollToTop = useCallback(() => {
    stopScrolling()
    scrollTo(0)
    sectionIndexRef.current = 0
    if (animationFrameRef.current) startScrolling()
  }, [startScrolling, stopScrolling])

  function resolveSections() {
    if (!sectionsRef.current?.length) {
      const sections = Array.from(document.querySelectorAll('.song-section')).map(
        // @ts-expect-error wtf??
        (child) => child.offsetTop
      )
      sectionsRef.current = sections
    }

    return sectionsRef.current
  }

  const nextSection = useCallback(() => {
    const sections = resolveSections()
    if (sections && sectionIndexRef.current < sections.length - 1) {
      sectionIndexRef.current += 1
      if (sections?.[sectionIndexRef.current]) {
        scrollTo(sections[sectionIndexRef.current])
      }
    }
  }, [])

  const previousSection = useCallback(() => {
    const sections = resolveSections()
    if (sections && sectionIndexRef.current > 0) {
      sectionIndexRef.current -= 1
      if (sectionIndexRef.current >= 0 && sections?.[sectionIndexRef.current] !== undefined) {
        scrollTo(sections[sectionIndexRef.current])
      }
    }
  }, [])

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
