'use client'
import { useState, useRef, useEffect } from 'react'

export const useAutoScroller = () => {
  const [scrolling, setScrolling] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(1) // Default speed, you can adjust as needed
  const scrollRef = useRef<Nullable<NodeJS.Timeout>>(null)

  const element = document.getElementById('scroll-container')

  useEffect(() => {
    if (scrolling) {
      scrollRef.current = setInterval(() => {
        const scroll = element?.scrollTop ?? 0
        element?.scrollTo({ top: scroll + scrollSpeed, behavior: 'smooth' })
      }, 100) // Scroll every 100ms, adjust as needed

      return () => clearInterval(scrollRef.current!)
    }
  }, [scrolling, scrollSpeed])

  const startScrolling = (speed = scrollSpeed) => {
    setScrollSpeed(speed++)
    setScrolling(true)
  }

  const stopScrolling = () => {
    setScrolling(false)
    if (scrollRef.current) {
      clearInterval(scrollRef.current)
    }
  }

  const increaseScrollSpeed = (increment = 1) => {
    setScrollSpeed((prevSpeed) => prevSpeed + increment)
  }

  const decreaseScrollSpeed = (decrement = 1) => {
    setScrollSpeed((prevSpeed) => Math.max(prevSpeed - decrement, 1)) // Ensures speed doesn't go below 1
  }

  const scrollTo = (top: number) => {
    element?.scrollTo({ top, behavior: 'smooth' })
  }

  const scrollToTop = () => {
    scrollTo(0)
  }

  return {
    startScrolling,
    stopScrolling,
    increaseScrollSpeed,
    decreaseScrollSpeed,
    scrollSpeed,
    scrollToTop,
    scrollTo,
    element
  }
}
