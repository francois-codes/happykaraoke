import { KEYS } from '@/lib/consts'
import { useAutoScroller } from '@/lib/useAutoScroller'
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { useDispatch, useStore } from '@/store'
import { setScroll } from '@shared/endpoints/scroll'
import { scrollDiagnosticLog } from '@shared/lib/scrollDiagnosticLog'
import { ScrollEventType } from '@shared/types/scroll'

/**
 * Scroll master applies keyboard-driven scroll locally and broadcasts; other admins only broadcast
 * and rely on `scroll:changed` so the master (who ignores echoes) stays in sync and we avoid
 * double-applying TOGGLE when `scrollMaster` is false on the driver.
 */
function emitSetScroll(payload: { type: ScrollEventType; value?: number }) {
  void setScroll.call(payload).catch((e: unknown) => {
    scrollDiagnosticLog.error('setScroll failed', {
      category: 'scroll',
      type: payload.type,
      message: e instanceof Error ? e.message : String(e)
    })
  })
}

export function useSongKeyboardShortcuts({
  scroller,
  reload
}: {
  scroller: ReturnType<typeof useAutoScroller>
  reload: () => void
}) {
  const {
    isAdmin,
    scrollMaster,
    searchOpen,
    transpoOpen,
    chordsEnabled,
    aiSearchOpen,
    aiPreviewOpen,
    openAIKeyModalOpen
  } = useStore()
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
        if (scrollMaster === true) {
          scroller.toggleScrolling()
        }

        emitSetScroll({
          type: ScrollEventType.TOGGLE
        })
      }
    },
    [scroller, isAdmin, scrollMaster, searchOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  // right => increase scroll speed (admin only)
  useKeyboardShortcut(
    {
      key: KEYS.right,
      disable: () => !isAdmin || searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      preventDefault: true,
      handler: () => {
        if (scrollMaster === true) {
          scroller.increaseScrollSpeed()
        }
        emitSetScroll({ type: ScrollEventType.FASTER })
      }
    },
    [scroller, isAdmin, scrollMaster, searchOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  // left => decrease scroll speed (admin only)
  useKeyboardShortcut(
    {
      key: KEYS.left,
      disable: () => !isAdmin || searchOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      preventDefault: true,
      handler: () => {
        if (scrollMaster === true) {
          scroller.decreaseScrollSpeed()
        }
        emitSetScroll({ type: ScrollEventType.SLOWER })
      }
    },
    [scroller, isAdmin, scrollMaster, searchOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
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
        if (scrollMaster === true) {
          scroller.stopScrolling()
          scroller.scrollToTop()
        }
        emitSetScroll({ type: ScrollEventType.TOP })
      }
    },
    [scroller, isAdmin, scrollMaster, searchOpen, transpoOpen, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  // down => scroll to next section (admin only)
  useKeyboardShortcut(
    {
      key: [KEYS.down],
      preventDefault: true,
      disable: () => !isAdmin || searchOpen || transpoOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      handler: () => {
        if (scrollMaster === true) {
          scroller.nextSection()
        }
        emitSetScroll({ type: ScrollEventType.NEXT_SECTION })
      }
    },
    [isAdmin, transpoOpen, searchOpen, scroller, scrollMaster, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
  )

  // up => scroll to previous section (admin only)
  useKeyboardShortcut(
    {
      key: [KEYS.up],
      preventDefault: true,
      disable: () => !isAdmin || searchOpen || transpoOpen || aiSearchOpen || aiPreviewOpen || openAIKeyModalOpen,
      handler: () => {
        if (scrollMaster === true) {
          scroller.previousSection()
        }
        emitSetScroll({ type: ScrollEventType.PREVIOUS_SECTION })
      }
    },
    [isAdmin, transpoOpen, searchOpen, scroller, scrollMaster, aiSearchOpen, aiPreviewOpen, openAIKeyModalOpen]
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
