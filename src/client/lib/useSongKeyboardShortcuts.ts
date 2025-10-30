import { KEYS } from '@/lib/consts'
import { useAutoScroller } from '@/lib/useAutoScroller'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { useDispatch, useStore } from '@/store'
import { setScroll } from '@shared/endpoints/scroll'
import { ScrollEventType } from '@shared/types/scroll'

export function useSongKeyboardShortcuts({
  scroller,
  reload
}: {
  scroller: ReturnType<typeof useAutoScroller>
  reload: () => void
}) {
  const { isAdmin, searchOpen, transpoOpen, chordsEnabled, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen } = useStore()
  const dispatch = useDispatch()

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
        return !isAdmin || searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen
      },
      handler: () => {
        dispatch({ transpoOpen: true })
      }
    },
    [isAdmin, searchOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  // space => start/stop scrolling (admin only)
  useKeyboardShortcut(
    {
      key: [KEYS.Space],
      preventDefault: true,
      disable: () => {
        return !isAdmin || searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen
      },
      handler: () => {
        scroller.toggleScrolling()

        setScroll.call({
          type: ScrollEventType.TOGGLE
        })
      }
    },
    [scroller, isAdmin, searchOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  // right => increase scroll speed (admin only)
  useKeyboardShortcut(
    {
      key: KEYS.right,
      disable: () => !isAdmin || searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      preventDefault: true,
      handler: () => {
        scroller.increaseScrollSpeed()
        setScroll.call({ type: ScrollEventType.FASTER })
      }
    },
    [scroller, isAdmin, searchOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  // left => decrease scroll speed (admin only)
  useKeyboardShortcut(
    {
      key: KEYS.left,
      disable: () => !isAdmin || searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      preventDefault: true,
      handler: () => {
        scroller.decreaseScrollSpeed()
        setScroll.call({ type: ScrollEventType.SLOWER })
      }
    },
    [scroller, isAdmin, searchOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  // $ => scroll to top (admin only)
  useKeyboardShortcut(
    {
      key: KEYS.dollarSign,
      disable: () => {
        return !isAdmin || searchOpen || transpoOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen
      },
      handler: (event) => {
        event.preventDefault()
        scroller.stopScrolling()

        scroller.scrollToTop()
        setScroll.call({ type: ScrollEventType.TOP })
      }
    },
    [scroller, isAdmin, searchOpen, transpoOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  // down => scroll to next section (admin only)
  useKeyboardShortcut(
    {
      key: [KEYS.down],
      preventDefault: true,
      disable: () => !isAdmin || searchOpen || transpoOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      handler: () => {
        scroller.nextSection()
      }
    },
    [isAdmin, transpoOpen, searchOpen, scroller, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  // up => scroll to previous section (admin only)
  useKeyboardShortcut(
    {
      key: [KEYS.up],
      preventDefault: true,
      disable: () => !isAdmin || searchOpen || transpoOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      handler: () => {
        scroller.previousSection()
      }
    },
    [isAdmin, transpoOpen, searchOpen, scroller, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  // c => toggle chords
  useKeyboardShortcut(
    {
      key: [KEYS.a],
      disable: () => searchOpen || transpoOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      handler: () => {
        dispatch({ chordsEnabled: !chordsEnabled })
      }
    },
    [searchOpen, transpoOpen, chordsEnabled, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )
}
