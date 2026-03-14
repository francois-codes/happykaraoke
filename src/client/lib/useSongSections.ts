import { useStore } from '@/store';
import { useEffect, useRef } from 'react';

function findPreviousBlock(blocks: number[], scrollPosition: number) {
  let left = 0
  let right = blocks.length - 1
  let resultIndex = -1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if (blocks[mid] < scrollPosition) {
      resultIndex = mid
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return {
    value: resultIndex === -1 ? -1 : blocks[resultIndex],
    index: resultIndex
  }
}

export function useSongSections() {
  const sectionsRef = useRef<Nullable<number[]>>(null)
  const blocksRef = useRef<Nullable<number[]>>(null)

  const { currentSong } = useStore()

  function resolveSections() {
    const blocks = resolveBlocks()

    if (sectionsRef.current === null) {
      const headingNodes = Array.from(document.querySelectorAll('.song-section')).filter(
        (child): child is HTMLElement => child instanceof HTMLElement
      )

      if (headingNodes.length === 0) {
        const scrollContainer = document.getElementById('scroll-container')

        if (scrollContainer instanceof HTMLElement) {
          const { scrollHeight, clientHeight } = scrollContainer
          const maxScrollable = Math.max(0, scrollHeight - clientHeight)
          const pageSize = clientHeight > 0 ? clientHeight * 0.8 : window.innerHeight * 0.8
          const sections: number[] = []

          if (pageSize > 0) {
            for (let position = 0; position <= maxScrollable; position += pageSize) {
              sections.push(position)
            }
          }

          sectionsRef.current = sections.length > 0 ? sections : [0]
        } else {
          sectionsRef.current = [0]
        }
      } else {
        const sections = headingNodes.flatMap((child) => {
          const closestBlock = findPreviousBlock(blocks, child.offsetTop)

          if (closestBlock.index === -1) {
            return child.offsetTop
          }

          return closestBlock.value
        })

        sectionsRef.current = sections.length > 0 ? sections : [0]
      }
    }

    return sectionsRef.current ?? [0]
  }

  function resolveBlocks() {
    if (blocksRef.current === null) {
      blocksRef.current = Array.from(document.querySelectorAll('.block')).map(
        // @ts-expect-error wtf??
        (child) => child.offsetTop
      )
    }

    return blocksRef.current
  }

  function getClosestSection(scrollPosition: number) {
    const sections = resolveSections()
    if (!sections.length) {
      return 0
    }
    const closestIndex = sections.reduce((closest, current, index) => {
      const currentDiff = Math.abs(current - scrollPosition)
      const closestDiff = Math.abs(sections[closest] - scrollPosition)
      return currentDiff < closestDiff ? index : closest
    }, 0)

    return sections[closestIndex]
  }

  function findLastVisibleSection(scrollPosition: number) {
    const viewportBottom = scrollPosition + window.innerHeight - 200
    const sections = resolveSections()

    if (!sections.length) {
      return 0
    }

    // Filter sections that are above the bottom of the viewport
    const visibleSections = sections.filter((pos) => pos <= viewportBottom)

    // Return the last visible section position
    // If no sections are visible, return the first section position
    return visibleSections.length > 0 ? visibleSections[visibleSections.length - 1] : sections[0]
  }

  useEffect(() => {
    sectionsRef.current = null
  }, [currentSong])

  return { resolveSections, findLastVisibleSection, getClosestSection }
}
