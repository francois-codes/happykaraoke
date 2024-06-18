import { useDispatch, useStore } from '@/store'
import { ScrollEventType } from '@shared/types/scroll'
import { useAutoScroller } from '@/lib/useAutoScroller'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { KEYS } from '@/lib/consts'
import { setScroll } from '@shared/endpoints/scroll'
import { Dispatch, SetStateAction } from 'react'

export function useSongKeyboardShortcuts({
  scrolling,
  setScrolling,
  reload
}: {
  scrolling: boolean
  setScrolling: Dispatch<SetStateAction<boolean>>
  reload: () => void
}) {
  const { isAdmin, searchOpen, transpoOpen, chordsEnabled } = useStore()
  const dispatch = useDispatch()
  const scroller = useAutoScroller()

  function scrollToSection(
    findOffset: (offset: number, sectionsOffsets: number[]) => number | undefined
  ) {
    const offset = scroller.element?.scrollTop
    const sectionsOffsets: number[] = Array.from(document.querySelectorAll('.song-section')).map(
      // @ts-expect-error wtf??
      (node) => node.offsetTop
    )

    if (typeof offset === 'undefined' || offset === null || !sectionsOffsets) return

    const scrollPosition = findOffset(offset, sectionsOffsets)
    if (scrollPosition) {
      scroller.scrollTo(scrollPosition)
      setScroll.call({ type: ScrollEventType.POSITION, value: scrollPosition })
    }
  }

  // cmd + ctrl + r => reload song
  useKeyboardShortcut(
    {
      key: [KEYS.r],
      modifier: [KEYS.Meta, KEYS.Ctrl],
      preventDefault: true,
      handler: () => {
        reload()
      }
    },
    [reload]
  )

  // t => open transpo (admin only)
  useKeyboardShortcut(
    {
      key: [KEYS.t],
      preventDefault: true,
      disable: () => {
        return !isAdmin || searchOpen
      },
      handler: () => {
        dispatch({ transpoOpen: true })
      }
    },
    [isAdmin, searchOpen]
  )

  // space => start/stop scrolling (admin only)
  useKeyboardShortcut(
    {
      key: [KEYS.Space],
      preventDefault: true,
      disable: () => {
        return !isAdmin || searchOpen
      },
      handler: (e) => {
        e.preventDefault()
        const action = scrolling ? scroller.stopScrolling : scroller.startScrolling
        action()

        setScrolling(!scrolling)
        setScroll.call({
          type: scrolling ? ScrollEventType.STOP : ScrollEventType.START
        })
      }
    },
    [scrolling, scroller, isAdmin, searchOpen]
  )

  // up => increase scroll speed (admin only)
  useKeyboardShortcut(
    {
      key: KEYS.up,
      disable: () => !isAdmin,
      preventDefault: true,
      handler: () => {
        scroller.increaseScrollSpeed()
        setScroll.call({ type: ScrollEventType.FASTER })
      }
    },
    [scroller, isAdmin]
  )

  // down => decrease scroll speed (admin only)
  useKeyboardShortcut(
    {
      key: KEYS.down,
      disable: () => !isAdmin,
      preventDefault: true,
      handler: () => {
        scroller.decreaseScrollSpeed()
        setScroll.call({ type: ScrollEventType.SLOWER })
      }
    },
    [scroller, isAdmin]
  )

  // $ => scroll to top (admin only)
  useKeyboardShortcut(
    {
      key: KEYS.dollarSign,
      disable: () => {
        return !isAdmin || searchOpen || transpoOpen
      },
      handler: (event) => {
        event.preventDefault()
        scroller.stopScrolling()
        setScrolling(false)

        scroller.scrollToTop()
        setScroll.call({ type: ScrollEventType.TOP })
      }
    },
    [scroller, isAdmin, searchOpen, transpoOpen]
  )

  // right => scroll to next section (admin only)
  useKeyboardShortcut(
    {
      key: [KEYS.right],
      disable: () => !isAdmin || searchOpen || transpoOpen || scrolling,
      handler: () => {
        scrollToSection((offset, sectionsOffsets) =>
          sectionsOffsets.find((nodeOffset) => nodeOffset > offset)
        )
      }
    },
    [isAdmin, transpoOpen, searchOpen, scroller, scrolling]
  )

  // left => scroll to previous section (admin only)
  useKeyboardShortcut(
    {
      key: [KEYS.left],
      disable: () => !isAdmin || searchOpen || transpoOpen || scrolling,
      handler: () => {
        scrollToSection((offset, sectionsOffsets) =>
          sectionsOffsets.findLast((nodeOffset) => nodeOffset < offset)
        )
      }
    },
    [isAdmin, transpoOpen, searchOpen, scroller, scrolling]
  )

  // c => toggle chords
  useKeyboardShortcut(
    {
      key: [KEYS.a],
      disable: () => searchOpen || transpoOpen,
      handler: () => {
        dispatch({ chordsEnabled: !chordsEnabled })
      }
    },
    [searchOpen, transpoOpen, chordsEnabled]
  )
}
